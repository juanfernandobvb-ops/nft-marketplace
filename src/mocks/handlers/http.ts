import { delay, http, HttpResponse, type JsonBodyType, type PathParams } from 'msw'
import type { z } from 'zod'
import { env } from '@/config/env'
import { ApiError, type ErrorCode } from '@/contracts'
import { persist, getDb } from '@/mocks/db/store'
import type { DbUser } from '@/mocks/db/types'
import { nextLatency, takeFailure } from '@/mocks/scenarios'

export class MockApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fieldErrors?: Record<string, string>

  constructor(status: number, code: ErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export const fail = {
  validation: (fieldErrors: Record<string, string>, message = 'Verifique os campos destacados.') =>
    new MockApiError(422, 'VALIDATION', message, fieldErrors),
  unauthorized: (message = 'Faça login para continuar.') => new MockApiError(401, 'UNAUTHORIZED', message),
  sessionExpired: () => new MockApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.'),
  forbidden: () => new MockApiError(403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.'),
  notFound: (message = 'Recurso não encontrado.') => new MockApiError(404, 'NOT_FOUND', message),
  conflict: (message: string, fieldErrors?: Record<string, string>) =>
    new MockApiError(409, 'CONFLICT', message, fieldErrors),
  outOfStock: (message: string) => new MockApiError(409, 'OUT_OF_STOCK', message),
  quoteStale: (message: string) => new MockApiError(409, 'QUOTE_STALE', message),
}

function errorResponse(status: number, error: ApiError) {
  return HttpResponse.json(ApiError.parse(error), { status })
}

/** Valida a resposta contra o contrato antes de enviar: o mock nunca diverge dos tipos. */
export function json<S extends z.ZodType>(schema: S, data: z.input<S>, status = 200) {
  return HttpResponse.json(schema.parse(data) as JsonBodyType, { status })
}

export function noContent() {
  return new HttpResponse(null, { status: 204 })
}

export function issuesToFieldErrors(issues: z.core.$ZodIssue[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path.join('.') || '_'
    fieldErrors[key] ??= issue.message
  }
  return fieldErrors
}

export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw fail.validation({}, 'Corpo da requisição inválido.')
  }
  const result = schema.safeParse(body)
  if (!result.success) throw fail.validation(issuesToFieldErrors(result.error.issues))
  return result.data
}

function bearerToken(request: Request) {
  return request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1] ?? null
}

/** Usuário da sessão do token; `null` se ausente, inválido ou expirado. */
export function userFromToken(token: string | null): DbUser | null {
  if (!token) return null
  const db = getDb()
  const session = db.sessions.find((candidate) => candidate.token === token)
  if (!session || session.expiresAt <= Date.now()) return null
  return db.users.find((user) => user.id === session.userId) ?? null
}

export function requireUser(request: Request): DbUser {
  const token = bearerToken(request)
  if (!token) throw fail.unauthorized()
  const db = getDb()
  const session = db.sessions.find((candidate) => candidate.token === token)
  if (!session) throw fail.unauthorized()
  if (session.expiresAt <= Date.now()) {
    db.sessions = db.sessions.filter((candidate) => candidate !== session)
    persist()
    throw fail.sessionExpired()
  }
  const user = db.users.find((candidate) => candidate.id === session.userId)
  if (!user) throw fail.unauthorized()
  return user
}

export function optionalUser(request: Request): DbUser | null {
  return userFromToken(bearerToken(request))
}

export function sessionToken(request: Request) {
  return bearerToken(request)
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Lower<M extends Method> = Lowercase<M>

interface RouteContext {
  request: Request
  /** Parâmetro de path declarado no padrão da rota (ex.: `:nftId`). */
  param: (name: string) => string
}

const paramReader = (params: PathParams) => (name: string) => {
  const value = params[name]
  const text = Array.isArray(value) ? value[0] : value
  if (!text) throw fail.notFound()
  return String(text)
}

/**
 * Registra um handler REST aplicando as condições de rede do cenário ativo
 * (latência, falhas, timeouts) e convertendo MockApiError no formato de ApiError.
 */
export function route(method: Method, path: string, resolver: (ctx: RouteContext) => Response | Promise<Response>) {
  return http[method.toLowerCase() as Lower<Method>](`${env.apiUrl}${path}`, async ({ request, params }) => {
    await delay(nextLatency(method, path))
    const failure = takeFailure(method, path)
    if (failure?.mode === 'network-error') return HttpResponse.error()
    if (failure?.mode === 'timeout') await delay('infinite')
    if (failure && typeof failure.mode === 'object') {
      return errorResponse(failure.mode.status, {
        code: failure.mode.code,
        message: 'Serviço temporariamente indisponível. Tente novamente.',
      })
    }

    let response: Response
    try {
      response = await resolver({ request, param: paramReader(params) })
    } catch (error) {
      if (!(error instanceof MockApiError)) throw error
      response = errorResponse(error.status, {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
      })
    }
    // O servidor já processou (ex.: criou o pedido), mas a resposta nunca chega ao cliente.
    if (failure?.mode === 'timeout-after-processing') await delay('infinite')
    return response
  })
}
