import { Link, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { ChevronLeftIcon, TrashIcon, WarningIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftListQuery, quantityLimit, type CartItem, type Quote } from '@/contracts'
import { couponStore, useCoupon } from '@/features/cart/coupon-store'
import { useCart, useQuote } from '@/features/cart/use-cart'
import { NftRail } from '@/features/catalog/components/nft-rail'
import { QuantityStepper } from '@/features/nft/components/nft-purchase'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

const EDITION_LABEL = { '1/1': '1/1', '1/10': '1/10', '1/50': '1/50', open: 'Aberta' } as const
const COLUMNS = 'md:grid md:grid-cols-[minmax(0,1fr)_90px_100px_110px_24px] md:items-center md:gap-4'

function CartLine({
  item,
  disabled,
  onQuantity,
  onRemove,
}: {
  item: CartItem
  disabled: boolean
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  const limit = quantityLimit(item.edition)
  const overLimit = item.quantity > limit
  return (
    <li className={cn('relative flex gap-4 rounded-xl bg-card p-2 max-[379px]:flex-wrap md:rounded-none md:p-0 md:pr-6', COLUMNS)}>
      <div className="flex min-w-0 items-center gap-4 max-[379px]:basis-full">
        <img
          src={item.nft.images[0]?.url}
          alt=""
          width={70}
          height={70}
          className="size-[100px] shrink-0 rounded-lg object-cover md:size-[70px] md:rounded-none"
        />
        <div className="flex min-w-0 flex-col gap-1 max-md:pr-7">
          <Link to="/nfts/$nftId" params={{ nftId: item.nft.id }} className="truncate text-base font-bold hover:text-accent">
            {item.nft.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            <span className="md:hidden">Edição: {EDITION_LABEL[item.edition.kind]}</span>
            <span className="hidden md:inline">ID do token: {item.nft.tokenId}</span>
          </p>
          <p className="text-lg font-bold text-accent md:hidden">{formatEth(item.lineTotal)}</p>
        </div>
      </div>
      <p className="hidden font-bold text-accent md:block">{formatEth(item.unitPrice)}</p>
      {/* Em telas muito estreitas o seletor desce para uma linha própria. */}
      <div className="absolute right-3 bottom-3 max-[379px]:static max-[379px]:ml-auto md:static">
        <QuantityStepper value={item.quantity} max={Math.max(limit, 1)} onChange={onQuantity} size="sm" disabled={disabled} label={item.nft.name} />
      </div>
      <p className="hidden font-bold text-accent md:block">{formatEth(item.lineTotal)}</p>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remover ${item.nft.name} do carrinho`}
        className="absolute top-3 right-3 cursor-pointer text-secondary hover:text-accent disabled:opacity-50 md:static"
      >
        <TrashIcon className="size-5" />
      </button>
      {(overLimit || limit === 0) && (
        <p role="alert" className="col-span-full flex items-center gap-2 pb-2 text-[13px] text-destructive md:pl-[86px]">
          <WarningIcon className="size-4 shrink-0" />
          {limit === 0
            ? 'Esta edição esgotou. Remova o item para continuar.'
            : `Restam apenas ${limit} unidade(s). Ajuste a quantidade para continuar.`}
        </p>
      )}
    </li>
  )
}

export function CouponForm({ quote }: { quote: Quote | undefined }) {
  const applied = useCoupon()
  const [draft, setDraft] = useState('')
  const issue = quote?.issues.find((item) => item.type === 'COUPON_INVALID' || item.type === 'COUPON_EXPIRED')
  const error = issue && (issue.type === 'COUPON_EXPIRED' ? `O cupom ${issue.code} expirou.` : `O cupom ${issue.code} é inválido.`)

  const apply = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim()) couponStore.set(draft.trim().toUpperCase())
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={apply} className="flex flex-col gap-2">
        <label htmlFor="coupon" className="text-sm font-bold">
          Código promocional
        </label>
        <div className="flex h-10 overflow-hidden rounded-[3px] border border-primary max-md:h-[50px] max-md:rounded-full">
          <input
            id="coupon"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Digite o código promocional..."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'coupon-error' : undefined}
            className="min-w-0 flex-1 bg-transparent px-2 text-xs placeholder:text-secondary max-md:px-4"
          />
          <button type="submit" className="w-[102px] cursor-pointer bg-primary text-[15px] font-bold text-primary-foreground max-md:rounded-full">
            Aplicar
          </button>
        </div>
      </form>
      {applied && (
        <p className="flex items-center justify-between gap-2 text-[13px]" role="status">
          <span className={error ? 'text-destructive' : 'text-success'} id="coupon-error">
            {error ?? `Cupom ${applied} aplicado: ${quote?.coupon?.description ?? '...'}`}
          </span>
          <button type="button" className="cursor-pointer text-accent underline" onClick={() => couponStore.set(null)}>
            Remover cupom
          </button>
        </p>
      )}
    </div>
  )
}

/** `subtle`: valor no tamanho do rótulo (o desconto, no Figma), para a linha caber sem quebrar. */
export function SummaryRow({
  label,
  value,
  hint,
  strong,
  subtle,
}: {
  label: string
  value: string
  hint?: string
  strong?: boolean
  subtle?: boolean
}) {
  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex w-full items-center justify-between gap-3">
        <dt className={cn('min-w-0 text-[15px]', strong && 'text-base font-bold')}>{label}</dt>
        <dd className={cn('shrink-0 text-lg whitespace-nowrap', subtle && 'text-[15px]', strong && 'font-bold text-accent')}>{value}</dd>
      </div>
      {hint && <span className="text-xs text-accent">{hint}</span>}
    </div>
  )
}

function CartSummary({ items }: { items: CartItem[] }) {
  const coupon = useCoupon()
  const lines = items.map(({ nft, edition, quantity }) => ({ nftId: nft.id, editionId: edition.id, quantity }))
  const { data: quote, isPending, isError, isFetching, refetch } = useQuote(lines, coupon)
  const priceChanges = quote?.issues.filter((issue) => issue.type === 'PRICE_CHANGED') ?? []
  const blocked = Boolean(quote?.issues.some((issue) => issue.type === 'INSUFFICIENT_STOCK'))
  const nameOf = (nftId: string) => items.find((item) => item.nft.id === nftId)?.nft.name ?? 'Um item'

  return (
    <aside aria-labelledby="summary-title" className="flex flex-col gap-6 rounded-t-[31px] bg-card p-6 md:ml-auto md:w-full md:max-w-[420px] md:rounded-none xl:ml-0 xl:w-[332px] xl:shrink-0 md:bg-transparent md:p-0">
      <h2 id="summary-title" className="hidden border-b border-primary/30 pb-3 text-lg font-bold md:block">
        Resumo da carteira
      </h2>
      <CouponForm quote={quote} />

      {priceChanges.length > 0 && (
        <div role="status" className="rounded-md border border-primary/50 bg-primary/10 p-3 text-[13px]">
          {priceChanges.map((change) =>
            change.type === 'PRICE_CHANGED' ? (
              <p key={change.nftId}>
                O preço de <strong>{nameOf(change.nftId)}</strong> mudou de {formatEth(change.previousPrice)} para{' '}
                {formatEth(change.currentPrice)}. O resumo foi atualizado.
              </p>
            ) : null,
          )}
        </div>
      )}

      {isPending ? (
        <div className="flex flex-col gap-3" aria-label="Calculando valores">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-5" />
          ))}
        </div>
      ) : isError && !quote ? (
        <div role="alert" className="flex flex-col gap-2 text-sm text-destructive">
          Não foi possível calcular os valores.
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        quote && (
          <dl aria-busy={isFetching} className={cn('flex flex-col gap-3 transition-opacity', isFetching && 'opacity-60')}>
            <SummaryRow label="Subtotal" value={formatEth(quote.subtotal)} />
            <SummaryRow label="Desconto do lançamento" value={`(-) ${formatEth(quote.discount)}`} subtle />
            <SummaryRow label="Taxa de rede" value={formatEth(quote.networkFee)} hint="Taxa estimada" />
            <div className="mt-4">
              <SummaryRow label="Total" value={formatEth(quote.total)} strong />
            </div>
          </dl>
        )
      )}

      <div className="flex flex-col items-center gap-3">
        {blocked || !quote ? (
          <Button disabled className="h-10 w-full rounded-[3px] text-[15px] max-md:h-[60px] max-md:rounded-full">
            Conectar e finalizar
          </Button>
        ) : (
          <Button asChild className="h-10 w-full rounded-[3px] text-[15px] max-md:h-[60px] max-md:rounded-full">
            <Link to="/pagamento">Conectar e finalizar</Link>
          </Button>
        )}
        {blocked && <p className="text-[13px] text-destructive">Ajuste os itens sem disponibilidade para continuar.</p>}
        <Link to="/" hash="catalogo" className="text-[15px] text-accent">
          Continuar explorando
        </Link>
      </div>
    </aside>
  )
}

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando carrinho" className="flex flex-col gap-3">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-[116px] rounded-xl md:h-[70px] md:rounded-none" />
      ))}
    </div>
  )
}

export function CartView() {
  const router = useRouter()
  const cart = useCart()
  const items = cart.cart?.items ?? []

  let content: React.ReactNode
  if (cart.isPending) {
    content = (
      <div className="flex flex-col gap-8 xl:flex-row xl:justify-between">
        <div className="xl:w-[782px]">
          <CartSkeleton />
        </div>
        <Skeleton className="h-[388px] md:ml-auto md:w-full md:max-w-[420px] xl:ml-0 xl:w-[332px]" />
      </div>
    )
  } else if (cart.isError && !cart.cart) {
    content = (
      <div role="alert" className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold">Não foi possível carregar o carrinho</p>
        <p className="text-sm text-muted-foreground">{cart.error?.message}</p>
        <Button size="sm" onClick={() => void cart.refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  } else if (cart.isEmpty) {
    content = (
      <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold">Seu carrinho está vazio</p>
        <p className="text-sm text-muted-foreground">Explore o catálogo e adicione NFTs para continuar.</p>
        <Button asChild size="sm">
          <Link to="/" hash="catalogo">
            Explorar NFTs
          </Link>
        </Button>
      </div>
    )
  } else {
    content = (
      <div className="flex flex-col gap-8 xl:flex-row xl:justify-between xl:gap-10">
        <section aria-labelledby="cart-items-title" className="flex min-w-0 flex-col gap-3 xl:max-w-[782px] xl:flex-1">
          <h2 id="cart-items-title" className="sr-only">
            Itens do carrinho
          </h2>
          <div aria-hidden="true" className={cn('hidden border-b border-primary/30 pr-6 pb-3 text-base font-bold', COLUMNS)}>
            <span>NFTs</span>
            <span className="font-medium">Preço</span>
            <span>Edições</span>
            <span className="font-medium">Total</span>
            <span />
          </div>
          <ul aria-busy={cart.isUpdating} className="flex flex-col gap-3">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                disabled={cart.isUpdating}
                onQuantity={(quantity) => cart.updateQuantity(item, quantity)}
                onRemove={() => cart.removeItem(item)}
              />
            ))}
          </ul>
        </section>
        <CartSummary items={items} />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-center pt-8 md:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Voltar"
          className="absolute left-6 grid size-[35px] cursor-pointer place-items-center rounded-full border border-border bg-surface-raised"
        >
          <ChevronLeftIcon className="h-3" />
        </button>
        <h1 className="text-xl font-bold">Carrinho de NFTs</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="mt-6 hidden text-[15px] font-bold md:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/">Início</Link> /
          </li>
          <li>
            <Link to="/" hash="catalogo">
              Mercado
            </Link>{' '}
            /
          </li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only hidden md:block">Carrinho de NFTs</h1>
      <div className="mt-6 md:mt-3">{content}</div>
      <NftRail title="Colecionadores também viram" query={NftListQuery.parse({ segment: 'trending', pageSize: 6 })} excludeIds={items.map((item) => item.nft.id)} />
    </>
  )
}
