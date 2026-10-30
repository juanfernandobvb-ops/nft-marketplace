import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { WarningIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CartItem, CreateOrderInput, Quote, WalletConnection } from '@/contracts'
import { SummaryRow } from '@/features/cart/components/cart-view'
import { useQuote } from '@/features/cart/use-cart'
import { checkoutDraft, type CheckoutFormValues } from '@/features/checkout/form'
import { useCreateOrder } from '@/features/orders/api'
import { formatEth, NETWORK_LABELS, shortHash, WALLET_LABELS } from '@/lib/format'
import { HttpError } from '@/services/http/errors'

/** Diferença relevante entre a cotação aceita pelo usuário e a atual. */
function changesBetween(accepted: Quote, current: Quote, items: CartItem[]) {
  const name = (nftId: string) => items.find((item) => item.nft.id === nftId)?.nft.name ?? 'Um item'
  const changes: string[] = []
  for (const line of current.lines) {
    const before = accepted.lines.find((candidate) => candidate.nftId === line.nftId && candidate.editionId === line.editionId)
    if (before && before.unitPrice !== line.unitPrice) {
      changes.push(`${name(line.nftId)}: ${formatEth(before.unitPrice)} → ${formatEth(line.unitPrice)}`)
    }
  }
  if (accepted.discount !== current.discount) changes.push(`Desconto: ${formatEth(accepted.discount)} → ${formatEth(current.discount)}`)
  if (accepted.networkFee !== current.networkFee) changes.push(`Taxa de rede: ${formatEth(accepted.networkFee)} → ${formatEth(current.networkFee)}`)
  if (!changes.length && accepted.total !== current.total) changes.push(`Total: ${formatEth(accepted.total)} → ${formatEth(current.total)}`)
  return changes
}

const submitError = (error: unknown) => {
  if (!(error instanceof HttpError)) return 'Não foi possível enviar o pedido.'
  if (error.isRetryable) {
    return 'Não recebemos a confirmação do servidor. Seu pedido pode ter sido registrado: tente novamente, sem risco de compra duplicada.'
  }
  return error.message
}

interface ReviewProps {
  onClose: () => void
  /** Cotação exibida na página quando o usuário pediu a revisão. */
  seenQuote: Quote
  items: CartItem[]
  values: CheckoutFormValues
  connection: WalletConnection
  coupon: string | null
}

