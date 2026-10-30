import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Cart, endpoints, Session, type LoginInput, type RegisterInput } from '@/contracts'
import { guestCart } from '@/features/cart/guest-cart'
import { queryKeys } from '@/lib/query-keys'
import { request, send } from '@/services/http/client'
import { sessionStore } from '@/services/session/store'

/** Inicia a sessão e soma o carrinho do visitante ao da conta (os itens não se perdem ao entrar). */
async function startSession(queryClient: QueryClient, session: Session) {
  sessionStore.start(session)
  const lines = guestCart.getLines()
  if (!lines.length) return
  try {
    const cart = await request(Cart, { url: endpoints.cart.merge, method: 'POST', data: { items: lines } })
    queryClient.setQueryData(queryKeys.private.cart(session.user.id), cart)
    guestCart.clear()
  } catch {
    // Falhou a junção: os itens continuam no navegador e serão enviados no próximo login.
  }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => request(Session, { url: endpoints.auth.login, method: 'POST', data: input }),
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => request(Session, { url: endpoints.auth.register, method: 'POST', data: input }),
    onSuccess: (session) => startSession(queryClient, session),
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // A sessão local termina mesmo se a API falhar: o usuário pediu para sair.
      await send({ url: endpoints.auth.logout, method: 'POST' }).catch(() => undefined)
    },
    onSettled: () => sessionStore.end('logout'),
  })
}

/** Confirma com a API a sessão restaurada do armazenamento (após refresh). */
export async function revalidateStoredSession() {
  if (!sessionStore.token()) return
  try {
    const session = await request(Session, { url: endpoints.auth.session })
    sessionStore.updateUser(session.user)
  } catch {
    // 401 já encerra a sessão no interceptor; falhas de rede mantêm a sessão local.
  }
}

/** Aceita apenas caminhos internos como destino pós-login (evita redirecionamento aberto e laços). */
export function safeRedirect(target: string | undefined) {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/'
  return /^\/(login|cadastro)\b/.test(target) ? '/' : target
}

/** Search params de /login e /cadastro. */
export const AuthSearch = z.object({ redirect: z.string().optional() })
