import { ChevronDownIcon, FilterIcon } from '@/components/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NftSegment, NftSort, type NftListQuery } from '@/contracts'
import { cn } from '@/lib/utils'

const SEGMENT_LABELS: Record<NftListQuery['segment'], string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}
const SORT_LABELS: Record<NftListQuery['sort'], string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
}

interface ToolbarProps {
  search: NftListQuery
  onChange: (patch: Partial<NftListQuery>) => void
  onOpenFilters: () => void
  activeFilters: number
}

export function CatalogToolbar({ search, onChange, onOpenFilters, activeFilters }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div role="group" aria-label="Segmento do catálogo" className="flex flex-wrap gap-x-3 gap-y-2 md:gap-5">
        {NftSegment.options.map((segment) => {
          const active = search.segment === segment
          return (
            <button
              key={segment}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ segment })}
              className={cn(
                'shrink-0 cursor-pointer border-b-2 pb-1 text-sm font-medium whitespace-nowrap transition-colors md:text-[15px]',
                active ? 'border-primary text-accent' : 'border-transparent hover:text-accent',
              )}
            >
              {SEGMENT_LABELS[segment]}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[15px] lg:hidden"
        >
          <FilterIcon className="size-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {activeFilters}
              <span className="sr-only"> ativos</span>
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1 rounded-sm text-[15px]">
            <span className="hidden sm:inline">Ordenar por:</span>
            <span className="sm:ml-1">{SORT_LABELS[search.sort]}</span>
            <ChevronDownIcon className="ml-1 size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-card">
            <DropdownMenuRadioGroup value={search.sort} onValueChange={(value) => onChange({ sort: NftSort.parse(value) })}>
              {NftSort.options.map((sort) => (
                <DropdownMenuRadioItem key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
