import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { SessionNotices } from '@/features/auth/components/session-notices'

interface RouterContext {
  queryClient: QueryClient
}

function RootLayout() {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto w-full max-w-[1232px] px-4">
        <SiteHeader />
        <main id="conteudo" tabIndex={-1} className="outline-none">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar />
      <SessionNotices />
      <Toaster theme="dark" position="bottom-right" richColors closeButton mobileOffset={{ bottom: 96 }} />
    </>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <section className="grid min-h-[50dvh] place-content-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe.</p>
      <Link to="/" className="text-accent underline">
        Voltar ao início
      </Link>
    </section>
  ),
})
