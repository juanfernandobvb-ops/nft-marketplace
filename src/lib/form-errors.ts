import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { HttpError } from '@/services/http/errors'

/** Erros da API viram erros dos campos; o restante aparece no topo do formulário (`root`). */
export function applyApiError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: Path<T>[]) {
  if (!(error instanceof HttpError)) {
    setError('root', { message: 'Algo deu errado. Tente novamente.' })
    return
  }
  let mapped = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (fields.includes(field as Path<T>)) {
      setError(field as Path<T>, { message })
      mapped = true
    }
  }
  if (!mapped || error.code !== 'VALIDATION') setError('root', { message: error.message })
}
