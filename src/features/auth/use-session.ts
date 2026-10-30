import { useSyncExternalStore } from 'react'
import { sessionStore } from '@/services/session/store'

export function useSession() {
  const { session, endedBy } = useSyncExternalStore(sessionStore.subscribe, sessionStore.getState)
  return { session, user: session?.user ?? null, endedBy }
}
