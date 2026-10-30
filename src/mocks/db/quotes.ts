import { MAX_QUANTITY_PER_ITEM, type Quote, type QuoteIssue, type QuoteRequest } from '@/contracts'
import { money } from '@/lib/money'
import { findEdition, findNft, updateNft } from '@/mocks/db/catalog'
import { getDb, nextId, persist } from '@/mocks/db/store'
import { COUPONS, NETWORK_FEES, QUOTE_TTL_MS } from '@/mocks/fixtures/commerce'
import { activeScenario } from '@/mocks/scenarios'

function couponFor(code: string | undefined, issues: QuoteIssue[]) {
  if (!code) return null
  const coupon = COUPONS.find((candidate) => candidate.code === code.toUpperCase())
  if (!coupon) {
    issues.push({ type: 'COUPON_INVALID', code })
    return null
  }
  if (coupon.expiresAt <= Date.now()) {
    issues.push({ type: 'COUPON_EXPIRED', code })
    return null
  }
  return coupon
}

export function createQuote(input: QuoteRequest, userId: string | null): Quote {
  const db = getDb()
  const issues: QuoteIssue[] = []
  const lines = input.items.map((item) => {
    const nft = findNft(item.nftId)
    const edition = findEdition(nft, item.editionId)
    const available = Math.min(edition.available ?? MAX_QUANTITY_PER_ITEM, MAX_QUANTITY_PER_ITEM)
    if (item.quantity > available) {
      issues.push({
        type: 'INSUFFICIENT_STOCK',
        nftId: nft.id,
        editionId: edition.id,
        requested: item.quantity,
        available,
      })
    }
    return { ...item, unitPrice: nft.price, lineTotal: money.times(nft.price, item.quantity) }
  })

  const previous = input.previousQuoteId ? db.quotes[input.previousQuoteId]?.quote : undefined
  for (const line of lines) {
    const before = previous?.lines.find((candidate) => candidate.nftId === line.nftId)
    const alreadyReported = issues.some((issue) => issue.type === 'PRICE_CHANGED' && issue.nftId === line.nftId)
    if (before && !money.equals(before.unitPrice, line.unitPrice) && !alreadyReported) {
      issues.push({ type: 'PRICE_CHANGED', nftId: line.nftId, previousPrice: before.unitPrice, currentPrice: line.unitPrice })
    }
  }

  const coupon = couponFor(input.couponCode, issues)
  const subtotal = money.sum(lines.map((line) => line.lineTotal))
  const discount = coupon ? money.percentOf(subtotal, coupon.percentOff) : '0'
  const networkFee = NETWORK_FEES[input.network]
  const now = Date.now()
  const quote: Quote = {
    id: nextId('qt'),
    lines,
    coupon: coupon && { code: coupon.code, description: coupon.description },
    network: input.network,
    subtotal,
    discount,
    networkFee,
    total: money.sum([money.minus(subtotal, discount), networkFee]),
    issues,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
  }
  db.quotes[quote.id] = { quote, userId }
  persist()
  scheduleCheckoutChange(input)
  return quote
}

/** Cenários price-change/sold-out: altera o primeiro item cotado uma única vez, com evento. */
function scheduleCheckoutChange(input: QuoteRequest) {
  const change = activeScenario().checkoutChange
  const db = getDb()
  const target = input.items[0]
  if (!change || db.checkoutChangeDone || !target) return
  db.checkoutChangeDone = true
  persist()
  setTimeout(() => {
    const nft = findNft(target.nftId)
    updateNft(nft, (current) => {
      if (change.type === 'price-change') {
        current.previousPrice = current.price
        current.price = money.round(money.times(current.price, '1.1'), 2)
      } else {
        findEdition(current, target.editionId).available = 0
      }
    })
  }, change.delayMs)
}
