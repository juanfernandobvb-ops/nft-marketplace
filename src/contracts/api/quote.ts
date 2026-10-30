import { z } from 'zod'
import { Eth, Id, IsoDateTime, Network } from '@/contracts/common'
import { CartLineInput } from '@/contracts/api/cart'

/** Recebe os itens explicitamente para cotar tanto o carrinho do visitante quanto o da conta. */
export const QuoteRequest = z.object({
  items: z.array(CartLineInput).min(1),
  couponCode: z.string().trim().min(1).optional(),
  network: Network.default('ethereum'),
  /** Cotação que o usuário viu por último: base para apontar PRICE_CHANGED. */
  previousQuoteId: Id.optional(),
})
export type QuoteRequest = z.infer<typeof QuoteRequest>

export const QuoteIssue = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PRICE_CHANGED'),
    nftId: Id,
    previousPrice: Eth,
    currentPrice: Eth,
  }),
  z.object({
    type: z.literal('INSUFFICIENT_STOCK'),
    nftId: Id,
    editionId: Id,
    requested: z.int().min(1),
    available: z.int().min(0),
  }),
  z.object({ type: z.literal('COUPON_INVALID'), code: z.string() }),
  z.object({ type: z.literal('COUPON_EXPIRED'), code: z.string() }),
])
export type QuoteIssue = z.infer<typeof QuoteIssue>

export const QuoteLine = CartLineInput.extend({
  unitPrice: Eth,
  lineTotal: Eth,
})
export type QuoteLine = z.infer<typeof QuoteLine>

export const Quote = z.object({
  id: Id,
  lines: z.array(QuoteLine),
  coupon: z.object({ code: z.string(), description: z.string() }).nullable(),
  network: Network,
  subtotal: Eth,
  discount: Eth,
  networkFee: Eth,
  total: Eth,
  /**
   * Divergências encontradas. PRICE_CHANGED e cupom são informativos (os valores já refletem a mudança
   * e exigem nova confirmação); INSUFFICIENT_STOCK impede o pedido.
   */
  issues: z.array(QuoteIssue),
  createdAt: IsoDateTime,
  expiresAt: IsoDateTime,
})
export type Quote = z.infer<typeof Quote>
