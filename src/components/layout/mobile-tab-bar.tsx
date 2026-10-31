import { Link, useRouterState } from '@tanstack/react-router'
import { CartIcon, HeartFilledIcon, HomeIcon, SearchIcon, UserFilledIcon } from '@/components/icons'
import { useCartCount } from '@/features/cart/api'

const item = 'grid size-11 place-items-center rounded-md text-secondary [&.active]:text-accent'

/** Navegação inferior do layout mobile (detalhe do NFT e pagamento usam a própria barra de ação no lugar). */
export function MobileTabBar() {
  const cartCount = useCartCount()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname.startsWith('/nfts/') || pathname === '/pagamento') return null
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <ul className="relative flex h-[76px] items-center justify-around rounded-t-3xl border-t border-border bg-card px-4">
        <li>
          <Link to="/" aria-label="Início" activeOptions={{ exact: true, includeHash: false }} className={item}>
            <HomeIcon className="size-5" />
          </Link>
        </li>
        <li>
          <span aria-disabled="true" title="Favoritos (em breve)" className={`${item} cursor-not-allowed`}>
            <HeartFilledIcon className="size-5" aria-label="Favoritos (em breve)" role="img" />
          </span>
        </li>
        <li className="-mt-12">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Explorar catálogo"
            className="grid size-16 place-items-center rounded-full border-4 border-background bg-linear-to-br from-accent to-primary text-primary-foreground"
          >
            <SearchIcon className="size-6" />
          </Link>
        </li>
        <li>
          <Link
            to="/carrinho"
            aria-label={cartCount ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
            className={`${item} relative`}
          >
            <CartIcon className="size-5" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-0.5 size-2 rounded-full bg-primary" aria-hidden="true" />
            )}
          </Link>
        </li>
        <li>
          <Link to="/perfil" aria-label="Perfil" className={item}>
            <UserFilledIcon className="size-5" />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
