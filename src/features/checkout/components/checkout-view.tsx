import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { flushSync } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { ChevronDownIcon, ChevronLeftIcon, WarningIcon } from '@/components/icons'
import { inputClass, RequiredMark, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Network, type CartItem, type Profile, type Wallet, type Wallets, type WalletConnection } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { CouponForm, SummaryRow } from '@/features/cart/components/cart-view'
import { useCoupon } from '@/features/cart/coupon-store'
import { useCart, useQuote } from '@/features/cart/use-cart'
import { ReviewDialog } from '@/features/checkout/components/review-dialog'
import { cardRadioClass, WalletConnect } from '@/features/checkout/components/wallet-connect'
import { CheckoutForm, checkoutDraft, type CheckoutFormValues } from '@/features/checkout/form'
import { profileQuery } from '@/features/profile/api'
import { walletsQuery } from '@/features/wallets/api'
import { formatEth, NETWORK_LABELS, shortHash, WALLET_LABELS } from '@/lib/format'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

const SLOT_LABELS = { primary: 'Principal', secondary: 'Reserva' } as const

function ReadOnlyField({ label, value, required }: { label: string; value: string; required?: boolean }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm">
        {label}
        {required && <RequiredMark />}
      </label>
      <input id={id} readOnly value={value} className={cn(inputClass, 'text-muted-foreground')} />
    </div>
  )
}

/** Cartões das carteiras cadastradas (layout mobile do Figma): a escolhida define carteira e rede do pagamento. */
function WalletCards({ wallets, selected, onSelect }: { wallets: Wallet[]; selected: Wallet | null; onSelect: (wallet: Wallet) => void }) {
  return (
    <div role="radiogroup" aria-label="Carteira usada no pagamento" className="flex flex-col gap-5">
      {wallets.map((option) => (
        <label key={option.slot} className="flex cursor-pointer items-center gap-4 rounded-[14px] bg-card px-[19px] py-4">
          <input
            type="radio"
            name="checkout-wallet"
            checked={option.slot === selected?.slot}
            onChange={() => onSelect(option)}
            className={cardRadioClass}
          />
          <span className="flex flex-col gap-1.5">
            <span className="text-base font-bold">{SLOT_LABELS[option.slot]}</span>
            <span className="text-sm leading-[22px] text-muted-foreground">
              {shortHash(option.address)}
              <br />
              Rede {NETWORK_LABELS[option.network]}
            </span>
          </span>
        </label>
      ))}
    </div>
  )
}

