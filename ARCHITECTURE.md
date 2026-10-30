# Arquitetura

Este documento explica como o app é organizado e por quê: contratos, sessão, carrinho, cache, tempo real, mocks, acessibilidade, performance, decisões de UX e desvios do Figma. Para rodar o projeto, veja o [README](README.md).

## Visão geral

```
 Interface (React + shadcn/ui)
   │  rotas e search params ─────────────── TanStack Router
   │  consultas, mutations, cache ───────── TanStack Query
   ▼
 services/http (Axios + validação Zod) ──── HTTP ────┐
 services/realtime (socket.io-client) ───── WebSocket ┤
                                                      ▼
                                   MSW (no navegador) │ handlers REST + servidor Socket.IO simulado
                                                      ▼
                                   mocks/db: estado único (catálogo, contas, carrinhos, pedidos)
```

- **Contratos Zod como fonte única dos tipos** (`src/contracts`). O app valida toda resposta contra o schema (`request(schema, config)`), e os mocks usam os mesmos schemas e endpoints. Uma mudança de contrato quebra a compilação dos dois lados.
- **A interface nunca vê Axios nem dados fictícios.** Componentes e hooks só conversam com `features/*/api.ts`, que chama `services/http`. As respostas simuladas existem apenas na camada de rede (MSW).
- **Rotas finas.** `src/routes` só declara a rota, os search params e a proteção; a lógica fica em `src/features/<domínio>`.

| Pasta | Responsabilidade |
|---|---|
| `src/contracts` | Schemas (requisição, resposta, erros, eventos) e `endpoints` com `buildPath`. |
| `src/services/http` | Cliente Axios, token de sessão, `HttpError` (erro único do transporte), detecção de mocks inativos. |
| `src/services/session` | Store da sessão (fora do React, lido pelo Axios e pelo socket; dentro dele via `useSyncExternalStore`). |
| `src/services/realtime` | Conexão Socket.IO e aplicação dos eventos ao cache. |
| `src/app` | `QueryClient`, router e o ciclo de vida da sessão (troca de usuário ⇒ limpa cache e reconecta o socket). |
| `src/features` | `auth`, `catalog`, `nft`, `favorites`, `cart`, `checkout`, `orders`, `profile`, `wallets`. |
| `src/mocks` | `db` (estado e regras), `fixtures`, `scenarios`, `handlers` (REST), `realtime` (Socket.IO), `control` (console e testes). |

## Contratos REST

Base: `VITE_API_URL` (padrão `/api`). Corpo e resposta em JSON. Valores em ETH trafegam como **string decimal**, nunca como `number`, e os cálculos usam big.js. Quantidades são inteiras.

