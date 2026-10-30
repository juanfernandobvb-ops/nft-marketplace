import { endpoints, type ErrorCode } from '@/contracts'
import { SESSION_TTL_MS } from '@/mocks/fixtures/commerce'

export interface FailureRule {
  /** Método HTTP; omitido = qualquer. */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Padrão de `endpoints`; omitido = qualquer rota. */
  path?: string
  /**
   * network-error: conexão recusada · timeout: a resposta nunca chega ·
   * timeout-after-processing: o servidor processa (ex.: cria o pedido) e a resposta se perde.
   */
  mode: 'network-error' | 'timeout' | 'timeout-after-processing' | { status: number; code: ErrorCode }
  /** Quantas vezes falha antes de voltar ao normal; omitido = sempre. */
  times?: number
}

export interface LatencyContext {
  method: string
  path: string
  /** Ordem da requisição nesta rota desde o carregamento (1, 2, 3...). */
  count: number
  random: () => number
}

export interface Scenario {
  description: string
  latency: (ctx: LatencyContext) => number
  failures: FailureRule[]
  catalog: 'default' | 'empty'
  sessionTtlMs: number
  payment: { outcome: 'confirm' | 'reject'; delayMs: number }
  /** Mudança no catálogo disparada (com evento Socket.IO) após a primeira cotação com itens. */
  checkoutChange?: { type: 'price-change' | 'sold-out'; delayMs: number }
}

const between = (min: number, max: number) => (ctx: LatencyContext) => min + Math.round(ctx.random() * (max - min))

const base: Scenario = {
  description: 'Fluxo feliz com latência realista.',
  latency: between(150, 400),
  failures: [],
  catalog: 'default',
  sessionTtlMs: SESSION_TTL_MS,
  payment: { outcome: 'confirm', delayMs: 2_500 },
}

export const SCENARIOS = {
  default: base,
  slow: { ...base, description: 'Rede lenta (1,5–3 s): skeletons visíveis.', latency: between(1_500, 3_000) },
  'variable-latency': { ...base, description: 'Latência variável entre 100 ms e 2,5 s.', latency: between(100, 2_500) },
  'out-of-order': {
    ...base,
    description: 'Buscas no catálogo respondem fora de ordem: requisições ímpares lentas, pares rápidas.',
    latency: (ctx) =>
      ctx.method === 'GET' && ctx.path === endpoints.nfts.list ? (ctx.count % 2 === 1 ? 1_800 : 150) : 200,
  },
  'empty-catalog': { ...base, description: 'Catálogo sem NFTs.', catalog: 'empty' },
  offline: {
    ...base,
    description: 'Sem conexão: todas as requisições falham na rede.',
    failures: [{ mode: 'network-error' }],
  },
  'server-error': {
    ...base,
    description: 'Servidor indisponível (503) em todas as leituras.',
    failures: [{ method: 'GET', mode: { status: 503, code: 'UNAVAILABLE' } }],
  },
  flaky: {
    ...base,
    description: 'Catálogo, detalhe e carrinho falham (500) na primeira tentativa e se recuperam na seguinte.',
    failures: [
      { method: 'GET', path: endpoints.nfts.list, mode: { status: 500, code: 'UNAVAILABLE' }, times: 1 },
      { method: 'GET', path: endpoints.nfts.detail, mode: { status: 500, code: 'UNAVAILABLE' }, times: 1 },
      { method: 'GET', path: endpoints.cart.root, mode: { status: 500, code: 'UNAVAILABLE' }, times: 1 },
    ],
  },
  'favorites-error': {
    ...base,
    description: 'Favoritar/desfavoritar falha (503): exercita o rollback da atualização otimista.',
    failures: [{ path: endpoints.favorites.item, mode: { status: 503, code: 'UNAVAILABLE' } }],
  },
  'session-expiry': {
    ...base,
    description: 'Sessões expiram 20 s após o login.',
    sessionTtlMs: 20_000,
  },
  'price-change': {
    ...base,
    description: 'O preço de um NFT do carrinho sobe 3 s após a primeira cotação (evento nft.updated).',
    checkoutChange: { type: 'price-change', delayMs: 3_000 },
  },
  'sold-out': {
    ...base,
    description: 'A edição de um item do carrinho esgota 3 s após a primeira cotação (evento nft.updated).',
    checkoutChange: { type: 'sold-out', delayMs: 3_000 },
  },
  'order-timeout': {
    ...base,
    description: 'O primeiro envio do pedido é processado, mas a resposta se perde (timeout). O reenvio recupera o mesmo pedido.',
    failures: [{ method: 'POST', path: endpoints.orders.create, mode: 'timeout-after-processing', times: 1 }],
  },
  'wallet-rejected': {
    ...base,
    description: 'A carteira recusa a primeira tentativa de conexão; a seguinte é aceita.',
    failures: [{ method: 'POST', path: endpoints.wallets.connect, mode: { status: 409, code: 'WALLET_REJECTED' }, times: 1 }],
  },
  'payment-rejected': {
    ...base,
    description: 'O pagamento é recusado pela simulação.',
    payment: { outcome: 'reject', delayMs: 2_500 },
  },
  'payment-slow': {
    ...base,
    description: 'O pedido fica pendente por 15 s: permite recarregar ou derrubar a conexão no meio.',
    payment: { outcome: 'confirm', delayMs: 15_000 },
  },
} satisfies Record<string, Scenario>

export type ScenarioName = keyof typeof SCENARIOS
export const DEFAULT_SCENARIO: ScenarioName = 'default'

export const isScenarioName = (value: string): value is ScenarioName => value in SCENARIOS
