import { QueryClient } from '@tanstack/react-query'
import { HttpError } from '@/services/http/errors'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Só repete falhas transitórias (rede, timeout, 503); erros 4xx nunca são repetidos.
      retry: (failureCount, error) => error instanceof HttpError && error.isRetryable && failureCount < MAX_RETRIES,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
      refetchOnWindowFocus: false,
    },
    // Mutations nunca repetem sozinhas: a recuperação é explícita (pedido usa idempotência).
    mutations: { retry: false },
  },
})
