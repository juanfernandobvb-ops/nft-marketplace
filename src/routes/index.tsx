import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useState } from 'react'
import { NftListQuery } from '@/contracts'
import { nftListQuery } from '@/features/catalog/api'
import { CatalogSection, MobileCatalogSearch, type CatalogChange } from '@/features/catalog/components/catalog-section'
import { BlogSection, HeroBanner, PromoCards } from '@/features/catalog/components/editorial'

/** Valores padrão ficam fora da URL: `/` em vez de `/?segment=all&sort=recent&page=1...`. */
const CATALOG_DEFAULTS = { segment: 'all', sort: 'recent', page: 1, pageSize: 9 } as const

export const Route = createFileRoute('/')({
  validateSearch: NftListQuery,
  search: { middlewares: [stripSearchParams(CATALOG_DEFAULTS)] },
  loaderDeps: ({ search }) => search,
  // Inicia a busca junto com a navegação, sem bloquear a renderização (skeletons aparecem na hora).
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQuery(deps))
  },
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Toda mudança de filtro volta para a primeira página, exceto a própria paginação.
  const onChange: CatalogChange = (patch, options) =>
    void navigate({
      search: (prev) => ({ ...prev, page: undefined, ...patch }),
      replace: options?.replace,
      resetScroll: false,
    })

  return (
    <>
      <MobileCatalogSearch search={search} onChange={onChange} onOpenFilters={() => setFiltersOpen(true)} />
      <HeroBanner />
      <CatalogSection search={search} onChange={onChange} filtersOpen={filtersOpen} onFiltersOpenChange={setFiltersOpen} />
      <PromoCards />
      <BlogSection />
    </>
  )
}
