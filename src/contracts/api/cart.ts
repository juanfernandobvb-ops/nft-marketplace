import { z } from 'zod'
import { Eth, Id, IsoDateTime } from '@/contracts/common'
import { Edition, NftSummary } from '@/contracts/api/nfts'

/** Teto por item; edições limitadas também respeitam `edition.available`. */
export const MAX_QUANTITY_PER_ITEM = 10

/** Máximo que pode ser comprado de uma edição em um item (0 = esgotada). */
export function quantityLimit(edition: Pick<Edition, 'available'>) {
  return Math.min(edition.available ?? MAX_QUANTITY_PER_ITEM, MAX_QUANTITY_PER_ITEM)
}

export const CartLineInput = z.object({
  nftId: Id,
  editionId: Id,
  quantity: z.int().min(1),
})
export type CartLineInput = z.infer<typeof CartLineInput>

export const CartItem = z.object({
  id: Id,
  nft: NftSummary,
  edition: Edition,
  quantity: z.int().min(1),
  unitPrice: Eth,
  lineTotal: Eth,
})
export type CartItem = z.infer<typeof CartItem>

export const Cart = z.object({
  items: z.array(CartItem),
  subtotal: Eth,
  updatedAt: IsoDateTime,
})
export type Cart = z.infer<typeof Cart>

export const UpdateCartItemInput = z.object({ quantity: z.int().min(1) })
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInput>

/** Itens do visitante: somados ao carrinho da conta (merge) ou apenas resolvidos (preview). */
export const CartLinesInput = z.object({ items: z.array(CartLineInput) })
export type CartLinesInput = z.infer<typeof CartLinesInput>

/** Carrinho do visitante persistido no navegador. */
export const GuestCart = z.array(CartLineInput)
export type GuestCart = z.infer<typeof GuestCart>
