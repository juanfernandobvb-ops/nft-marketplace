import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'

/** Avisa quando a sessão expira e oferece entrar de novo voltando para a mesma página. */
export function SessionNotices() {
  const { session, endedBy } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session || endedBy !== 'expired') return
    toast.warning('Sua sessão expirou. Entre novamente para continuar de onde parou.', {
      id: 'session-expired',
      duration: 10_000,
      action: {
        label: 'Entrar',
        // Endereço lido no clique: é a página em que o usuário está naquele momento.
        onClick: () => void router.navigate({ to: '/login', search: { redirect: router.state.location.href } }),
      },
    })
  }, [session, endedBy, router])

  return null
}
