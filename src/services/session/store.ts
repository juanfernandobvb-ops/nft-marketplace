import { Session } from '@/contracts'

const STORAGE_KEY = 'kurio:session'

export type SessionEndReason = 'logout' | 'expired'

interface SessionState {
  session: Session | null
  /** Motivo do último encerramento; usado para avisar "sua sessão expirou". */
  endedBy: SessionEndReason | null
}

function load(): Session | null {
  try {
    const parsed = Session.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function save(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem storage: a sessão vale só nesta aba.
  }
}

let state: SessionState = { session: load(), endedBy: null }
const listeners = new Set<() => void>()

function set(next: SessionState) {
  state = next
  save(next.session)
  listeners.forEach((listener) => listener())
}

/**
 * Fonte única da sessão, acessível fora do React (Axios, socket) e dentro dele
 * (`useSyncExternalStore`). Persistida no localStorage para sobreviver ao refresh.
 */
export const sessionStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  token: () => state.session?.token ?? null,
  userId: () => state.session?.user.id ?? null,
  start(session: Session) {
    set({ session, endedBy: null })
  },
  end(reason: SessionEndReason) {
    if (state.session) set({ session: null, endedBy: reason })
  },
  /** Mantém o token e atualiza os dados do usuário (ex.: após editar o perfil). */
  updateUser(user: Session['user']) {
    if (state.session) set({ ...state, session: { ...state.session, user } })
  },
}
