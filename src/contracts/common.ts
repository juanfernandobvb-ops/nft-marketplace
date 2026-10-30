import { z } from 'zod'

// Mensagens padrão do Zod em português (as dos formulários já são personalizadas nos schemas).
// Fica aqui porque todo contrato importa este módulo: vale para a interface e para os mocks.
z.config(z.locales.ptBR())

/** Valor em ETH como string decimal: evita a perda de precisão de `number`. Cálculos usam big.js. */
export const Eth = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type Eth = z.infer<typeof Eth>

export const Id = z.string().min(1)
export const IsoDateTime = z.iso.datetime()

export const Network = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof Network>

export const ErrorCode = z.enum([
  'VALIDATION', // 422: campos inválidos, detalhados em fieldErrors
  'UNAUTHORIZED', // 401: requisição sem sessão
  'SESSION_EXPIRED', // 401: token expirado
  'FORBIDDEN', // 403: recurso de outro usuário
  'NOT_FOUND', // 404
  'CONFLICT', // 409: cadastro duplicado ou chave de idempotência reutilizada com outro conteúdo
  'OUT_OF_STOCK', // 409: edição esgotada ou quantidade acima do disponível
  'QUOTE_STALE', // 409: cotação vencida ou divergente do catálogo
  'WALLET_REJECTED', // 409: a carteira recusou a conexão (simulada)
  'UNAVAILABLE', // 503: falha transitória, pode tentar de novo
])
export type ErrorCode = z.infer<typeof ErrorCode>

export const ApiError = z.object({
  code: ErrorCode,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
})
export type ApiError = z.infer<typeof ApiError>

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.int().min(1),
    pageSize: z.int().min(1),
    total: z.int().min(0),
    totalPages: z.int().min(0),
  })
