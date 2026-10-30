import type { Category, Edition, EditionKind, Network, Nft } from '@/contracts'
import apeEmerald from '@/assets/images/ape-emerald.webp'
import apeGolden from '@/assets/images/ape-golden.webp'
import apeIvory from '@/assets/images/ape-ivory.webp'
import apeSage from '@/assets/images/ape-sage.webp'
import { createRandom } from '@/mocks/random'

const ARTWORKS = { emerald: apeEmerald, sage: apeSage, ivory: apeIvory, golden: apeGolden } as const
type Artwork = keyof typeof ARTWORKS
const ARTWORK_ORDER: Artwork[] = ['emerald', 'sage', 'ivory', 'golden']

const CATEGORIES: Category[] = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
]
const NETWORKS: Network[] = ['ethereum', 'ethereum', 'polygon', 'solana']
const COLLECTIONS = ['Kurio Apes', 'Kurio Editions', 'Nomad Club', 'Golden Frequencies']
const ATTRIBUTES = ['Óculos', 'Esmeralda', 'Raro', 'Capuz', 'Fones', 'Jaqueta', 'Lendário', 'Animado', 'Comum', 'Dourado']
const EDITION_SETS: EditionKind[][] = [
  ['1/1', '1/10', '1/50', 'open'],
  ['1/10', '1/50'],
  ['1/1'],
  ['1/50', 'open'],
  ['open'],
  ['1/1', '1/10'],
]
const SUPPLY: Record<EditionKind, number | null> = { '1/1': 1, '1/10': 10, '1/50': 50, open: null }

/** NFTs desenhados no Figma, com os mesmos nomes, preços e artes. */
const FEATURED: { name: string; token: string; price: string; previousPrice?: string; art: Artwork }[] = [
  { name: 'Emerald Ape', token: '042', price: '1.19', art: 'emerald' },
  { name: 'Sage Nomad', token: '009', price: '1.69', art: 'sage' },
  { name: 'Neon Vessel', token: '552', price: '1.99', previousPrice: '2.29', art: 'ivory' },
  { name: 'Cosmic Bloom', token: '118', price: '1.29', art: 'sage' },
  { name: 'Violet Nomad', token: '314', price: '1.39', art: 'sage' },
  { name: 'Ivory Baron', token: '088', price: '1.79', art: 'ivory' },
  { name: 'Golden Beat', token: '207', price: '0.99', art: 'golden' },
  { name: 'Golden Signal', token: '160', price: '0.39', art: 'golden' },
]
const ADJECTIVES = ['Amber', 'Crimson', 'Lunar', 'Solar', 'Velvet', 'Onyx', 'Copper', 'Jade', 'Silent', 'Royal', 'Misty', 'Coral']
const NOUNS = ['Ape', 'Nomad', 'Baron', 'Beat', 'Signal', 'Vessel', 'Bloom', 'Drifter', 'Monk', 'Pilot', 'Scout']

const TOTAL = 40
const NEWEST_LISTING = Date.parse('2026-10-20T15:00:00Z')

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export function createNftFixtures(): Nft[] {
  const random = createRandom(42)
  const usedNames = new Set(FEATURED.map((nft) => `${nft.name} #${nft.token}`))

  return Array.from({ length: TOTAL }, (_, index) => {
    const featured = FEATURED[index]
    let name: string
    let token: string
    let art: Artwork
    if (featured) {
      ;({ name, token, art } = featured)
    } else {
      do {
        name = `${random.pick(ADJECTIVES)} ${random.pick(NOUNS)}`
        token = String(random.int(1, 999)).padStart(3, '0')
      } while (usedNames.has(`${name} #${token}`))
      usedNames.add(`${name} #${token}`)
      art = random.pick(ARTWORK_ORDER)
    }

    const fullName = `${name} #${token}`
    const id = slug(fullName)
    const isEmerald = index === 0
    const price = featured?.price ?? (random.int(2, 1230) / 100).toFixed(2)
    const previousPrice =
      featured?.previousPrice ?? (!featured && random.next() < 0.25 ? (Number(price) * 1.15).toFixed(2) : null)
    const editionKinds = isEmerald ? EDITION_SETS[0]! : random.pick(EDITION_SETS)
    const editions: Edition[] = editionKinds.map((kind) => {
      const supply = SUPPLY[kind]
      // A edição 1/1 do Emerald Ape vem esgotada para exercitar "edição indisponível".
      const available = supply === null ? null : isEmerald && kind === '1/1' ? 0 : random.int(0, supply)
      return { id: `${id}-${kind.replace('/', 'of')}`, kind, supply, available }
    })
    const artIndex = ARTWORK_ORDER.indexOf(art)
    const collection = isEmerald ? 'Kurio Apes' : random.pick(COLLECTIONS)

    return {
      id,
      tokenId: `#${token.padStart(4, '0')}`,
      name: fullName,
      description:
        `${fullName} é uma obra digital finalizada à mão da coleção ${collection}. ` +
        'Cada atributo fica armazenado nos metadados do token e verificado na rede.',
      collection,
      category: isEmerald ? 'digital-art' : CATEGORIES[index % CATEGORIES.length]!,
      network: isEmerald ? 'ethereum' : random.pick(NETWORKS),
      price,
      previousPrice,
      images: [0, 1, 2, 3].map((offset) => {
        const key = ARTWORK_ORDER[(artIndex + offset) % ARTWORK_ORDER.length]!
        return { url: ARTWORKS[key], alt: `${fullName}, imagem ${offset + 1} de 4` }
      }),
      attributes: isEmerald
        ? ['Óculos', 'Esmeralda', 'Raro']
        : [random.pick(ATTRIBUTES), random.pick(ATTRIBUTES)].filter((value, i, all) => all.indexOf(value) === i),
      contractAddress: isEmerald ? `0x7A42${random.hex(32)}19E8` : `0x${random.hex(40)}`,
      royaltyPercent: isEmerald ? 5 : random.int(2, 10),
      rating: isEmerald
        ? { average: 4.8, count: 19 }
        : { average: random.int(30, 50) / 10, count: random.int(0, 40) },
      editions,
      listedAt: new Date(NEWEST_LISTING - index * 11 * 3_600_000).toISOString(),
      version: 1,
    }
  })
}

/** Regras de segmento do catálogo (abas "Novos lançamentos" e "Em alta"). */
export const NEW_RELEASES_COUNT = 12
export const TRENDING_MIN_REVIEWS = 15