| Recurso | Endpoint | Observações |
|---|---|---|
| Sessão | `POST /auth/register`, `POST /auth/login`, `GET /auth/session`, `POST /auth/logout` | Login e cadastro devolvem `{ token, expiresAt, user }`. |
| NFTs | `GET /nfts?q&segment&categories&networks&minPrice&maxPrice&sort&page&pageSize` | Lista paginada com `facets` (contagens por filtro e faixa de preço). |
| | `GET /nfts/:nftId` | Detalhe com edições, disponibilidade e `version`. |
| Favoritos | `GET /favorites`, `PUT /favorites/:nftId`, `DELETE /favorites/:nftId` | Devolve a lista atualizada. |
| Carrinho | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/:itemId`, `DELETE /cart/items/:itemId` | Carrinho da conta, com preços calculados pela API. |
| | `POST /cart/merge` | Soma o carrinho do visitante ao da conta, no login. |
| | `POST /cart/preview` | Resolve o carrinho do visitante (preços, edições) sem persistir. |
| Cotação | `POST /quote` | Recebe os itens, o cupom e a rede. Devolve subtotal, desconto, taxa, total, `issues` e `expiresAt`. |
| Pedidos | `POST /orders` + `Idempotency-Key` | Cria a partir de uma cotação. |
| | `GET /orders/:orderId` | Estado e recibo (snapshot). |
| Perfil | `GET/PATCH /profile`, `POST/DELETE /profile/avatar`, `POST /profile/password` | O avatar é enviado como multipart. |
| Carteiras | `GET /wallets`, `PUT /wallets/:slot` | Slots `primary` e `secondary`. |
| | `POST /wallets/:slot/connect` | Conexão simulada da carteira cadastrada. |

**Erros** seguem um formato único, `{ code, message, fieldErrors? }`:

| Código | HTTP | Quando |
|---|---|---|
| `VALIDATION` | 422 | Campos inválidos; `fieldErrors` aparece em cada campo do formulário. |
| `UNAUTHORIZED` / `SESSION_EXPIRED` | 401 | Sem sessão ou token expirado. |
| `FORBIDDEN` | 403 | Recurso de outro usuário (ex.: pedido). |
| `NOT_FOUND` | 404 | NFT ou pedido inexistente. |
| `CONFLICT` | 409 | Cadastro duplicado, ou chave de idempotência reutilizada com outro conteúdo. |
| `OUT_OF_STOCK` | 409 | Quantidade acima do disponível. |
| `QUOTE_STALE` | 409 | Cotação vencida ou diferente do catálogo atual. |
| `WALLET_REJECTED` | 409 | A carteira recusou a conexão. |
| `UNAVAILABLE` | 503 | Falha transitória; pode repetir. |

No cliente, `HttpError` acrescenta os códigos `NETWORK`, `TIMEOUT` (10 s), `CANCELED` e `MOCKS_OFFLINE` (resposta que não veio do MSW; veja [Solução de problemas](README.md#solução-de-problemas)).

**Idempotência dos pedidos:** `POST /orders` exige `Idempotency-Key`. O cliente gera uma chave por cotação e a guarda no `sessionStorage`. Clique repetido, timeout ou refresh reenviam a mesma chave, e a API devolve o pedido já criado. A mesma chave com outro conteúdo recebe `CONFLICT`.

**Adições ao contrato feitas durante a implementação:** `QuoteRequest.network` e `previousQuoteId` (para apontar `PRICE_CHANGED` em relação à última cotação vista), `Quote.network`, `POST /cart/preview`, `MAX_QUANTITY_PER_ITEM = 10`, `POST /wallets/:slot/connect` e o código `WALLET_REJECTED`.

## Eventos Socket.IO

Todo evento usa o mesmo envelope:

```ts
{ id, type, resource: { type, id }, version, userId, occurredAt, data }
```

| Evento | Recurso | `data` | Quem recebe |
|---|---|---|---|
| `nft.updated` | `nft` | `price`, `previousPrice`, `editions[{ id, available }]` | Todas as conexões (`userId: null`). |
| `order.updated` | `order` | `status`, `transaction`, `failureReason` | Só as conexões do dono do pedido. |

- **`id`** identifica o evento: duplicatas são descartadas.
- **`version`** é a mesma do recurso na API REST: eventos com versão igual ou menor que a já aplicada são ignorados.
- **`userId`**: um evento privado de outro usuário é descartado no cliente. Na simulação, ele nem chega a ser enviado.

## Sessão

- O token e o usuário ficam no `localStorage` (`kurio:session`) para sobreviver ao refresh. Na inicialização, a sessão é confirmada com `GET /auth/session`.
- Duração: 30 minutos (20 s no cenário `session-expiry`). Qualquer 401 encerra a sessão local e mostra um aviso com o botão **Entrar**, que leva ao login com `?redirect=` e volta à mesma tela.
- **Expiração no checkout:** o formulário de pagamento é salvo como rascunho no `sessionStorage` (`kurio:checkout-draft`). Depois do novo login, o usuário volta ao pagamento com os campos preenchidos.
- **Logout ou troca de usuário:** remove do cache todas as consultas privadas (`['private', userId]`) e as cotações, e reconecta o socket com o novo token. Assim, os eventos e os dados da sessão anterior não alcançam o novo usuário.
- Rotas privadas (`/perfil`, `/carteiras`, `/pagamento`, `/pedidos/:id`) ficam sob o layout `_auth`, que redireciona ao login preservando o destino. `safeRedirect` só aceita caminhos internos.

## Carrinho

- **Visitante:** os itens (`nftId`, `editionId`, `quantity`) ficam no `localStorage` (`kurio:guest-cart`). Os preços nunca são guardados: `POST /cart/preview` resolve os valores atuais na API.
- **Autenticado:** o carrinho vive na API (`GET /cart`). No login, os itens do visitante são somados ao carrinho da conta (`POST /cart/merge`) e o carrinho local é esvaziado.
- `useCart()` expõe a mesma interface nos dois casos, então a tela não sabe de onde vêm os dados.
- **Limites:** a quantidade respeita a disponibilidade da edição e o teto de 10 por item. Uma edição esgotada em tempo real bloqueia a finalização até o item ser ajustado.
- **Cotação:** `POST /quote` calcula subtotal, desconto, taxa de rede e total. O resumo do carrinho mostra exatamente esses valores; o cliente não recalcula preços. O cupom fica no `localStorage` (`kurio:coupon`) e é revalidado em cada cotação, com mensagens diferentes para cupom inválido e expirado.

## Pagamento e pedidos

1. **Revisão obrigatória.** Ao abrir, o diálogo de revisão pede uma cotação nova, que revalida preço, disponibilidade, cupom e taxa. Se algo mudou em relação ao que o usuário aceitou, a confirmação fica bloqueada até ele clicar em "Aceitar novos valores".
2. **Envio idempotente.** O botão é desabilitado durante o envio, e a chave de idempotência vale por cotação.
3. **Resultado incerto (timeout ou rede):** o pedido pode já existir no servidor. "Tentar novamente" reenvia exatamente o mesmo conteúdo, com a mesma cotação e a mesma chave, mesmo que uma cotação nova chegue nesse intervalo. Esse caso foi pego por um teste: reenviar com a cotação nova criava um segundo pedido.
4. **Pedido pendente:** a página do pedido recebe `order.updated` pelo socket e, como alternativa, consulta a API a cada 3 s enquanto o status for `pending`. Depois de um refresh ou de uma queda da conexão, o estado é recuperado pela API, sem criar outra compra.
5. **Estados terminais:** `confirmed` e `rejected`. A tela de confirmação só aparece com o pedido efetivamente confirmado pela simulação.
6. **Recibo como snapshot:** os itens do pedido guardam nome, imagem, edição e preços do momento da compra; mudanças posteriores no catálogo não alteram o recibo.
7. **Carrinho após a compra:** na confirmação, a API remove do carrinho só os itens e as quantidades comprados. Em falha ou recusa, os itens continuam lá.

## Cache, retries e sincronização

**Chaves de cache** (`src/lib/query-keys.ts`):
- públicas: `['nfts', 'list', query]` e `['nfts', 'detail', id]`;
- privadas: sob `['private', userId, ...]`, isoladas por usuário e removidas em bloco no logout;
- cotação: `['quote', escopo, itens/cupom/rede]`.

| Política | Valor | Motivo |
|---|---|---|
| `staleTime` | 30 s | Navegar entre telas não refaz requisições desnecessárias; o tempo real mantém o catálogo atualizado. |
| Retry de consultas | Até 2, com backoff (500 ms → 4 s) | Só em falhas transitórias (`NETWORK`, `TIMEOUT`, `UNAVAILABLE`). Erros 4xx nunca são repetidos. |
| Retry de mutations | Nenhum automático | A recuperação é explícita; o pedido usa idempotência. |
| `refetchOnWindowFocus` | Desligado | Evita refetch a cada troca de aba; a sincronização vem dos eventos. |
| Cotação | Renovada a cada 4 min | Antes de vencer (validade de 5 min). |

- **Respostas obsoletas:** cada combinação de filtros é uma chave própria, então uma resposta antiga nunca sobrescreve a atual, e o `AbortSignal` cancela a requisição anterior ao trocar de filtro. `keepPreviousData` mantém a página anterior esmaecida enquanto a nova carrega.
- **URL como estado:** busca, filtros, ordenação e página são search params validados pelo mesmo schema da API (`NftListQuery`). Por isso sobrevivem a refresh e ao histórico do navegador. Mudar um filtro volta para a página 1.
- **Invalidação após mutations:** carrinho, favoritos, perfil e carteiras invalidam a própria chave privada. A confirmação do pedido invalida o pedido e o carrinho.
- **Atualização otimista com rollback (favoritos):** o coração muda na hora. Em caso de falha, o cache volta ao estado anterior e um aviso aparece. No fim, a lista é revalidada com a API.

## Reconciliação REST × Socket.IO

Aplicação de um `nft.updated` (`services/realtime/sync.ts`):
1. Descarta o evento se o `id` já foi visto, se a `version` não é mais nova ou se o `userId` é de outra sessão.
2. Atualiza o detalhe e todas as listas em cache com o novo preço e a nova disponibilidade, só nos itens com versão anterior.
3. Invalida carrinho e cotações: a API é a referência de preço, e o resumo é recalculado por ela. O carrinho e o pagamento avisam qual preço mudou.

Regras de proteção:
- **Resposta REST mais velha que um evento já aplicado:** se uma consulta de NFT chega com `version` menor que a de um evento já processado, ela é refeita. Isso cobre a corrida em que a listagem é gerada antes de uma mudança e chega depois do evento. A corrida foi encontrada por um teste instável e confirmada por instrumentação. `refetchQueries` não resolveria, porque o TanStack Query não cancela uma primeira busca que ainda não tem dados.
- **Reconexão:** no evento `reconnect`, todas as consultas ativas são refeitas na API. Assim, eventos perdidos durante a queda não deixam o estado desatualizado.
- **Pedidos:** além do evento, há o polling de 3 s enquanto o pedido estiver pendente. A confirmação chega mesmo sem tempo real.
- **Ciclo de vida:** os listeners do socket são registrados uma vez e removidos ao encerrar. Os avisos de componentes (ex.: "preço atualizado" no detalhe) se inscrevem com `onRealtimeEvent` e cancelam a inscrição ao desmontar.

## Mocks (MSW)

- **REST:** os handlers são criados por `route()`, que aplica a latência e as falhas do cenário ativo antes de executar a regra de negócio. As regras vivem em `mocks/db` e são compartilhadas entre REST e eventos: toda mudança de preço, estoque ou pedido publica o evento correspondente.
- **Estado:** um único objeto persistido no `localStorage` (`kurio:mocks:db`), que sustenta o refresh. `?scenario=` e `?mocks-reset` restauram integralmente um estado conhecido.
- **Determinismo:** latência, hashes e IDs usam um PRNG com semente derivada do nome do cenário, então a mesma execução produz o mesmo resultado.
- **Fixtures:** 40 NFTs (9 categorias, 3 redes, 4 tipos de edição, preços variados), 2 usuários e 3 cupons.
- **Ativação:** `VITE_ENABLE_MOCKS` (padrão `true`, inclusive no build publicado). A aplicação só é carregada depois que o MSW inicia.
- **Controle:** `window.__KURIO_MOCKS__` é usado pelos testes e pela demonstração. Ele altera o estado do servidor simulado, nunca o cache da interface, então os testes passam pelos handlers e pelo `socket.io-client` de verdade.

### Transporte do socket e limitações

O cliente é o `socket.io-client` real, sem nenhum desvio no código da aplicação. O servidor é simulado com `ws.link` do MSW e `@mswjs/socket.io-binding`, que fala o protocolo Socket.IO.

Limitações do ambiente de mocks:
- **Só WebSocket:** o cliente usa `transports: ['websocket']`, porque o long-polling HTTP não é interceptado pelo binding.
- **A interceptação depende da ordem de carregamento:** o MSW substitui `globalThis.WebSocket`, e o socket.io-client guarda a referência ao carregar. Por isso o app só é importado depois de `worker.start()`. Isso tem custo de performance (veja abaixo).
- **URL do link:** o MSW 2.15 remove `/socket.io/` da URL antes de comparar, então o `ws.link` usa só a origem.
- **O "servidor" vive na própria aba:** os eventos não atravessam abas. Outra aba só vê as mudanças ao consultar a API, porque o estado é compartilhado via `localStorage`. As conexões também não aparecem como frames de rede reais no DevTools.
- **Identificação do usuário:** feita pelo token na query do handshake (`?token=`). Um servidor real usaria o payload de autenticação ou um cookie.
- **Sem buffer no servidor:** um evento publicado sem conexão aberta se perde, como num servidor real sem replay. A recuperação vem da reconciliação por REST e do polling dos pedidos.
- **Service worker:** exige contexto seguro (HTTPS ou `localhost`).

## Acessibilidade

- **Navegação por teclado:** link "Pular para o conteúdo", foco visível global (`:focus-visible`) e foco preso e restaurado em diálogos e drawers (Radix).
- **Semântica:** landmarks, títulos hierárquicos, `label` em todos os campos e erros ligados aos campos por `aria-describedby`/`aria-invalid` (incluindo os `fieldErrors` da API).
- **Feedback de mutations e de tempo real:** avisos (sonner) em região `aria-live`; resumo do carrinho e mudanças de preço com `role="status"`; erros com `role="alert"`.
- **Estados que não dependem só de cor:** preço anterior riscado com texto "Preço anterior" para leitores de tela; edição esgotada marcada como "(esgotada)" e desabilitada.
- **Itens "em breve":** usam `aria-disabled` e texto "(em breve)", sem simular sucesso.
- **Skeletons com shimmer:** têm as mesmas dimensões do conteúdo e respeitam `prefers-reduced-motion`.
- **Reflow:** sem rolagem horizontal nem conteúdo cortado em 390, 768, 1440 e com zoom de 200% e 400% (320 px).

Ajustes em relação ao layout:
- **Avaliação por estrelas:** o texto para leitor de tela fica em `sr-only`, porque `aria-label` em `<p>` não é permitido.
- **Abas do catálogo e menu da conta:** quebram linha em telas estreitas, em vez de esconder itens numa rolagem lateral.
- **Ícone "mostrar senha":** foi adicionado (o Figma só tem "ocultar").

## Performance

Medianas de 3 execuções do Lighthouse 12.6 (detalhes em [lighthouse/RESULTS.md](lighthouse/RESULTS.md)):

| Perfil | Página | Performance | Acessib. | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mobile | Início | 91 | 100 | 100 | 100 | 3,23 s | 0 | 108 ms |
| mobile | Detalhe | 91 | 100 | 100 | 100 | 3,18 s | 0 | 84 ms |
| desktop | Início | 100 | 100 | 100 | 100 | 0,81 s | 0 | 0 ms |
| desktop | Detalhe | 99 | 100 | 100 | 100 | 0,82 s | 0 | 0 ms |

Correções feitas a partir da primeira medição:

| Problema | Causa | Correção | Efeito |
|---|---|---|---|
| Detalhe desktop: Performance 77 | O skeleton tinha outra estrutura e outra altura; a página "pulava" ao carregar (CLS 0,617). | O skeleton espelha a página (trilha compartilhada, mesmas margens, espaço das abas). | 77 → 99, CLS 0 |
| Início mobile: Performance 88 | O texto do hero refluía quando a fonte chegava (CLS 0,121). | Preload da Roboto Mono no `index.html`. | 88 → 91, CLS 0 |
| SEO 92 em todas as páginas | Sem `robots.txt`: o servidor devolvia o HTML da aplicação. | `public/robots.txt`. | 92 → 100 |
| Acessibilidade 97 no detalhe | `aria-label` em `<p>`. | Texto em `sr-only`. | 97 → 100 |

Análise do mobile, onde a margem é pequena (execuções individuais entre 89 e 92):
- **De onde vem o LCP de ~3,2 s:** TTFB 0,47 s, espera para começar a baixar a imagem 1,6 s e render 1,0 s. A espera é dominada pelo JavaScript. O MSW (~172 KB comprimido, ~0,5 s de CPU no perfil mobile) precisa iniciar **antes** do app, porque o socket.io-client guarda o WebSocket ao carregar. Só depois o app baixa o restante e pede os dados.
- **É um custo da exigência:** os mocks ficam ativos no build de demonstração, como pede o enunciado. Com uma API real (`VITE_ENABLE_MOCKS=false`), o MSW nem é baixado.
- **Experimento descartado:** pré-carregar o MSW e o app em paralelo (`modulepreload`) **piorou** a Performance mobile para 75 (LCP 4,4 s). Na rede lenta simulada, os downloads competem com o CSS, a fonte e a imagem principal. A mudança foi revertida.
- **O que já ajuda:** code splitting por rota, imagens `webp` com `width`/`height`, `fetchpriority="high"` na imagem principal do detalhe, `loading="lazy"` fora da primeira dobra, uma única fonte variável (subconjunto latino) e CLS zero.

## Decisões de UX

- **Login e cadastro:** abrem como diálogo sobre a página no desktop e como página inteira no mobile. Depois de autenticar, o usuário volta ao fluxo anterior (`?redirect=`).
- **Edição pré-selecionada no detalhe:** a primeira disponível. No Figma é a 1/50, que pode estar esgotada.
- **Mudanças em tempo real:** aparecem como aviso e no próprio lugar (preço, edição desabilitada, resumo do carrinho), nunca como troca silenciosa de valores.
- **Erros de carregamento:** têm "Tentar novamente". O catálogo mantém o resultado anterior visível durante a nova busca.
- **Busca:** o campo do catálogo aplica o termo com debounce (350 ms) e sem empilhar entradas no histórico. A busca do cabeçalho leva ao catálogo já filtrado.
- **Itens fora do escopo:** Criadores, Aprenda, ajuda, newsletter, redes sociais, login social, "Esqueceu a senha?", favoritos na barra mobile e Atividade/Ofertas/etc. do perfil aparecem como "em breve", sem simular sucesso. A newsletter informa que não está disponível na demonstração.
- **Links de exploração da transação:** abrem o explorer da rede com o hash simulado e são anunciados como referência simulada.

## Desvios do Figma

- **Rótulos "Contrato" e "Direitos autorais":** estavam trocados no Figma; foi usada a ordem correta.
- **Selo "RARO" do card mobile:** não foi implementado, porque a lista da API não traz raridade.
- **Pagamento:** abre uma revisão antes de confirmar (exigência do enunciado). Os campos de carteira são somente leitura, porque vêm das carteiras cadastradas.
- **Tablet (768–1023 px), sem frame no Figma:**
  - o cabeçalho esconde "Criadores"/"Aprenda" (itens "em breve") e mostra só o ícone do usuário;
  - o carrinho mostra o resumo abaixo da tabela até 1279 px;
  - a imagem do detalhe ocupa a largura disponível;
  - o rodapé usa 3 colunas.
- **Telas muito estreitas (< 380 px):** o seletor de quantidade do carrinho desce para uma linha própria; o recibo mostra a quantidade junto do item, sem coluna própria.
- **Perfil, carteiras e confirmação no mobile:** não têm frame no Figma e seguem o padrão das demais telas mobile.
- **Assets:** são as 4 imagens raster e os ícones do arquivo do Figma, exportados por `npm run figma:sync` e versionados em `src/assets`; o app não depende do Figma em tempo de execução. A única fonte é a Roboto Mono, servida localmente (`@fontsource-variable`).

## Limitações conhecidas

- **Não há backend:** toda a persistência é do navegador. Limpar os dados do site reinicia a simulação.
- **Cada aba roda o próprio servidor simulado:** eventos em tempo real não atravessam abas (veja [Transporte do socket](#transporte-do-socket-e-limitações)).
- **Mensagens de validação:** as dos schemas estão em português. Mensagens padrão do Zod que não foram personalizadas aparecem em inglês.
- **Performance mobile:** fica perto do limite de 90 por causa da inicialização obrigatória do MSW (veja [Performance](#performance)).
