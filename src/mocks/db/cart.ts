import type { Cart, CartLineInput, OrderLine } from '@/contracts'
import { money } from '@/lib/money'
import { findEdition, findNft, quantityLimit } from '@/mocks/db/catalog'
import { getDb, nextId, persist } from '@/mocks/db/store'
import type { DbCart, DbCartLine } from '@/mocks/db/types'
import { toSummary } from '@/mocks/db/views'
import { fail } from '@/mocks/handlers/http'

export function cartOf(userId: string): DbCart {
  const db = getDb()
  db.carts[userId] ??= { lines: [], updatedAt: Date.now() }
  return db.carts[userId]
}

/** Resolve linhas com o catálogo atual; itens que deixaram de existir são omitidos. */
export function toCartView(lines: DbCartLine[], updatedAt: number): Cart {
  const items = lines.flatMap((line) => {
    const nft = getDb().nfts.find((candidate) => candidate.id === line.nftId)
    const edition = nft?.editions.find((candidate) => candidate.id === line.editionId)
    if (!nft || !edition) return []
    return [
      {
        id: line.id,
        nft: toSummary(nft),
        edition,
        quantity: line.quantity,
        unitPrice: nft.price,
        lineTotal: money.times(nft.price, line.quantity),
      },
    ]
  })
  return {
    items,
    subtotal: money.sum(items.map((item) => item.lineTotal)),
    updatedAt: new Date(updatedAt).toISOString(),
  }
}

function assertWithinLimit(input: CartLineInput) {
  const nft = findNft(input.nftId)
  const edition = findEdition(nft, input.editionId)
  const limit = quantityLimit(edition)
  if (limit === 0) throw fail.outOfStock(`A edição ${edition.kind} de ${nft.name} está esgotada.`)
  if (input.quantity > limit) {
    throw fail.outOfStock(`Restam apenas ${limit} unidade(s) da edição ${edition.kind} de ${nft.name}.`)
  }
}

function touch(cart: DbCart) {
  cart.updatedAt = Date.now()
  persist()
}

export function addLine(userId: string, input: CartLineInput) {
  const cart = cartOf(userId)
  const existing = cart.lines.find((line) => line.nftId === input.nftId && line.editionId === input.editionId)
  const quantity = (existing?.quantity ?? 0) + input.quantity
  assertWithinLimit({ ...input, quantity })
  if (existing) existing.quantity = quantity
  else cart.lines.push({ id: nextId('cli'), ...input })
  touch(cart)
  return cart
}

function findLine(cart: DbCart, itemId: string) {
  const line = cart.lines.find((candidate) => candidate.id === itemId)
  if (!line) throw fail.notFound('Item não está no carrinho.')
  return line
}

export function setLineQuantity(userId: string, itemId: string, quantity: number) {
  const cart = cartOf(userId)
  const line = findLine(cart, itemId)
  assertWithinLimit({ nftId: line.nftId, editionId: line.editionId, quantity })
  line.quantity = quantity
  touch(cart)
  return cart
}

export function removeLine(userId: string, itemId: string) {
  const cart = cartOf(userId)
  findLine(cart, itemId)
  cart.lines = cart.lines.filter((line) => line.id !== itemId)
  touch(cart)
  return cart
}

/** Soma os itens do visitante ao carrinho da conta, limitando ao disponível em vez de falhar. */
export function mergeLines(userId: string, items: CartLineInput[]) {
  const cart = cartOf(userId)
  for (const item of items) {
    const nft = getDb().nfts.find((candidate) => candidate.id === item.nftId)
    const edition = nft?.editions.find((candidate) => candidate.id === item.editionId)
    if (!edition) continue
    const existing = cart.lines.find((line) => line.nftId === item.nftId && line.editionId === item.editionId)
    const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, quantityLimit(edition))
    if (quantity <= 0) continue
    if (existing) existing.quantity = quantity
    else cart.lines.push({ id: nextId('cli'), ...item, quantity })
  }
  touch(cart)
  return cart
}

/** Após confirmação, retira apenas os itens e quantidades comprados. */
export function removePurchased(userId: string, purchased: OrderLine[]) {
  const cart = cartOf(userId)
  for (const bought of purchased) {
    const line = cart.lines.find((item) => item.nftId === bought.nftId && item.editionId === bought.editionId)
    if (line) line.quantity -= bought.quantity
  }
  cart.lines = cart.lines.filter((line) => line.quantity > 0)
  touch(cart)
}

/** Carrinho do visitante resolvido sem persistir; ids derivados de NFT + edição. */
export function previewLines(items: CartLineInput[]): Cart {
  return toCartView(
    items.map((item) => ({ id: `guest:${item.nftId}:${item.editionId}`, ...item })),
    Date.now(),
  )
}
