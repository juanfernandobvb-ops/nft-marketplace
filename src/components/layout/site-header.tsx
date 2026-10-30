import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CartIcon, LogoutIcon, SearchIcon, UserIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/api'
import { useSession } from '@/features/auth/use-session'
import { useCartCount } from '@/features/cart/api'
import { cn } from '@/lib/utils'

const navItem = 'flex h-full items-start border-b-[3px] pb-6 text-base transition-colors'
const navActive = 'border-primary font-bold text-accent'
const navIdle = 'border-transparent hover:text-accent'

function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = inputRef.current?.value.trim() ?? ''
    void navigate({ to: '/', search: (prev) => ({ ...prev, q: q || undefined, page: undefined }), hash: 'catalogo' })
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" aria-label="Buscar NFTs" className="cursor-pointer rounded-sm p-1" onClick={() => setOpen(true)}>
        <SearchIcon className="size-5" />
      </button>
    )
  }
  return (
    <form role="search" onSubmit={submit} className="flex items-center gap-2">
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="header-search"
        ref={inputRef}
        autoFocus
        type="search"
        placeholder="Buscar NFTs..."
        onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
        className="h-9 w-56 rounded-md border border-border bg-card px-3 text-sm placeholder:text-secondary"
      />
      <button type="submit" aria-label="Buscar" className="cursor-pointer rounded-sm p-1">
        <SearchIcon className="size-5" />
      </button>
    </form>
  )
}

function UserMenu({ displayName }: { displayName: string }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Você saiu da conta.')
        void navigate({ to: '/' })
      },
    })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-[35px] font-medium">
          <UserIcon className="size-4" />
          {/* No tablet só o ícone cabe; o nome continua como nome acessível. */}
          <span className="sr-only lg:not-sr-only lg:max-w-32 lg:truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-card">
        <DropdownMenuItem asChild>
          <Link to="/perfil">Meu perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/carteiras">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogoutIcon className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SiteHeader() {
  const { user } = useSession()
  const cartCount = useCartCount()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const href = useRouterState({ select: (state) => state.location.href })
  const inMarket = /^\/(nfts|carrinho|pagamento|pedidos)/.test(pathname)

  return (
    <header className="hidden pt-6 md:block">
      <div className="flex h-[45px] items-start justify-between gap-6">
        <Link to="/" className="pt-2 text-sm font-bold tracking-[0.1em] lg:w-40">
          KURIO
        </Link>
        <nav aria-label="Principal" className="h-full">
          <ul className="flex h-full gap-10">
            <li className="h-full">
              <Link to="/" className={cn(navItem, pathname === '/' ? navActive : navIdle)}>
                Início
              </Link>
            </li>
            <li className="h-full">
              <Link to="/" hash="catalogo" className={cn(navItem, inMarket ? navActive : navIdle)}>
                Mercado
              </Link>
            </li>
            {['Criadores', 'Aprenda'].map((label) => (
              <li key={label} className="hidden h-full lg:block">
                <span aria-disabled="true" title="Em breve" className={cn(navItem, navIdle, 'cursor-not-allowed hover:text-foreground')}>
                  {label}
                  <span className="sr-only"> (em breve)</span>
                </span>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-7 pt-1">
          <HeaderSearch />
          <Link
            to="/carrinho"
            aria-label={cartCount ? `Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : 'Carrinho vazio'}
            className="relative rounded-sm p-1"
          >
            <CartIcon className="size-6" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-2 grid size-4 place-items-center rounded-full border-2 border-background bg-primary text-[10px] font-medium text-primary-foreground">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <UserMenu displayName={user.displayName} />
          ) : (
            <Button asChild size="sm" className="h-[35px] gap-1 px-[9px] font-medium">
              <Link to="/login" search={{ redirect: href }}>
                <LogoutIcon className="size-5" />
                Entrar
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="h-px bg-primary/30" />
    </header>
  )
}
