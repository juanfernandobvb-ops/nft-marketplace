import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Category, Network, type NftListQuery, type NftListResponse } from '@/contracts'
import { CATEGORY_LABELS, formatEthPlain, NETWORK_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'

type Facets = NftListResponse['facets']

interface FilterProps {
  search: NftListQuery
  facets: Facets | undefined
  onChange: (patch: Partial<NftListQuery>) => void
}

const toggle = <T,>(list: T[] | undefined, value: T) => {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

function FilterOption({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center justify-between rounded-sm text-[15px] transition-colors hover:text-accent',
          active ? 'text-accent' : 'text-muted-foreground',
        )}
      >
        <span className={cn(active && 'underline decoration-2 underline-offset-4')}>{label}</span>
        <span className="font-bold" aria-label={`${count} itens`}>
          ({count})
        </span>
      </button>
    </li>
  )
}

const toCents = (eth: string) => Math.round(Number(eth) * 100)
const fromCents = (cents: number) => (cents / 100).toFixed(2)

function PriceFilter({ search, facets, onChange }: FilterProps) {
  const bounds = facets ? [toCents(facets.priceRange.min), toCents(facets.priceRange.max)] : [0, 0]
  const fromUrl = [
    search.minPrice ? toCents(search.minPrice) : bounds[0]!,
    search.maxPrice ? toCents(search.maxPrice) : bounds[1]!,
  ]
  // Estado local até "Aplicar"; o componente é remontado (key) quando a URL muda.
  const [range, setRange] = useState(fromUrl)

  const apply = () =>
    onChange({
      minPrice: range[0] === bounds[0] ? undefined : fromCents(range[0]!),
      maxPrice: range[1] === bounds[1] ? undefined : fromCents(range[1]!),
    })

  return (
    <div className="flex flex-col gap-3 pl-3">
      <Slider
        min={bounds[0]}
        max={bounds[1]}
        step={1}
        value={range}
        onValueChange={setRange}
        disabled={!facets}
        thumbLabels={['Preço mínimo', 'Preço máximo']}
        className="h-[21px]"
      />
      <p className="text-[15px] leading-5" aria-live="polite">
        Preço: {formatEthPlain(fromCents(range[0]!))} - {formatEthPlain(fromCents(range[1]!))} ETH
      </p>
      <Button size="sm" className="w-fit" onClick={apply} disabled={!facets}>
        Aplicar
      </Button>
    </div>
  )
}

export function CatalogFilters(props: FilterProps) {
  const { search, facets, onChange } = props
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="filter-collections" className="flex flex-col gap-3">
        <h2 id="filter-collections" className="text-lg leading-4 font-bold">
          Coleções
        </h2>
        {facets ? (
          <ul className="px-3">
            {Category.options.map((category) => (
              <FilterOption
                key={category}
                label={CATEGORY_LABELS[category]}
                count={facets.categories[category]}
                active={Boolean(search.categories?.includes(category))}
                onClick={() => onChange({ categories: toggle(search.categories, category) })}
              />
            ))}
          </ul>
        ) : (
          <Skeleton className="h-[360px]" />
        )}
      </section>

      <section aria-labelledby="filter-price" className="flex flex-col gap-3">
        <h2 id="filter-price" className="text-lg leading-4 font-bold">
          Faixa de preço
        </h2>
        <PriceFilter key={`${search.minPrice}|${search.maxPrice}|${facets?.priceRange.max}`} {...props} />
      </section>

      <section aria-labelledby="filter-network" className="flex flex-col gap-3">
        <h2 id="filter-network" className="text-lg leading-4 font-bold">
          Rede
        </h2>
        {facets ? (
          <ul className="pl-3">
            {Network.options.map((network) => (
              <FilterOption
                key={network}
                label={NETWORK_LABELS[network]}
                count={facets.networks[network]}
                active={Boolean(search.networks?.includes(network))}
                onClick={() => onChange({ networks: toggle(search.networks, network) })}
              />
            ))}
          </ul>
        ) : (
          <Skeleton className="h-[120px]" />
        )}
      </section>
    </div>
  )
}
