import type { QueryClient } from '@tanstack/react-query'
import { revalidateStoredSession } from '@/features/auth/api'
import { queryKeys } from '@/lib/query-keys'
import { connectRealtime } from '@/services/realtime/socket'
import { startRealtimeSync } from '@/services/realtime/sync'
import { sessionStore } from '@/services/session/store'

/**
 * Liga sessão, cache e tempo real: a cada troca de usuário (login, logout, expiração),
 * descarta os dados privados em cache e refaz a conexão Socket.IO com o novo token.
 */
export function startSessionLifecycle(queryClient: QueryClient) {
  let currentUserId = sessionStore.userId()
  const stopSync = startRealtimeSync(queryClient)
  connectRealtime(sessionStore.token())
  // Sessão restaurada do localStorage: confirma com a API (token expirado encerra a sessão).
  void revalidateStoredSession()

  const unsubscribe = sessionStore.subscribe(() => {
    const nextUserId = sessionStore.userId()
    if (nextUserId === currentUserId) return
    queryClient.removeQueries({ queryKey: queryKeys.private.all })
    queryClient.removeQueries({ queryKey: ['quote'] })
    currentUserId = nextUserId
    connectRealtime(sessionStore.token())
  })

  return () => {
    unsubscribe()
    stopSync()
  }
}