function CheckoutFormView({ userId, profile, wallets }: { userId: string; profile: Profile; wallets: Wallets }) {
  const isDesktop = useIsDesktop()
  const cart = useCart()
  const coupon = useCoupon()
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  /** Itens congelados ao abrir a revisão: o carrinho pode mudar (ex.: pedido confirmado) enquanto o diálogo está aberto. */
  const [reviewItems, setReviewItems] = useState<CartItem[] | null>(null)
  const [walletError, setWalletError] = useState('')
  /** No mobile os dados do colecionador ficam num bloco recolhível, aberto sozinho quando há erro. */
  const [collectorOpen, setCollectorOpen] = useState(false)

  const { register, handleSubmit, control, formState, setValue, setFocus } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutForm),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName ?? '',
      profileName: wallets.primary?.profileName ?? '',
      referralCode: wallets.primary?.referralCode ?? '',
      network: wallets.primary?.network ?? 'ethereum',
      useSecondary: false,
      note: '',
      ...checkoutDraft.load(userId),
    },
  })

  const values = useWatch({ control }) as CheckoutFormValues
  // Rascunho salvo a cada alteração: refresh ou sessão expirada não perdem o preenchido.
  useEffect(() => checkoutDraft.save(userId, values), [values, userId])
  const wallet = values.useSecondary ? wallets.secondary : wallets.primary
  const registered = [wallets.primary, wallets.secondary].filter((option): option is Wallet => Boolean(option))
  const items = cart.cart?.items ?? []
  const lines = items.map(({ nft, edition, quantity }) => ({ nftId: nft.id, editionId: edition.id, quantity }))
  const { data: quote, isPending: quotePending } = useQuote(lines, coupon, values.network)
  const blocked = Boolean(quote?.issues.some((issue) => issue.type === 'INSUFFICIENT_STOCK'))

  // Trocar de rede ou de carteira invalida a conexão atual: é preciso conectar de novo.
  const activeConnection =
    connection && connection.network === values.network && connection.slot === wallet?.slot ? connection : null

  const openReview = handleSubmit(
    () => {
      if (!activeConnection) {
        setWalletError('Conecte a carteira antes de revisar o pedido.')
        document.getElementById('wallet-title')?.scrollIntoView({ block: 'center' })
        return
      }
      setWalletError('')
      setReviewItems(items)
    },
    (invalid) => {
      if (isDesktop) return
      // Campo fechado não recebe foco: abre o bloco antes de levar o foco ao primeiro erro.
      flushSync(() => setCollectorOpen(true))
      const first = Object.keys(invalid)[0] as keyof CheckoutFormValues | undefined
      if (first) setFocus(first)
    },
  )

  if (cart.isPending) return <Skeleton className="mt-8 h-[600px]" />
  if (cart.isEmpty && !reviewItems) {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-bold">Seu carrinho está vazio</p>
        <Button asChild size="sm">
          <Link to="/" hash="catalogo">
            Explorar NFTs
          </Link>
        </Button>
      </div>
    )
  }

  const errors = formState.errors
  const collectorFields = (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      <TextField label="Nome de exibição" required error={errors.displayName?.message} {...register('displayName')} />
      <TextField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...register('username')} />
      <div className="flex flex-col gap-1">
        <label htmlFor="checkout-network" className="text-sm">
          Rede
          <RequiredMark />
        </label>
        <select id="checkout-network" className={cn(inputClass, 'bg-background')} {...register('network')}>
          {Network.options.map((network) => (
            <option key={network} value={network}>
              {NETWORK_LABELS[network]}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Nome do perfil" required error={errors.profileName?.message} {...register('profileName')} />
      <ReadOnlyField label="Endereço da carteira" required value={wallet?.address ?? 'Nenhuma carteira cadastrada'} />
      <ReadOnlyField label="ENS ou carteira secundária (opcional)" value={wallet?.secondaryAddress ?? '—'} />
      <ReadOnlyField label="Tipo de carteira" required value={wallet ? WALLET_LABELS[wallet.type] : '—'} />
      <TextField label="Código de indicação" required error={errors.referralCode?.message} {...register('referralCode')} />
      <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
      <div className="flex flex-col gap-1">
        <label htmlFor="checkout-ens" className="text-sm">
          Nome ENS
          <RequiredMark />
        </label>
        <div className="flex gap-2">
          <span className={cn(inputClass, 'flex w-auto items-center')} aria-hidden="true">
            .eth
          </span>
          <input
            id="checkout-ens"
            aria-invalid={Boolean(errors.ensName)}
            aria-describedby={errors.ensName ? 'checkout-ens-error' : undefined}
            className={inputClass}
            {...register('ensName')}
          />
        </div>
        {errors.ensName && (
          <p id="checkout-ens-error" className="text-[13px] text-destructive">
            {errors.ensName.message}
          </p>
        )}
      </div>
    </div>
  )
  const noteField = (
    <div className="flex flex-col gap-1">
      <label htmlFor="checkout-note" className="text-[15px]">
        Observação do colecionador (opcional)
      </label>
      <textarea
        id="checkout-note"
        rows={6}
        className="rounded-[5px] border border-border bg-transparent p-3 text-sm focus:border-primary focus:outline-none md:max-w-[350px]"
        {...register('note')}
      />
      {errors.note && <p className="text-[13px] text-destructive">{errors.note.message}</p>}
    </div>
  )
  const walletMissing = !wallet && (
    <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
      <WarningIcon className="size-4" />
      Cadastre uma carteira para pagar.{' '}
      <Link to="/carteiras" className="underline">
        Ir para carteiras
      </Link>
    </p>
  )
  const walletSection = wallet && (
    <WalletConnect
      wallet={wallet}
      network={values.network}
      connection={activeConnection}
      onConnectionChange={setConnection}
      variant={isDesktop ? 'list' : 'cards'}
    />
  )
  const alerts = (
    <>
      {walletError && (
        <p role="alert" className="text-sm text-destructive">
          {walletError}
        </p>
      )}
      {blocked && (
        <p role="alert" className="text-sm text-destructive">
          Há itens sem disponibilidade suficiente. <Link to="/carrinho" className="underline">Ajustar carrinho</Link>
        </p>
      )}
    </>
  )
  const canReview = Boolean(quote) && !blocked && Boolean(wallet)
  const reviewDialog = reviewItems && quote && activeConnection && (
    <ReviewDialog
      onClose={() => setReviewItems(null)}
      seenQuote={quote}
      items={reviewItems}
      values={values}
      connection={activeConnection}
      coupon={coupon}
    />
  )

  if (!isDesktop) {
    return (
      <form onSubmit={openReview} noValidate className="mt-6 flex flex-col gap-6 pb-32">
        <section aria-labelledby="connected-title" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="connected-title" className="text-base font-bold">
              Carteira conectada
            </h2>
            <Link to="/carteiras" className="text-sm font-bold text-accent">
              Trocar carteira
            </Link>
          </div>
          {registered.length > 0 ? (
            <WalletCards
              wallets={registered}
              selected={wallet}
              onSelect={(option) => {
                setValue('useSecondary', option.slot === 'secondary')
                setValue('network', option.network)
              }}
            />
          ) : (
            walletMissing
          )}
        </section>

        {walletSection}

        <details
          open={collectorOpen}
          onToggle={(event) => setCollectorOpen(event.currentTarget.open)}
          className="group rounded-[14px] bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-bold [&::-webkit-details-marker]:hidden">
            Dados do colecionador
            <ChevronDownIcon className="size-3 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="flex flex-col gap-4 px-5 pb-5">
            {collectorFields}
            {noteField}
          </div>
        </details>

        {alerts}

        <p className="flex items-center justify-end gap-7 text-base font-bold">
          Total:
          {quotePending || !quote ? <Skeleton className="h-5 w-24" /> : <span className="text-lg text-accent">{formatEth(quote.total)}</span>}
        </p>

        <div className="fixed inset-x-0 bottom-0 z-40 bg-linear-to-t from-background from-70% to-transparent px-7 pt-6 pb-8">
          <Button
            type="submit"
            className="h-[60px] w-full rounded-full bg-linear-to-br from-primary to-primary/80 text-[15px] font-bold"
            disabled={!canReview}
          >
            Revisar e confirmar compra
          </Button>
        </div>
        {reviewDialog}
      </form>
    )
  }

  return (
    <form onSubmit={openReview} noValidate className="mt-6 flex flex-col gap-10 lg:flex-row lg:justify-between">
      <section aria-labelledby="collector-title" className="flex flex-col gap-4 lg:w-[763px]">
        <h2 id="collector-title" className="text-lg font-bold">
          Perfil do colecionador
        </h2>
        {collectorFields}

        <label className="flex items-center gap-2 text-[15px]">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            disabled={!wallets.secondary}
            checked={values.useSecondary}
            onChange={(event) => setValue('useSecondary', event.target.checked)}
          />
          Usar outra carteira?
          {!wallets.secondary && <span className="text-[13px] text-muted-foreground">(cadastre uma carteira secundária)</span>}
        </label>
        {walletMissing}
        {noteField}
      </section>

      <aside aria-labelledby="order-title" className="flex flex-col gap-5 lg:w-[405px] lg:shrink-0">
        <h2 id="order-title" className="text-lg font-bold">
          Seus NFTs
        </h2>
        <div aria-hidden="true" className="-mt-2 hidden justify-between border-b border-primary/30 pb-2 text-[15px] font-bold lg:flex">
          <span>NFTs</span>
          <span>Subtotal</span>
        </div>
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 bg-card pr-3">
              <img src={item.nft.images[0]?.url} alt="" width={70} height={70} className="size-[70px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{item.nft.name}</p>
                <p className="text-sm text-muted-foreground">ID do token: {item.nft.tokenId}</p>
              </div>
              <span className="text-sm text-muted-foreground">(x {item.quantity})</span>
              <span className="font-bold text-accent">{formatEth(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <details className="text-sm">
          <summary className="cursor-pointer text-center">Tem um código promocional? Aplique aqui</summary>
          <div className="mt-3">
            <CouponForm quote={quote} />
          </div>
        </details>
        {quotePending || !quote ? (
          <Skeleton className="h-32" />
        ) : (
          <dl className="flex flex-col gap-3">
            <SummaryRow label="Subtotal" value={formatEth(quote.subtotal)} />
            <SummaryRow label="Desconto do lançamento" value={`(-) ${formatEth(quote.discount)}`} subtle />
            <SummaryRow label="Taxa de rede" value={formatEth(quote.networkFee)} hint="Taxa estimada" />
            <SummaryRow label="Total" value={formatEth(quote.total)} strong />
          </dl>
        )}
        {walletSection}
        {alerts}
        <Button type="submit" className="h-[45px]" disabled={!canReview}>
          Revisar e confirmar compra
        </Button>
      </aside>
      {reviewDialog}
    </form>
  )
}

export function CheckoutView() {
  const router = useRouter()
  const { user } = useSession()
  const userId = user?.id ?? ''
  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(user) })
  const wallets = useQuery({ ...walletsQuery(userId), enabled: Boolean(user) })

  return (
    <>
      {/* Topo mobile do Figma: voltar e título da tela. */}
      <div className="flex items-center gap-6 pt-8 md:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Voltar"
          className="grid size-[35px] shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-surface-raised"
        >
          <ChevronLeftIcon className="h-3" />
        </button>
        <h1 className="text-xl font-bold">Pagamento com carteira</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="mt-6 hidden text-[15px] font-bold md:block">
        <ol className="flex gap-1">
          <li>
            <Link to="/">Início</Link> /
          </li>
          <li>
            <Link to="/carrinho">Carrinho</Link> /
          </li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only hidden md:block">Pagamento</h1>
      {profile.isError || wallets.isError ? (
        <div role="alert" className="mt-8 flex flex-col items-start gap-3">
          Não foi possível carregar seus dados.
          <Button size="sm" onClick={() => void Promise.all([profile.refetch(), wallets.refetch()])}>
            Tentar novamente
          </Button>
        </div>
      ) : profile.data && wallets.data ? (
        <CheckoutFormView key={userId} userId={userId} profile={profile.data} wallets={wallets.data} />
      ) : (
        <Skeleton className="mt-8 h-[600px]" />
      )}
    </>
  )
}
