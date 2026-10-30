import { useState } from 'react'
import { SearchIcon } from '@/components/icons'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Nft } from '@/contracts'
import { cn } from '@/lib/utils'

export function NftGallery({ nft }: { nft: Nft }) {
  const [index, setIndex] = useState(0)
  const current = nft.images[index] ?? nft.images[0]!

  return (
    <div className="flex shrink-0 flex-col-reverse gap-4 md:flex-row md:items-center md:gap-7">
      <ul aria-label="Imagens do NFT" className="flex gap-3 md:flex-col md:gap-4">
        {nft.images.map((image, position) => (
          <li key={`${image.url}-${position}`}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-pressed={position === index}
              aria-label={`Ver imagem ${position + 1} de ${nft.images.length}`}
              className={cn(
                'block size-16 cursor-pointer overflow-hidden rounded-lg border md:size-[100px]',
                position === index ? 'border-primary' : 'border-transparent',
              )}
            >
              <img src={image.url} alt="" width={100} height={100} loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative rounded-md bg-card p-4 md:flex-1 lg:flex-none">
        <img
          src={current.url}
          alt={current.alt}
          width={404}
          height={404}
          fetchPriority="high"
          className="aspect-square w-full rounded-3xl object-cover lg:w-[404px]"
        />
        <Dialog>
          <DialogTrigger
            aria-label="Ampliar imagem"
            className="absolute top-6 right-6 grid size-[30px] md:-top-3 md:-right-3 cursor-pointer place-items-center rounded-full border border-border bg-surface-raised"
          >
            <SearchIcon className="size-4" />
          </DialogTrigger>
          <DialogContent className="max-w-[min(90vw,720px)] border-border bg-card p-4 sm:max-w-[min(90vw,720px)]">
            <DialogTitle>{nft.name}</DialogTitle>
            <DialogDescription className="sr-only">Imagem ampliada do NFT</DialogDescription>
            <img src={current.url} alt={current.alt} width={800} height={800} className="aspect-square w-full rounded-2xl object-cover" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
