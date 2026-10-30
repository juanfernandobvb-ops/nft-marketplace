import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import type { NftListQuery } from '@/contracts'
import { nftListQuery } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavoriteIds } from '@/features/favorites/api'

/** Faixa horizontal de NFTs (relacionados / "também viram"). */
export function NftRail({ title, query, excludeIds = [] }: { title: string; query: NftListQuery; excludeIds?: string[] }) {
  const titleId = useId()
  const favoriteIds = useFavoriteIds()
  const { data, isPending } = useQuery(nftListQuery(query))
  const items = data?.items.filter((item) => !excludeIds.includes(item.id)).slice(0, 5)
  if (items && items.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="mt-16 flex flex-col gap-8 md:mt-24">
      <h2 id={titleId} className="border-b border-primary/30 pb-3 text-[17px] leading-4 font-bold text-accent">
        {title}
      </h2>
      <ul className="flex snap-x gap-7 overflow-x-auto pb-2 [&>li]:w-[45%] [&>li]:shrink-0 [&>li]:snap-start md:[&>li]:w-[219px] lg:[&>li]:flex-1">
        {isPending || !items
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index}>
                <NftCardSkeleton />
              </li>
            ))
          : items.map((item) => (
              <li key={item.id}>
                <NftCard nft={item} favorite={favoriteIds.has(item.id)} />
              </li>
            ))}
      </ul>
    </section>
  )
}
