import { useQuery } from '@tanstack/react-query'
import { useState, type ChangeEvent } from 'react'
import { FilterIcon, SearchIcon, WarningIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { NftListQuery } from '@/contracts'
import { nftListQuery } from '@/features/catalog/api'
import { CatalogFilters } from '@/features/catalog/components/catalog-filters'
import { CatalogPagination } from '@/features/catalog/components/catalog-pagination'
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar'
import { FeaturedBanner } from '@/features/catalog/components/editorial'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavoriteIds } from '@/features/favorites/api'
import { cn } from '@/lib/utils'

export type CatalogChange = (patch: Partial<NftListQuery>, options?: { replace?: boolean }) => void

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-[72px] max-md:[&>*:nth-child(even)]:mt-8'
const SEARCH_DEBOUNCE_MS = 350

/** Busca do layout mobile: atualiza a URL após uma pausa na digitação. */
export function MobileCatalogSearch({
  search,
  onChange,
  onOpenFilters,
}: {
  search: NftListQuery
  onChange: CatalogChange
  onOpenFilters: () => void
}) {
  const [timer, setTimer] = useState<number>()
  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const q = event.target.value.trim()
    window.clearTimeout(timer)
    setTimer(window.setTimeout(() => onChange({ q: q || undefined }, { replace: true }), SEARCH_DEBOUNCE_MS))
  }
  return (
    <div className="flex gap-2 pt-10 md:hidden" role="search">
      <label className="flex h-[45px] flex-1 items-center gap-3 rounded-lg bg-card px-4">
        <SearchIcon className="size-5 shrink-0 text-muted-foreground" />
        <span className="sr-only">Buscar NFTs</span>
        <input
          key={search.q ?? ''}
          type="search"
          defaultValue={search.q}
          onChange={onInput}
          placeholder="Explorar coleções"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium placeholder:text-muted-foreground"
        />
      </label>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-label="Abrir filtros"
        className="grid size-[45px] cursor-pointer place-items-center rounded-lg bg-linear-to-br from-accent to-primary text-primary-foreground"
      >
        <FilterIcon className="size-5" />
      </button>
    </div>
  )
}

function CatalogMessage({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[356px] flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}

export function CatalogSection({
  search,
  onChange,
  filtersOpen,
  onFiltersOpenChange,
}: {
  search: NftListQuery
  onChange: CatalogChange
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
}) {
  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } = useQuery(nftListQuery(search))
  const favoriteIds = useFavoriteIds()
  const activeFilters =
    (search.categories?.length ?? 0) + (search.networks?.length ?? 0) + (search.minPrice || search.maxPrice ? 1 : 0)
  const clearFilters = () =>
    onChange({ q: undefined, categories: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined, segment: 'all' })

  const changePage = (page: number) => {
    onChange({ page })
    document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
  }

  const status = isPending
    ? 'Carregando NFTs...'
    : isError && !data
      ? 'Não foi possível carregar os NFTs.'
      : `${data?.total ?? 0} NFTs encontrados${isFetching ? ', atualizando...' : ''}`

  let content: React.ReactNode
  if (isPending) {
    content = (
      <div className={GRID}>
        {Array.from({ length: search.pageSize }, (_, index) => (
          <NftCardSkeleton key={index} />
        ))}
      </div>
    )
  } else if (isError && !data) {
    content = (
      <CatalogMessage
        title="Não foi possível carregar o catálogo"
        text={error.message}
        action={
          <Button size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        }
      />
    )
  } else if (data.items.length === 0) {
    content = (
      <CatalogMessage
        title="Nenhum NFT encontrado"
        text="Ajuste a busca ou os filtros para ver outros resultados."
        action={
          activeFilters > 0 || search.q ? (
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          ) : undefined
        }
      />
    )
  } else {
    content = (
      <ul aria-busy={isFetching} className={cn(GRID, 'transition-opacity', isPlaceholderData && 'opacity-60')}>
        {data.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} favorite={favoriteIds.has(nft.id)} priority={index < 3} />
          </li>
        ))}
      </ul>
    )
  }

  const filters = <CatalogFilters search={search} facets={data?.facets} onChange={onChange} />

  return (
    <section id="catalogo" aria-labelledby="catalog-title" className="mt-10 scroll-mt-6 md:mt-24 lg:flex lg:gap-12">
      <h2 id="catalog-title" className="sr-only">
        Catálogo de NFTs
      </h2>
      <aside aria-label="Filtros" className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex">
        <div className="bg-card p-5">{filters}</div>
        <FeaturedBanner />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-8 md:gap-[88px]">
        <div className="flex flex-col gap-8">
          <CatalogToolbar
            search={search}
            onChange={onChange}
            onOpenFilters={() => onFiltersOpenChange(true)}
            activeFilters={activeFilters}
          />
          {search.q && (
            <p className="text-sm text-muted-foreground">
              Resultados para <strong className="text-foreground">“{search.q}”</strong>{' '}
              <button type="button" className="cursor-pointer text-accent underline" onClick={() => onChange({ q: undefined })}>
                limpar busca
              </button>
            </p>
          )}
          {isError && data && (
            <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
              <WarningIcon className="size-4" />
              Falha ao atualizar os resultados.
              <button type="button" className="cursor-pointer underline" onClick={() => void refetch()}>
                Tentar novamente
              </button>
            </p>
          )}
          <p role="status" className="sr-only">
            {status}
          </p>
          {content}
        </div>
        {data && <CatalogPagination page={data.page} totalPages={data.totalPages} onPageChange={changePage} />}
      </div>

      <Sheet open={filtersOpen} onOpenChange={onFiltersOpenChange}>
        <SheetContent side="left" className="w-[320px] overflow-y-auto border-border bg-background">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Os resultados são atualizados a cada seleção.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-8">{filters}</div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
