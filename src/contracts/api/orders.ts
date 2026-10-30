import { z } from 'zod'
import { Eth, Id, IsoDateTime, Network } from '@/contracts/common'
import { Username } from '@/contracts/api/auth'
import { EditionKind } from '@/contracts/api/nfts'
import { WalletSlot, WalletType } from '@/contracts/api/wallets'

/** Cabeçalho obrigatório em POST /orders: a mesma chave recupera o mesmo pedido. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

/** `confirmed` e `rejected` são terminais. */
export const OrderStatus = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof OrderStatus>

export const CollectorDetails = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
  username: Username,
  email: z.email('E-mail inválido'),
  profileName: z.string().trim().min(1, 'Informe o nome do perfil'),
  ensName: z.string().trim().min(1, 'Informe o nome ENS'),
  referralCode: z.string().trim().min(1, 'Informe o código de indicação'),
})
export type CollectorDetails = z.infer<typeof CollectorDetails>

export const CreateOrderInput = z.object({
  quoteId: Id,
  walletSlot: WalletSlot,
  network: Network,
  collector: CollectorDetails,
  note: z.string().trim().max(500).optional(),
})
export type CreateOrderInput = z.infer<typeof CreateOrderInput>

/** Snapshot do item no momento da compra: o recibo não muda com o catálogo. */
export const OrderLine = z.object({
  nftId: Id,
  editionId: Id,
  editionKind: EditionKind,
  name: z.string(),
  tokenId: z.string(),
  imageUrl: z.string(),
  quantity: z.int().min(1),
  unitPrice: Eth,
  lineTotal: Eth,
})
export type OrderLine = z.infer<typeof OrderLine>

export const Order = z.object({
  id: Id,
  status: OrderStatus,
  lines: z.array(OrderLine),
  couponCode: z.string().nullable(),
  subtotal: Eth,
  discount: Eth,
  networkFee: Eth,
  total: Eth,
  network: Network,
  wallet: z.object({ type: WalletType, address: z.string() }),
  /** Presente apenas em pedidos confirmados (referência simulada). */
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  failureReason: z.string().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  /** A mesma dos eventos `order.updated`. */
  version: z.int().min(0),
})
export type Order = z.infer<typeof Order>
