# Kurio — Marketplace de NFTs

Implementação do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge): descoberta, compra e conta do colecionador, em desktop e mobile, seguindo o [layout do Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

API REST, autenticação, carteiras, pagamentos e eventos em tempo real funcionam com **dados simulados pelo MSW**, inclusive no build publicado. Nenhum backend ou serviço privado é necessário.

- **Aplicação publicada:** https://nft-marketplace-gold-eta.vercel.app
- **Repositório:** https://github.com/juanfernandobvb-ops/nft-marketplace
- **Decisões técnicas, contratos e limitações:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Resultados do Lighthouse:** [lighthouse/RESULTS.md](lighthouse/RESULTS.md)

## Stack

React 19 · TypeScript · Vite · TanStack Router · TanStack Query · Axios · Socket.IO (cliente) · Tailwind CSS 4 · shadcn/ui · MSW 2 (REST + `@mswjs/socket.io-binding`) · Zod · React Hook Form · big.js · Playwright · Lighthouse CI.

## Como rodar

Requisitos: **Node.js 20.19+ ou 22.12+** (testado com Node 25) e npm.

```bash
npm ci                                # dependências exatas do lockfile
npx playwright install chromium       # navegador dos testes E2E (uma vez)
npm run dev                           # http://localhost:5173, com a API simulada ativa
```

O `.env` é opcional: sem ele, os valores padrão abaixo já ativam os mocks. Para mudar algo, copie o exemplo com `cp .env.example .env`.

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW (REST e Socket.IO). Fica ligado também no build de demonstração. |
| `VITE_API_URL` | `/api` | Base das chamadas REST feitas pelo Axios. |
| `VITE_SOCKET_URL` | origem da página | Endereço do servidor Socket.IO. |
| `FIGMA_TOKEN` | — | Usado só por `npm run figma:sync` (referências de design). Não entra no bundle. |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com mocks. |
| `npm run build` | Verificação de tipos e build otimizado em `dist/`. |
| `npm run preview` | Serve o build (mocks ativos), como na versão publicada. |
| `npm run typecheck` | Verificação de tipos (`tsc -b`). |
| `npm run lint` | Lint com oxlint. |
| `npm run test:e2e` | Testes Playwright (gera o build e sobe o preview sozinho). |
| `npm run test:e2e:update` | Regenera as baselines de regressão visual do sistema atual. |
| `npm run test:visual:docker` | Regressão visual no Linux via Docker (`:update` regenera as baselines de Linux). |
| `npm run lighthouse` | Build, auditoria mobile e desktop (3 execuções por página) e resumo em `lighthouse/RESULTS.md`. |
| `npm run figma:sync` | Baixa referências e ícones do Figma (exige `FIGMA_TOKEN`; não roda no build). |

## Credenciais fictícias

| Usuário | E-mail | Senha | Situação inicial |
|---|---|---|---|
| Ana | `ana@kurio.dev` | `kurio1234` | Carteira MetaMask cadastrada e NFTs favoritados. |
| Bruno | `bruno@kurio.dev` | `kurio1234` | Sem carteiras e sem favoritos. |

As senhas ficam guardadas na simulação apenas como hash SHA-256 com salt. Também é possível criar uma conta nova em `/cadastro`.

**Cupons:** `KURIO10` (10%) e `LAUNCH5` (5%) são válidos; `GENESIS20` está expirado; qualquer outro código é inválido.

## Cenários da simulação

Cada cenário é determinístico: mesmos dados, mesma latência e mesmas falhas a cada execução.

- **Selecionar:** abra qualquer URL com `?scenario=<nome>`, por exemplo `http://localhost:5173/?scenario=slow`. O cenário reinicia os dados e continua ativo depois do refresh.
- **Reiniciar o cenário atual:** `?mocks-reset`.
- **Pelo console do navegador:** `__KURIO_MOCKS__.scenarios()` lista os cenários e `__KURIO_MOCKS__.useScenario('slow')` troca de cenário (recarregue a página em seguida).

| Cenário | Comportamento |
|---|---|
| `default` | Fluxo feliz com latência realista (150–400 ms). |
| `slow` | Rede lenta (1,5–3 s): skeletons visíveis. |
| `variable-latency` | Latência variável entre 100 ms e 2,5 s. |
| `out-of-order` | Buscas do catálogo respondem fora de ordem (ímpares lentas, pares rápidas). |
| `empty-catalog` | Catálogo sem NFTs. |
| `offline` | Todas as requisições falham na rede. |
| `server-error` | Todas as leituras respondem 503. |
| `flaky` | Catálogo, detalhe e carrinho falham (500) na primeira tentativa e se recuperam na seguinte. |
| `favorites-error` | Favoritar e desfavoritar falham (503): a atualização otimista é desfeita. |
| `session-expiry` | A sessão expira 20 s depois do login. |
| `price-change` | O preço de um NFT do carrinho sobe 3 s após a primeira cotação (evento `nft.updated`). |
| `sold-out` | A edição de um item do carrinho esgota 3 s após a primeira cotação (evento `nft.updated`). |
| `order-timeout` | O primeiro envio do pedido é processado, mas a resposta se perde; o reenvio recupera o mesmo pedido. |
| `wallet-rejected` | A carteira recusa a primeira conexão e aceita a seguinte. |
| `payment-rejected` | O pagamento é recusado. |
| `payment-slow` | O pedido fica pendente por 15 s. |

### Controles do console

`window.__KURIO_MOCKS__` altera o estado do servidor simulado. Cada mudança passa pelos mesmos caminhos da API, então aparece tanto nas respostas REST quanto nos eventos Socket.IO.

| Chamada | Efeito |
|---|---|
| `updateNft('emerald-ape-042', { price: '2.5' })` | Muda o preço e emite `nft.updated`. |
| `updateNft('emerald-ape-042', { editionId: 'emerald-ape-042-1of10', available: 0 })` | Esgota uma edição e emite `nft.updated`. |
| `expireSessions()` | Expira todas as sessões; a próxima requisição autenticada recebe `SESSION_EXPIRED`. |
| `settleOrdersNow()` | Antecipa o resultado dos pagamentos pendentes. |
| `realtime.disconnectAll()` | Derruba as conexões Socket.IO (o cliente reconecta sozinho). |
| `realtime.setAvailable(false)` | Recusa novas conexões até ser reativado com `true`. |
| `realtime.events()` / `realtime.replay(id)` | Lista os eventos emitidos e reenvia um deles (duplicata ou evento antigo). |
| `reset()` | Restaura o estado inicial do cenário ativo. |

## Como reproduzir os fluxos de falha

| Situação | Como reproduzir |
|---|---|
| Resultado vazio | `/?scenario=empty-catalog`, ou uma busca sem resultado (ex.: "zzz"). |
| Latência variável e respostas fora de ordem | `?scenario=variable-latency` ou `?scenario=out-of-order` e troque filtros rapidamente: a tela sempre mostra o resultado do último filtro. |
| Falha de conexão | `?scenario=offline`. |
| HTTP 5xx e recuperação | `?scenario=server-error` (erro com "Tentar novamente") ou `?scenario=flaky` (falha uma vez e se recupera). |
| HTTP 4xx | NFT inexistente: `/nfts/nao-existe`. Pedido de outra conta: entre como Bruno e abra a URL de um pedido da Ana. |
| Sessão expirada | `?scenario=session-expiry`, entre e espere 20 s; ou `__KURIO_MOCKS__.expireSessions()` a qualquer momento, inclusive no meio do pagamento. |
| Acesso não autorizado | Sem login, abra `/perfil`, `/carteiras` ou `/pagamento`: o app leva ao login e volta ao destino. |
| Conflito de cadastro | Em `/cadastro`, use `ana@kurio.dev` ou o usuário `ana.colecionadora`. |
| Validação de formulário | Envie cadastro, perfil, senha, carteiras ou pagamento com campos vazios ou inválidos. |
| Cupom inválido ou expirado | No carrinho, aplique `GENESIS20` (expirado) ou qualquer outro código. |
| Preço alterado durante a compra | `?scenario=price-change` com um item no carrinho, ou `updateNft(...)` com a revisão do pedido aberta. |
| Edição esgotada durante a compra | `?scenario=sold-out`, ou `updateNft('emerald-ape-042', { editionId: 'emerald-ape-042-1of50', available: 0 })` com o item no carrinho. |
| Timeout do pedido e recuperação | `?scenario=order-timeout`: confirme, espere 10 s e use "Tentar novamente". O pedido não é duplicado. |
| Pagamento confirmado ou recusado | `default` (confirma em 2,5 s) ou `?scenario=payment-rejected`. |
| Queda do tempo real com pedido pendente | `?scenario=payment-slow`: confirme, recarregue a página ou rode `realtime.setAvailable(false)`. O estado é recuperado pela API. |
| Falha da atualização otimista | `?scenario=favorites-error` e favorite um NFT. |
| Carteira recusada | `?scenario=wallet-rejected` e conecte a carteira no pagamento. |

## Testes

```bash
npm run test:e2e                       # todos os testes (Chromium: desktop 1440, mobile 390, tablet 768)
npx playwright test tests/e2e/cart.spec.ts --project=mobile
npx playwright show-report             # relatório HTML (playwright-report/)

# mesma suíte contra a versão publicada, em vez do preview local
PLAYWRIGHT_BASE_URL=https://nft-marketplace-gold-eta.vercel.app npx playwright test
```

- Os testes rodam contra o build otimizado com os mocks ativos. Cada teste parte de um estado isolado (`?scenario=` reinicia os dados).
- Os testes sensíveis a tempo controlam o relógio com `page.clock` (expiração de sessão, liquidação do pagamento, timeout do pedido) e disparam os eventos pelo servidor simulado, passando pelo `socket.io-client`.
- Falhas geram trace e screenshot (`test-results/`); abra com `npx playwright show-trace <arquivo>`.
- **Regressão visual:** as baselines de início, detalhe, carrinho e pagamento ficam em `tests/visual/__screenshots__/<sistema>/<perfil>/`. Como a renderização de fontes muda entre sistemas operacionais, há baselines de **Windows** (`win32`) e de **Linux** (`linux`).
  - Em qualquer máquina com Docker, `npm run test:visual:docker` roda a comparação no Linux da imagem oficial do Playwright.
  - Em um sistema sem baselines (ex.: macOS), os testes visuais são pulados com essa orientação; os demais testes rodam normalmente.

## Lighthouse

`npm run lighthouse` audita Início e Detalhe em mobile e desktop, sobre o build otimizado e o cenário `default`. São 3 execuções por página e perfil, e o resumo usa a mediana. Os relatórios HTML/JSON ficam em `lighthouse/reports/` e a configuração em `lighthouse/lighthouserc.*.json`.

| Perfil | Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mobile | Início | 91 | 100 | 100 | 100 | 3,23 s | 0 | 108 ms |
| mobile | Detalhe | 91 | 100 | 100 | 100 | 3,18 s | 0 | 84 ms |
| desktop | Início | 100 | 100 | 100 | 100 | 0,81 s | 0 | 0 ms |
| desktop | Detalhe | 99 | 100 | 100 | 100 | 0,82 s | 0 | 0 ms |

Ambiente, versões e a análise dos resultados estão em [lighthouse/RESULTS.md](lighthouse/RESULTS.md) e em [ARCHITECTURE.md](ARCHITECTURE.md#performance).

## Solução de problemas

**"A demonstração não carregou direito"**
A requisição não passou pela API simulada. Normalmente a causa é um service worker antigo de outra versão ou a opção "Bypass for network" ligada no DevTools. Para resolver:
1. DevTools → Application → Service Workers: desmarque "Bypass for network" e clique em "Unregister".
2. Application → Storage → "Clear site data".
3. Feche as abas do site e abra de novo.

**Dados estranhos depois de testar muita coisa:** use `?mocks-reset` ou `?scenario=default`. O estado simulado fica no `localStorage` (`kurio:mocks:db`).

**Testes visuais pulados ou com diferença de pixels:** as baselines são por sistema operacional. Use `npm run test:visual:docker` para comparar no Linux padronizado, ou gere as do seu sistema com `npm run test:e2e:update` (confira as imagens antes de usá-las).

**Porta ocupada nos testes ou no Lighthouse:** os testes usam a porta 4173 e o Lighthouse as portas 4174 e 4175. Encerre um `npm run preview` que esteja aberto.

## Estrutura

```
src/
  contracts/   Schemas Zod e endpoints: a fonte única dos tipos, usada pelo app e pelos mocks
  mocks/       MSW: estado simulado (db), fixtures, cenários, handlers REST e Socket.IO
  services/    HTTP (Axios), sessão e tempo real (socket + sincronização com o cache)
  features/    Um módulo por domínio: queries, mutations e componentes
  routes/      Rotas do TanStack Router (finas: delegam para features/)
  components/  Layout e componentes de interface (shadcn/ui adaptado)
tests/
  e2e/         Fluxos Playwright
  visual/      Regressão visual
  support/     Utilitários (cenário, login, verificação de layout)
lighthouse/    Configuração, relatórios e resumo das auditorias
docs/figma/    Telas de referência e medidas exportadas do Figma
```
