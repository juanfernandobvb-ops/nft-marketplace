import type { CreateOrderInput, Network, Order } from '@/contracts'
import { money } from '@/lib/money'
import { removePurchased } from '@/mocks/db/cart'
import { findEdition, findNft, quantityLimit, updateNft } from '@/mocks/db/catalog'
import { getDb, nextId, persist } from '@/mocks/db/store'
import type { DbUser } from '@/mocks/db/types'
import { COUPONS } from '@/mocks/fixtures/commerce'
import { fail } from '@/mocks/handlers/http'
import { publishOrderUpdated } from '@/mocks/realtime'
import { activeScenario, randomHex } from '@/mocks/scenarios'

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://sepolia.etherscan.io/tx/',
  polygon: 'https://amoy.polygonscan.com/tx/',
  solana: 'https://explorer.solana.com/tx/',
}

/** Serialização com chaves ordenadas: o mesmo conteúdo gera sempre o mesmo hash de requisição. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/** Revalida a cotação contra o catálogo atual antes de aceitar o pedido. */
function validateQuote(user: DbUser, input: CreateOrderInput) {
  const stored = getDb().quotes[input.quoteId]
  if (!stored || stored.userId !== user.id) throw fail.notFound('Cotação não encontrada.')
  const { quote } = stored
  if (Date.parse(quote.expiresAt) <= Date.now()) throw fail.quoteStale('A cotação expirou. Revise os valores.')
  if (quote.network !== input.network) throw fail.quoteStale('A rede mudou desde a cotação. Revise os valores.')
  if (quote.issues.some((issue) => issue.type === 'INSUFFICIENT_STOCK')) {
    throw fail.outOfStock('Há itens sem disponibilidade suficiente.')
  }
  for (const line of quote.lines) {
    const nft = findNft(line.nftId)
    const edition = findEdition(nft, line.editionId)
    if (!money.equals(nft.price, line.unitPrice)) {
      throw fail.quoteStale(`O preço de ${nft.name} mudou. Revise e confirme novamente.`)
    }
    if (line.quantity > quantityLimit(edition)) {
      throw fail.outOfStock(`A edição ${edition.kind} de ${nft.name} não tem mais unidades suficientes.`)
    }
  }
  const coupon = quote.coupon && COUPONS.find((candidate) => candidate.code === quote.coupon?.code)
  if (coupon && coupon.expiresAt <= Date.now()) throw fail.quoteStale('O cupom expirou. Revise os valores.')
  return quote
}

/**
 * Cria o pedido de forma idempotente: a mesma chave com o mesmo conteúdo devolve o pedido existente;
 * com conteúdo diferente, conflito.
 */
export function createOrder(user: DbUser, input: CreateOrderInput, idempotencyKey: string) {
  const db = getDb()
  const requestHash = stableStringify(input)
  const previous = db.idempotency[idempotencyKey]
  if (previous) {
    if (previous.userId !== user.id || previous.requestHash !== requestHash) {
      throw fail.conflict('Esta chave de idempotência já foi usada com outro conteúdo.')
    }
    const existing = db.orders[previous.orderId]
    if (existing) return { order: settleIfDue(existing.order.id), created: false }
  }

  const quote = validateQuote(user, input)
  const wallet = db.wallets[user.id]?.[input.walletSlot]
  if (!wallet) throw fail.validation({ walletSlot: 'Cadastre esta carteira antes de pagar.' })

  const now = Date.now()
  const order: Order = {
    id: nextId('ord'),
    status: 'pending',
    lines: quote.lines.map((line) => {
      const nft = findNft(line.nftId)
      const edition = findEdition(nft, line.editionId)
      return {
        nftId: nft.id,
        editionId: edition.id,
        editionKind: edition.kind,
        name: nft.name,
        tokenId: nft.tokenId,
        imageUrl: nft.images[0]?.url ?? '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      }
    }),
    couponCode: quote.coupon?.code ?? null,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    network: input.network,
    wallet: { type: wallet.type, address: wallet.address },
    transaction: null,
    failureReason: null,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    version: 1,
  }
  const { payment } = activeScenario()
  db.orders[order.id] = { order, userId: user.id, settleAt: now + payment.delayMs, outcome: payment.outcome }
  db.idempotency[idempotencyKey] = { userId: user.id, requestHash, orderId: order.id }
  persist()
  scheduleSettlement(order.id)
  return { order, created: true }
}

/** Define o resultado do pagamento quando chega a hora; pedidos terminais não mudam mais. */
export function settleIfDue(orderId: string): Order {
  const record = getDb().orders[orderId]
  if (!record) throw fail.notFound('Pedido não encontrado.')
  const { order } = record
  if (order.status !== 'pending' || record.settleAt > Date.now()) return order

  let failureReason = record.outcome === 'reject' ? 'Pagamento recusado pela carteira.' : null
  if (!failureReason) {
    const soldOut = order.lines.find((line) => {
      const edition = findEdition(findNft(line.nftId), line.editionId)
      return line.quantity > quantityLimit(edition)
    })
    if (soldOut) failureReason = `A edição de ${soldOut.name} esgotou durante o pagamento.`
  }

  if (failureReason) {
    order.status = 'rejected'
    order.failureReason = failureReason
  } else {
    for (const line of order.lines) {
      updateNft(findNft(line.nftId), (nft) => {
        const edition = findEdition(nft, line.editionId)
        if (edition.available !== null) edition.available -= line.quantity
      })
    }
    removePurchased(record.userId, order.lines)
    const hash = `0x${randomHex(64)}`
    order.status = 'confirmed'
    order.transaction = { hash, explorerUrl: `${EXPLORERS[order.network]}${hash}` }
  }
  order.version += 1
  order.updatedAt = new Date().toISOString()
  persist()
  publishOrderUpdated(order, record.userId)
  return order
}

export function scheduleSettlement(orderId: string) {
  const record = getDb().orders[orderId]
  if (!record || record.order.status !== 'pending') return
  setTimeout(() => settleIfDue(orderId), Math.max(0, record.settleAt - Date.now()))
}

/** Após refresh, retoma os pedidos que ainda estavam pendentes. */
export function resumePendingOrders() {
  for (const orderId of Object.keys(getDb().orders)) scheduleSettlement(orderId)
}

export function orderFor(user: DbUser, orderId: string): Order {
  const record = getDb().orders[orderId]
  if (!record) throw fail.notFound('Pedido não encontrado.')
  if (record.userId !== user.id) throw fail.forbidden()
  return settleIfDue(orderId)
}