export function ReviewDialog({ onClose, seenQuote, items, values, connection, coupon }: ReviewProps) {
  const navigate = useNavigate()
  const lines = items.map(({ nft, edition, quantity }) => ({ nftId: nft.id, editionId: edition.id, quantity }))
  const { data: quote = seenQuote, refetch, isFetching } = useQuote(lines, coupon, values.network)
  const [accepted, setAccepted] = useState(seenQuote)
  const createOrder = useCreateOrder()

  // Montado só quando aberto: revalida preço, disponibilidade, cupom e taxas ao abrir a revisão.
  useEffect(() => {
    void refetch()
  }, [refetch])

  /**
   * Envio com resultado incerto (timeout/rede): o pedido pode já existir no servidor. Até haver resposta
   * definitiva, "Tentar novamente" reenvia exatamente o mesmo conteúdo — mesma cotação, mesma chave de
   * idempotência — mesmo que uma cotação nova chegue nesse meio-tempo. Assim o reenvio nunca cria outra compra.
   */
  const [inDoubt, setInDoubt] = useState<CreateOrderInput | null>(null)

  const changes = changesBetween(accepted, quote, items)
  const outOfStock = quote.issues.some((issue) => issue.type === 'INSUFFICIENT_STOCK')
  const canConfirm = inDoubt
    ? !createOrder.isPending
    : !isFetching && changes.length === 0 && !outOfStock && !createOrder.isPending

  const confirm = () => {
    const input: CreateOrderInput = inDoubt ?? {
      quoteId: quote.id,
      walletSlot: connection.slot,
      network: values.network,
      collector: {
        displayName: values.displayName,
        username: values.username,
        email: values.email,
        profileName: values.profileName,
        ensName: values.ensName,
        referralCode: values.referralCode,
      },
      note: values.note || undefined,
    }
    createOrder.mutate(input, {
      onSuccess: (order) => {
        setInDoubt(null)
        checkoutDraft.clear()
        void navigate({ to: '/pedidos/$orderId', params: { orderId: order.id } })
      },
      onError: (error) => {
        const retryable = error instanceof HttpError && error.isRetryable
        setInDoubt(retryable ? input : null)
        // Preço/estoque mudou no servidor: busca a cotação nova, que exigirá aceite explícito.
        if (error instanceof HttpError && (error.code === 'QUOTE_STALE' || error.code === 'OUT_OF_STOCK')) void refetch()
      },
    })
  }

  const retrying = Boolean(inDoubt)

  return (
    <Dialog open onOpenChange={(next) => !next && !createOrder.isPending && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-border bg-card sm:max-w-[560px]">
        <DialogTitle>Revise seu pedido</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Os valores foram conferidos agora com o mercado. Confirme para enviar o pedido.
        </DialogDescription>

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm [&_dd]:wrap-anywhere">
          <dt className="text-muted-foreground">Colecionador</dt>
          <dd>
            {values.displayName} (@{values.username})
          </dd>
          <dt className="text-muted-foreground">Carteira</dt>
          <dd>
            {WALLET_LABELS[connection.provider]} • {shortHash(connection.address)}
          </dd>
          <dt className="text-muted-foreground">Rede</dt>
          <dd>{NETWORK_LABELS[values.network]}</dd>
        </dl>

        <ul className="flex flex-col gap-2 border-y border-primary/30 py-3 text-sm">
          {quote.lines.map((line) => {
            const item = items.find((candidate) => candidate.nft.id === line.nftId && candidate.edition.id === line.editionId)
            return (
              <li key={`${line.nftId}-${line.editionId}`} className="flex justify-between gap-3">
                <span>
                  {item?.nft.name ?? line.nftId} <span className="text-muted-foreground">(x {line.quantity})</span>
                </span>
                <span className="shrink-0 font-bold text-accent">{formatEth(line.lineTotal)}</span>
              </li>
            )
          })}
        </ul>

        <dl aria-busy={isFetching} className="flex flex-col gap-2">
          <SummaryRow label="Subtotal" value={formatEth(quote.subtotal)} />
          <SummaryRow label="Desconto" value={`(-) ${formatEth(quote.discount)}`} />
          <SummaryRow label="Taxa de rede" value={formatEth(quote.networkFee)} />
          <SummaryRow label="Total" value={formatEth(quote.total)} strong />
        </dl>

        {changes.length > 0 && !inDoubt && (
          <div role="alert" className="flex flex-col gap-2 rounded-md border border-primary/50 bg-primary/10 p-3 text-[13px]">
            <p className="flex items-center gap-2 font-bold">
              <WarningIcon className="size-4" /> Os valores mudaram desde a sua revisão:
            </p>
            <ul className="list-disc pl-5">
              {changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            <Button size="sm" variant="outline" className="self-start" onClick={() => setAccepted(quote)}>
              Aceitar novos valores
            </Button>
          </div>
        )}
        {outOfStock && (
          <p role="alert" className="text-sm text-destructive">
            Um dos itens não tem mais unidades suficientes. Ajuste o carrinho para continuar.
          </p>
        )}
        {createOrder.isError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError(createOrder.error)}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={createOrder.isPending}>
            Voltar
          </Button>
          <Button onClick={confirm} disabled={!canConfirm} className="h-auto min-h-9 whitespace-normal">
            {createOrder.isPending ? 'Enviando pedido...' : retrying ? 'Tentar novamente' : `Confirmar compra • ${formatEth(quote.total)}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
