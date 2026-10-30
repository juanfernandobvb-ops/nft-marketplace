import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthSearch, safeRedirect } from '@/features/auth/api'
import { AuthShell, RegisterFormView } from '@/features/auth/components/auth-forms'
import { sessionStore } from '@/services/session/store'

export const Route = createFileRoute('/cadastro')({
  validateSearch: AuthSearch,
  beforeLoad: ({ search }) => {
    if (sessionStore.token()) throw redirect({ to: safeRedirect(search.redirect) })
  },
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect: target } = Route.useSearch()
  return (
    <AuthShell mode="register" redirect={target}>
      <RegisterFormView redirect={target} />
    </AuthShell>
  )
}
