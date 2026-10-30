import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { WarningIcon } from '@/components/icons'
import { inputClass, RequiredMark, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Network, type CartItem, type Profile, type Wallets, type WalletConnection } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { CouponForm, SummaryRow } from '@/features/cart/components/cart-view'
import { useCoupon } from '@/features/cart/coupon-store'
import { useCart, useQuote } from '@/features/cart/use-cart'
import { ReviewDialog } from '@/features/checkout/components/review-dialog'
import { WalletConnect } from '@/features/checkout/components/wallet-connect'
import { CheckoutForm, checkoutDraft, type CheckoutFormValues } from '@/features/checkout/form'
import { profileQuery } from '@/features/profile/api'
import { walletsQuery } from '@/features/wallets/api'
import { formatEth, NETWORK_LABELS, WALLET_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'

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

function CheckoutFormView({ userId, profile, wallets }: { userId: string; profile: Profile; wallets: Wallets }) {
  const cart = useCart()
  const coupon = useCoupon()
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  /** Itens congelados ao abrir a revisão: o carrinho pode mudar (ex.: pedido confirmado) enquanto o diálogo está aberto. */
  const [reviewItems, setReviewItems] = useState<CartItem[] | null>(null)
  const [walletError, setWalletError] = useState('')

  const { register, handleSubmit, control, formState, setValue } = useForm<CheckoutFormValues>({
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
  const items = cart.cart?.items ?? []
  const lines = items.map(({ nft, edition, quantity }) => ({ nftId: nft.id, editionId: edition.id, quantity }))
  const { data: quote, isPending: quotePending } = useQuote(lines, coupon, values.network)
  const blocked = Boolean(quote?.issues.some((issue) => issue.type === 'INSUFFICIENT_STOCK'))

  // Trocar de rede ou de carteira invalida a conexão atual: é preciso conectar de novo.
  const activeConnection =
    connection && connection.network === values.network && connection.slot === wallet?.slot ? connection : null

  const openReview = handleSubmit(() => {
    if (!activeConnection) {
      setWalletError('Conecte a carteira antes de revisar o pedido.')
      document.getElementById('wallet-title')?.scrollIntoView({ block: 'center' })
      return
    }
    setWalletError('')
    setReviewItems(items)
  })

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
  return (
    <form onSubmit={openReview} noValidate className="mt-6 flex flex-col gap-10 lg:flex-row lg:justify-between">
      <section aria-labelledby="collector-title" className="flex flex-col gap-4 lg:w-[763px]">
        <h2 id="collector-title" className="text-lg font-bold">
          Perfil do colecionador
        </h2>
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
        {!wallet && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <WarningIcon className="size-4" />
            Cadastre uma carteira para pagar.{' '}
            <Link to="/carteiras" className="underline">
              Ir para carteiras
            </Link>
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="checkout-note" className="text-[15px]">
            Observação do colecionador (opcional)
          </label>
          <textarea
            id="checkout-note"
            rows={6}
            className="max-w-[350px] rounded-[5px] border border-border bg-transparent p-3 text-sm focus:border-primary focus:outline-none"
            {...register('note')}
          />
          {errors.note && <p className="text-[13px] text-destructive">{errors.note.message}</p>}
        </div>
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
        {wallet && (
          <WalletConnect wallet={wallet} network={values.network} connection={activeConnection} onConnectionChange={setConnection} />
        )}
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
        <Button type="submit" className="h-[45px]" disabled={!quote || blocked || !wallet}>
          Revisar e confirmar compra
        </Button>
      </aside>

      {reviewItems && quote && activeConnection && (
        <ReviewDialog
          onClose={() => setReviewItems(null)}
          seenQuote={quote}
          items={reviewItems}
          values={values}
          connection={activeConnection}
          coupon={coupon}
        />
      )}
    </form>
  )
}

export function CheckoutView() {
  const { user } = useSession()
  const userId = user?.id ?? ''
  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(user) })
  const wallets = useQuery({ ...walletsQuery(userId), enabled: Boolean(user) })

  return (
    <>
      <nav aria-label="Trilha de navegação" className="mt-6 text-[15px] font-bold">
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
      <h1 className="sr-only">Pagamento</h1>
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
