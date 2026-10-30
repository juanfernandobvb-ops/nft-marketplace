import { z } from 'zod'
import { Eth, Id, IsoDateTime, Network, paginated } from '@/contracts/common'

export const Category = z.enum([
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
])
export type Category = z.infer<typeof Category>

export const EditionKind = z.enum(['1/1', '1/10', '1/50', 'open'])
export type EditionKind = z.infer<typeof EditionKind>

export const Edition = z.object({
  id: Id,
  kind: EditionKind,
  /** `null` na edição aberta. */
  supply: z.int().positive().nullable(),
  /** Unidades restantes; `null` quando ilimitada. */
  available: z.int().min(0).nullable(),
})
export type Edition = z.infer<typeof Edition>

export const NftImage = z.object({ url: z.string(), alt: z.string() })

export const Nft = z.object({
  id: Id,
  tokenId: z.string(),
  name: z.string(),
  description: z.string(),
  collection: z.string(),
  category: Category,
  network: Network,
  price: Eth,
  /** Preço anterior exibido riscado no catálogo. */
  previousPrice: Eth.nullable(),
  images: z.array(NftImage).min(1),
  attributes: z.array(z.string()),
  contractAddress: z.string(),
  royaltyPercent: z.number().min(0).max(100),
  rating: z.object({ average: z.number().min(0).max(5), count: z.int().min(0) }),
  editions: z.array(Edition).min(1),
  listedAt: IsoDateTime,
  /** Incrementada a cada mudança de preço ou disponibilidade; a mesma dos eventos `nft.updated`. */
  version: z.int().min(0),
})
export type Nft = z.infer<typeof Nft>

export const NftSummary = Nft.pick({
  id: true,
  tokenId: true,
  name: true,
  category: true,
  network: true,
  price: true,
  previousPrice: true,
  images: true,
  version: true,
})
export type NftSummary = z.infer<typeof NftSummary>

export const NftSegment = z.enum(['all', 'new', 'trending'])
export const NftSort = z.enum(['recent', 'price-asc', 'price-desc'])

/** Aceita valor único ou repetido na query string (`?network=a&network=b`). */
const listParam = <T extends z.ZodType>(item: T) =>
  z.preprocess((value) => (value === undefined || Array.isArray(value) ? value : [value]), z.array(item))

/** Compartilhado entre os search params da rota e a query enviada à API. */
export const NftListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  segment: NftSegment.default('all'),
  categories: listParam(Category).optional(),
  networks: listParam(Network).optional(),
  minPrice: Eth.optional(),
  maxPrice: Eth.optional(),
  sort: NftSort.default('recent'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(9),
})
export type NftListQuery = z.infer<typeof NftListQuery>

export const NftListResponse = paginated(NftSummary).extend({
  /** Contagens exibidas ao lado de cada filtro. */
  facets: z.object({
    categories: z.record(Category, z.int().min(0)),
    networks: z.record(Network, z.int().min(0)),
    priceRange: z.object({ min: Eth, max: Eth }),
  }),
})
export type NftListResponse = z.infer<typeof NftListResponse>
