import { z } from 'zod'
import { Eth, Id, IsoDateTime } from '@/contracts/common'
import { Edition } from '@/contracts/api/nfts'
import { OrderStatus } from '@/contracts/api/orders'

export const EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/**
 * Envelope comum: `id` permite descartar duplicatas, `version` descarta eventos antigos
 * e `userId` restringe eventos privados à sessão do dono (`null` = público).
 */
const envelope = <T extends string, R extends string, D extends z.ZodType>(type: T, resource: R, data: D) =>
  z.object({
    id: Id,
    type: z.literal(type),
    resource: z.object({ type: z.literal(resource), id: Id }),
    version: z.int().min(0),
    userId: Id.nullable(),
    occurredAt: IsoDateTime,
    data,
  })

export const NftUpdatedEvent = envelope(
  EVENTS.nftUpdated,
  'nft',
  z.object({
    price: Eth,
    previousPrice: Eth.nullable(),
    editions: z.array(Edition.pick({ id: true, available: true })),
  }),
)
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEvent>

export const OrderUpdatedEvent = envelope(
  EVENTS.orderUpdated,
  'order',
  z.object({
    status: OrderStatus,
    transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
    failureReason: z.string().nullable(),
  }),
)
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEvent>

export const RealtimeEvent = z.discriminatedUnion('type', [NftUpdatedEvent, OrderUpdatedEvent])
export type RealtimeEvent = z.infer<typeof RealtimeEvent>
