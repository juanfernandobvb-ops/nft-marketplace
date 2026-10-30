import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { CloseIcon, ThankYouIcon, WarningIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { couponStore } from '@/features/cart/coupon-store'
import { orderQuery } from '@/features/orders/api'
import { formatEth, NETWORK_LABELS, shortHash, WALLET_LABELS } from '@/lib/format'
import { HttpError } from '@/services/http/errors'

const EXPLORER_NAMES = { ethereum: 'Etherscan', polygon: 'Polygonscan', solana: 'Solana Explorer' } as const
const EDITION_LABEL = { '1/1': '1/1', '1/10': '1/10', '1/50': '1/50', open: 'Aberta' } as const

/** "29 Out, 2026", como no layout. */
function formatDate(iso: string) {
  const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  const month = part('month').replace('.', '')
  return `${part('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part('year')}`
}

function Panel({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <section aria-label={label} className="relative mx-auto mt-10 w-full max-w-[578px] overflow-hidden bg-card pb-2.5">
      <Link to="/" aria-label="Fechar e voltar ao início" className="absolute top-5 right-5 text-accent">
        <CloseIcon className="size-[18px]" />
      </Link>
      {children}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2.5 bg-primary" />
    </section>
  )
}

function PendingOrder({ order }: { order: Order }) {
  return (
    <Panel label="Pedido em processamento">
      <div className="flex flex-col items-center gap-4 px-8 py-14 text-center" role="status" aria-live="polite">
        <span aria-hidden="true" className="size-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary motion-reduce:animate-none" />
        <h1 className="text-xl font-bold">Processando seu pagamento</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Aguardando a confirmação da rede {NETWORK_LABELS[order.network]}. Você pode recarregar ou sair desta página: o
          pedido <strong>{order.id}</strong> continua sendo processado e não será cobrado duas vezes.
        </p>
      </div>
    </Panel>
  )
}

function RejectedOrder({ order }: { order: Order }) {
  return (
    <Panel label="Pagamento recusado">
      <div className="flex flex-col items-center gap-4 px-8 py-14 text-center" role="alert">
        <WarningIcon className="size-12 text-destructive" />
        <h1 className="text-xl font-bold">Pagamento recusado</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {order.failureReason ?? 'A transação não foi concluída.'} Nenhum valor foi cobrado e seus itens continuam no
          carrinho.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/pagamento">Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/carrinho">Ver carrinho</Link>
          </Button>
        </div>
      </div>
    </Panel>
  )
}

/** Recibo: reproduz o snapshot gravado no pedido, não o catálogo atual. */
function Receipt({ order }: { order: Order }) {
  const meta = [
    { label: 'ID da transação', value: order.transaction ? shortHash(order.transaction.hash) : '—', strong: true },
    { label: 'Data', value: formatDate(order.updatedAt) },
    { label: 'Total', value: formatEth(order.total) },
    { label: 'Carteira', value: WALLET_LABELS[order.wallet.type], strong: true },
  ]
  return (
    <Panel label="Pedido confirmado">
      <header className="flex flex-col items-center gap-4 py-8 text-center">
        <ThankYouIcon className="size-20 text-primary" aria-hidden="true" />
        <h1 className="text-base font-bold text-muted-foreground">Seus NFTs agora estão na sua carteira</h1>
      </header>
      <dl className="grid grid-cols-2 gap-3 border-y border-primary px-6 py-3 text-[15px] text-muted-foreground sm:grid-cols-4 sm:px-9">
        {meta.map((item, index) => (
          <div key={item.label} className={index > 0 ? 'sm:border-l sm:border-primary sm:pl-3' : ''}>
            <dt className={item.strong ? 'text-sm font-bold' : 'text-sm'}>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-3 px-6 pt-5 pb-12 sm:px-11">
        <h2 className="text-[15px] font-bold">Detalhes da transação</h2>
        <table className="w-full text-left">
          <thead className="border-b border-primary/30 text-base">
            <tr>
              <th scope="col" className="pb-2 font-bold">
                NFTs
              </th>
              <th scope="col" className="hidden pb-2 font-bold sm:table-cell">
                Edições
              </th>
              <th scope="col" className="pb-2 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={`${line.nftId}-${line.editionId}`}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <img src={line.imageUrl} alt="" width={66} height={66} className="size-12 shrink-0 rounded-sm object-cover sm:size-[66px]" />
                    <div>
                      <p className="font-bold">{line.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ID do token: {line.tokenId} · {EDITION_LABEL[line.editionKind]}
                      </p>
                      {/* Em telas estreitas a quantidade fica junto do item, sem coluna própria. */}
                      <p className="text-sm text-muted-foreground sm:hidden">(x {line.quantity})</p>
                    </div>
                  </div>
                </td>
                <td className="hidden text-muted-foreground sm:table-cell">(x {line.quantity})</td>
                <td className="text-right text-lg font-bold text-accent">{formatEth(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto grid w-full max-w-[321px] grid-cols-2 gap-2 border-b border-primary/30 pb-3 text-right">
          {order.discount !== '0' && (
            <>
              <dt>Desconto{order.couponCode && ` (${order.couponCode})`}</dt>
              <dd>(-) {formatEth(order.discount)}</dd>
            </>
          )}
          <dt>Taxa de rede</dt>
          <dd className="text-lg">{formatEth(order.networkFee)}</dd>
          <dt className="font-bold">Total</dt>
          <dd className="text-lg font-bold text-accent">{formatEth(order.total)}</dd>
        </dl>
        <p className="mt-4 text-center text-sm leading-[22px] text-muted-foreground">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira
          conectada e registrada na rede.
        </p>
        {order.transaction && (
          <Button asChild className="mt-6 h-12 self-center">
            <a href={order.transaction.explorerUrl} target="_blank" rel="noopener noreferrer">
              Ver no {EXPLORER_NAMES[order.network]}
              <span className="sr-only"> (referência simulada, abre em nova aba)</span>
            </a>
          </Button>
        )}
      </div>
    </Panel>
  )
}

export function OrderView({ orderId }: { orderId: string }) {
  const { user } = useSession()
  const { data: order, isPending, isError, error, refetch } = useQuery({
    ...orderQuery(user?.id ?? '', orderId),
    enabled: Boolean(user),
  })

  // Cupom consumido pela compra confirmada.
  useEffect(() => {
    if (order?.status === 'confirmed') couponStore.set(null)
  }, [order?.status])

  if (isPending) return <Skeleton className="mx-auto mt-10 h-[600px] max-w-[578px]" />
  if (isError) {
    const forbidden = error instanceof HttpError && (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND')
    return (
      <section className="grid min-h-[50dvh] place-content-center justify-items-center gap-4 text-center" role="alert">
        <h1 className="text-2xl font-bold">{forbidden ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        <p className="text-muted-foreground">{forbidden ? 'Este pedido não existe ou pertence a outra conta.' : error.message}</p>
        {!forbidden && <Button onClick={() => void refetch()}>Tentar novamente</Button>}
      </section>
    )
  }
  if (order.status === 'pending') return <PendingOrder order={order} />
  if (order.status === 'rejected') return <RejectedOrder order={order} />
  return <Receipt order={order} />
}
