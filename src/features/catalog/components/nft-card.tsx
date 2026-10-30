import { Link } from '@tanstack/react-router'
import { HeartFilledIcon, HeartIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftSummary } from '@/contracts'
import { useFavoriteToggle } from '@/features/favorites/api'
import { formatEth } from '@/lib/format'
import { cn } from '@/lib/utils'

function FavoriteButton({ nft, favorite }: { nft: NftSummary; favorite: boolean }) {
  const favorites = useFavoriteToggle()
  const onClick = () => favorites.toggle(nft)

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorite}
      aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
      className="absolute top-3 right-3 grid size-8 cursor-pointer place-items-center rounded-full bg-card/90 text-accent md:hidden"
    >
      {favorite ? <HeartFilledIcon className="size-4" /> : <HeartIcon className="size-4" />}
    </button>
  )
}

export function NftCard({ nft, favorite, priority }: { nft: NftSummary; favorite: boolean; priority?: boolean }) {
  const image = nft.images[0]
  return (
    <article className="relative flex flex-col gap-3">
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="group flex flex-col gap-3 rounded-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="rounded-xl bg-card px-1 py-6 md:rounded-none">
          <img
            src={image?.url}
            alt={image?.alt ?? nft.name}
            width={250}
            height={250}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="aspect-square w-full rounded-[15px] object-cover transition-transform group-hover:scale-[1.02]"
          />
        </div>
        <h3 className="text-base leading-4">{nft.name}</h3>
      </Link>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg leading-4 font-bold whitespace-nowrap text-accent">
        <span>{formatEth(nft.price)}</span>
        {nft.previousPrice && (
          <span className="font-normal text-secondary line-through">
            <span className="sr-only">Preço anterior: </span>
            {formatEth(nft.previousPrice)}
          </span>
        )}
      </p>
      <FavoriteButton nft={nft} favorite={favorite} />
    </article>
  )
}

/** Mesmas dimensões do card real: o carregamento não desloca o layout. */
export function NftCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="rounded-xl bg-card px-1 py-6 md:rounded-none">
        <Skeleton className="aspect-square w-full rounded-[15px]" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  )
}
