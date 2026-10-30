import { queryOptions, useMutation } from '@tanstack/react-query'
import { buildPath, CreateOrderInput, endpoints, IDEMPOTENCY_HEADER, Order } from '@/contracts'
import { queryKeys } from '@/lib/query-keys'
import { request } from '@/services/http/client'

/** Fallback do tempo real: enquanto pendente, consulta a API periodicamente. */
const PENDING_POLL_MS = 3_000

export const orderQuery = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: queryKeys.private.order(userId, orderId),
    queryFn: ({ signal }) => request(Order, { url: buildPath(endpoints.orders.detail, { orderId }), signal }),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_POLL_MS : false),
  })

const ATTEMPTS_KEY = 'kurio:order-attempts'

function readAttempts(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

/**
 * Uma chave de idempotência por cotação: reenviar o mesmo pedido (clique repetido, timeout,
 * refresh) reaproveita a chave e a API devolve o pedido já criado em vez de duplicar.
 */
export function idempotencyKeyFor(quoteId: string) {
  const attempts = readAttempts()
  const key = attempts[quoteId] ?? crypto.randomUUID()
  attempts[quoteId] = key
  try {
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
  } catch {
    // Sem storage: a chave vale enquanto a página estiver aberta.
  }
  return key
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      request(Order, {
        url: endpoints.orders.create,
        method: 'POST',
        data: CreateOrderInput.parse(input),
        headers: { [IDEMPOTENCY_HEADER]: idempotencyKeyFor(input.quoteId) },
      }),
  })
}
