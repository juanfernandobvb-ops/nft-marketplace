import { useState } from 'react'
import { SearchIcon } from '@/components/icons'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { Nft } from '@/contracts'
import { cn } from '@/lib/utils'

export function NftGallery({ nft }: { nft: Nft }) {
  const [index, setIndex] = useState(0)
  const current = nft.images[index] ?? nft.images[0]!

  return (
    <div className="flex shrink-0 flex-col-reverse gap-4 md:flex-row md:items-center md:gap-7 lg:self-start">
      {/* Miniaturas no desktop; no mobile a troca de imagem é feita pelos indicadores sobre a imagem (Figma). */}
      <ul aria-label="Imagens do NFT" className="hidden md:flex md:flex-col md:gap-4">
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

      <div className="relative mx-3 md:mx-0 md:flex-1 md:rounded-md md:bg-card md:p-4 lg:flex-none">
        <img
          src={current.url}
          alt={current.alt}
          width={404}
          height={404}
          fetchPriority="high"
          className="aspect-square w-full rounded-3xl object-cover lg:w-[404px]"
        />
        {nft.images.length > 1 && (
          <ul aria-label="Imagens do NFT" className="absolute inset-x-0 bottom-[42px] flex justify-center md:hidden">
            {nft.images.map((image, position) => (
              <li key={`${image.url}-${position}`}>
                <button
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-pressed={position === index}
                  aria-label={`Ver imagem ${position + 1} de ${nft.images.length}`}
                  className="grid h-6 min-w-6 cursor-pointer place-items-center"
                >
                  <span
                    className={cn(
                      'block h-[7px] rounded-full bg-primary transition-[width] motion-reduce:transition-none',
                      position === index ? 'w-7' : 'w-[7px]',
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Dialog>
          <DialogTrigger
            aria-label="Ampliar imagem"
            className="absolute top-3 right-3 grid size-[30px] cursor-pointer place-items-center rounded-full border border-border bg-surface-raised md:-top-3 md:-right-3"
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
