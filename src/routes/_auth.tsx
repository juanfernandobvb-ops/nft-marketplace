import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSession } from '@/features/auth/use-session'
import { sessionStore } from '@/services/session/store'

/** Layout das rotas privadas: exige sessão e devolve o usuário ao mesmo lugar após o login. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.token()) throw redirect({ to: '/login', search: { redirect: location.href } })
  },
  component: AuthLayout,
})

function AuthLayout() {
  const { session } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  // Sessão encerrada nesta página (expiração ou logout): volta ao login preservando o destino.
  // Durante a transição a localização já é a do login; sem a guarda, o destino seria o próprio login.
  useEffect(() => {
    if (session || location.pathname === '/login') return
    void navigate({ to: '/login', search: { redirect: location.href }, replace: true })
  }, [session, navigate, location.pathname, location.href])

  return session ? <Outlet /> : null
}
