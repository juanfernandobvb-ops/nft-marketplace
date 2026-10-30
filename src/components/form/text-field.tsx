import { Eye } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
import { EyeOffIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

interface FieldProps extends ComponentProps<'input'> {
  label: string
  error?: string
  /** O layout usa só placeholder; o rótulo continua existindo para leitores de tela. */
  hideLabel?: boolean
}

export const inputClass =
  'h-10 w-full rounded-[5px] border border-border bg-transparent px-4 text-sm placeholder:text-secondary focus:border-primary focus:outline-none aria-invalid:border-destructive md:h-10 max-md:h-[50px] max-md:rounded-[10px]'

/** Asterisco visual dos campos obrigatórios (o leitor de tela usa o atributo required). */
export const RequiredMark = () => (
  <span aria-hidden="true" className="ml-0.5 text-destructive">
    *
  </span>
)

export function TextField({ label, error, hideLabel, className, ...props }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={cn('text-sm', hideLabel && 'sr-only')}>
        {label}
        {props.required && <RequiredMark />}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function PasswordField({ label, error, hideLabel, className, ...props }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [visible, setVisible] = useState(false)
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={cn('text-sm', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClass, 'pr-12')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-2 grid w-9 cursor-pointer place-items-center text-secondary"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <Eye className="size-5" strokeWidth={1.5} />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
