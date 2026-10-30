import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthSearch, safeRedirect } from '@/features/auth/api'
import { AuthShell, LoginForm } from '@/features/auth/components/auth-forms'
import { sessionStore } from '@/services/session/store'

export const Route = createFileRoute('/login')({
  validateSearch: AuthSearch,
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target } = Route.useSearch()
  return (
    <AuthShell mode="login" redirect={target}>
      <LoginForm redirect={target} />
    </AuthShell>
  )
}
