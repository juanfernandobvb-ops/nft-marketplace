import { AxiosError, isCancel, type AxiosResponse } from 'axios'
import { env } from '@/config/env'
import { ApiError, type ErrorCode } from '@/contracts'

export type HttpErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT' | 'CANCELED' | 'MOCKS_OFFLINE' | 'UNKNOWN'

/** Erro único da camada de transporte: a interface nunca lida com AxiosError diretamente. */
export class HttpError extends Error {
  readonly code: HttpErrorCode
  readonly status: number | null
  readonly fieldErrors: Record<string, string>

  constructor(code: HttpErrorCode, message: string, status: number | null = null, fieldErrors = {}) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
  }

  /** Falhas transitórias que podem ser repetidas sem risco de duplicar operações idempotentes. */
  get isRetryable() {
    return this.code === 'NETWORK' || this.code === 'TIMEOUT' || this.code === 'UNAVAILABLE'
  }

  get isAuthError() {
    return this.code === 'UNAUTHORIZED' || this.code === 'SESSION_EXPIRED'
  }
}

/**
 * Com os mocks ligados, toda resposta da API com corpo sai do MSW em JSON. Qualquer outra coisa
 * (a página HTML num GET, 404 vazio num POST) indica que a requisição escapou do service worker
 * (desatualizado, removido ou com "Bypass for network" no DevTools) e chegou ao servidor de arquivos.
 */
export function mocksOfflineError(response: AxiosResponse): HttpError | null {
  const isJson = String(response.headers['content-type'] ?? '').includes('json')
  if (!env.enableMocks || response.status === 204 || isJson) return null
  return new HttpError(
    'MOCKS_OFFLINE',
    'A demonstração não carregou direito. Recarregue a página; se continuar, limpe os dados deste site no navegador e tente de novo.',
    response.status,
  )
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  if (isCancel(error)) return new HttpError('CANCELED', 'Requisição cancelada.')
  if (!(error instanceof AxiosError)) return new HttpError('UNKNOWN', 'Erro inesperado.')
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new HttpError('TIMEOUT', 'O servidor demorou para responder.')
  }
  if (!error.response) return new HttpError('NETWORK', 'Sem conexão com o servidor.')
  const offline = mocksOfflineError(error.response)
  if (offline) return offline

  const parsed = ApiError.safeParse(error.response.data)
  if (!parsed.success) {
    return new HttpError('UNKNOWN', 'Resposta inesperada do servidor.', error.response.status)
  }
  return new HttpError(parsed.data.code, parsed.data.message, error.response.status, parsed.data.fieldErrors)
}
