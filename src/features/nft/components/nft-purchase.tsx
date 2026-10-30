import { MinusIcon, PlusIcon } from '@/components/icons'
import { quantityLimit, type Edition } from '@/contracts'
import { cn } from '@/lib/utils'

const EDITION_LABELS: Record<Edition['kind'], string> = { '1/1': '1/1', '1/10': '1/10', '1/50': '1/50', open: 'ABERTA' }

export function EditionPicker({
  editions,
  selectedId,
  onSelect,
}: {
  editions: Edition[]
  selectedId: string | undefined
  onSelect: (editionId: string) => void
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[15px] leading-4 font-bold">Edição:</legend>
      <div role="radiogroup" aria-label="Edição" className="flex flex-wrap gap-1.5">
        {editions.map((edition) => {
          const soldOut = quantityLimit(edition) === 0
          const selected = edition.id === selectedId
          return (
            <button
              key={edition.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={soldOut}
              onClick={() => onSelect(edition.id)}
              title={soldOut ? 'Edição esgotada' : undefined}
              className={cn(
                'h-7 cursor-pointer rounded-full border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-50',
                selected ? 'border-primary font-medium text-accent' : 'border-border text-muted-foreground hover:border-primary',
              )}
            >
              {EDITION_LABELS[edition.kind]}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Seletor de quantidade limitado à disponibilidade da edição. */
export function QuantityStepper({
  value,
  max,
  onChange,
  size = 'lg',
  disabled = false,
  label,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  size?: 'lg' | 'sm'
  disabled?: boolean
  /** Nome do item, para rótulos únicos quando há vários seletores na tela. */
  label?: string
}) {
  const suffix = label ? ` de ${label}` : ''
  const button = cn(
    'grid cursor-pointer place-items-center bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40',
    size === 'lg' ? 'h-[49.5px] w-[33px] rounded-full shadow-[0_6.6px_19.8px_rgb(20_13_10/0.15)]' : 'size-[30px] rounded-full',
  )
  return (
    <div className="flex items-center gap-3" role="group" aria-label={`Quantidade${suffix}`}>
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label={`Diminuir quantidade${suffix}`}>
        <MinusIcon className={size === 'lg' ? 'size-5' : 'size-3.5'} />
      </button>
      <output aria-live="polite" aria-label={`Quantidade: ${value}`} className={cn('min-w-4 text-center', size === 'lg' ? 'text-xl' : 'text-base')}>
        {value}
      </output>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={`Aumentar quantidade${suffix}`}>
        <PlusIcon className={size === 'lg' ? 'size-5' : 'size-3.5'} />
      </button>
    </div>
  )
}
