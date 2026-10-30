import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

const cell = 'grid size-[35px] cursor-pointer place-items-center rounded-sm text-lg leading-4 disabled:cursor-not-allowed disabled:opacity-40'

/** Janela de até 4 páginas ao redor da atual, como no layout. */
function pageWindow(page: number, totalPages: number) {
  const size = Math.min(4, totalPages)
  const start = Math.min(Math.max(1, page - 1), totalPages - size + 1)
  return Array.from({ length: size }, (_, index) => start + index)
}

export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação do catálogo" className="flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            className={cn(cell, 'border border-border')}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon className="h-[10px]" />
          </button>
        </li>
        {pageWindow(page, totalPages).map((number) => (
          <li key={number}>
            <button
              type="button"
              onClick={() => onPageChange(number)}
              aria-current={number === page ? 'page' : undefined}
              aria-label={`Página ${number}`}
              className={cn(
                cell,
                number === page ? 'bg-primary font-bold text-primary-foreground' : 'border border-border hover:border-primary',
              )}
            >
              {number}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={cn(cell, 'border border-border')}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRightIcon className="h-[10px]" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
