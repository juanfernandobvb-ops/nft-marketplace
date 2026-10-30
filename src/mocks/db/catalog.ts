import {
  Category,
  Network,
  type Edition,
  type Nft,
  type NftListQuery,
  type NftListResponse,
} from '@/contracts'
import { money } from '@/lib/money'
import { getDb, persist } from '@/mocks/db/store'
import { toSummary } from '@/mocks/db/views'
import { NEW_RELEASES_COUNT, TRENDING_MIN_REVIEWS } from '@/mocks/fixtures/nfts'
import { fail } from '@/mocks/handlers/http'
import { publishNftUpdated } from '@/mocks/realtime'

export function findNft(nftId: string): Nft {
  const nft = getDb().nfts.find((candidate) => candidate.id === nftId)
  if (!nft) throw fail.notFound('NFT não encontrado.')
  return nft
}

export function findEdition(nft: Nft, editionId: string): Edition {
  const edition = nft.editions.find((candidate) => candidate.id === editionId)
  if (!edition) throw fail.notFound('Edição não encontrada para este NFT.')
  return edition
}

export { quantityLimit } from '@/contracts'

/** Aplica mudança de preço/disponibilidade, incrementa a versão e emite `nft.updated`. */
export function updateNft(nft: Nft, change: (nft: Nft) => void) {
  change(nft)
  nft.version += 1
  persist()
  publishNftUpdated(nft)
}

function segmentOf(nfts: Nft[], segment: NftListQuery['segment']) {
  if (segment === 'new') {
    return [...nfts].sort((a, b) => b.listedAt.localeCompare(a.listedAt)).slice(0, NEW_RELEASES_COUNT)
  }
  if (segment === 'trending') return nfts.filter((nft) => nft.rating.count >= TRENDING_MIN_REVIEWS)
  return nfts
}

const countBy = <K extends string>(keys: readonly K[], nfts: Nft[], pick: (nft: Nft) => K) =>
  Object.fromEntries(keys.map((key) => [key, nfts.filter((nft) => pick(nft) === key).length])) as Record<K, number>

export function listNfts(query: NftListQuery): NftListResponse {
  const all = getDb().nfts
  const term = query.q?.toLowerCase()
  // Base das contagens: busca + aba, antes dos filtros laterais (as contagens não somem ao filtrar).
  const base = segmentOf(all, query.segment).filter(
    (nft) =>
      !term ||
      nft.name.toLowerCase().includes(term) ||
      nft.collection.toLowerCase().includes(term) ||
      nft.tokenId.includes(term),
  )
  const filtered = base.filter(
    (nft) =>
      (!query.categories?.length || query.categories.includes(nft.category)) &&
      (!query.networks?.length || query.networks.includes(nft.network)) &&
      (!query.minPrice || money.compare(nft.price, query.minPrice) >= 0) &&
      (!query.maxPrice || money.compare(nft.price, query.maxPrice) <= 0),
  )
  const sorted = [...filtered].sort((a, b) => {
    if (query.sort === 'price-asc') return money.compare(a.price, b.price) || a.id.localeCompare(b.id)
    if (query.sort === 'price-desc') return money.compare(b.price, a.price) || a.id.localeCompare(b.id)
    return b.listedAt.localeCompare(a.listedAt)
  })
  const totalPages = Math.ceil(sorted.length / query.pageSize)
  const start = (query.page - 1) * query.pageSize
  const prices = all.map((nft) => nft.price).sort(money.compare)

  return {
    items: sorted.slice(start, start + query.pageSize).map(toSummary),
    page: query.page,
    pageSize: query.pageSize,
    total: sorted.length,
    totalPages,
    facets: {
      categories: countBy(Category.options, base, (nft) => nft.category),
      networks: countBy(Network.options, base, (nft) => nft.network),
      priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
    },
  }
}
