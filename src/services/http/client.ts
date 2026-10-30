import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'
import { env } from '@/config/env'
import { mocksOfflineError, toHttpError } from '@/services/http/errors'
import { sessionStore } from '@/services/session/store'

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
  // Listas como parâmetros repetidos: ?networks=a&networks=b
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = sessionStore.token()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => {
    // GET sem MSW recebe 200 com a página HTML da aplicação: tratado como falha dos mocks.
    const offline = mocksOfflineError(response)
    return offline ? Promise.reject(offline) : response
  },
  (error: unknown) => {
    const httpError = toHttpError(error)
    // Sessão rejeitada pela API: encerra localmente; a interface oferece login e retomada.
    if (httpError.isAuthError && sessionStore.token()) sessionStore.end('expired')
    return Promise.reject(httpError)
  },
)

/** Executa a requisição e valida a resposta contra o contrato. */
export async function request<S extends z.ZodType>(schema: S, config: AxiosRequestConfig): Promise<z.output<S>> {
  const { data } = await http.request<unknown>(config)
  return schema.parse(data)
}

/** Para respostas sem corpo (204). */
export async function send(config: AxiosRequestConfig): Promise<void> {
  await http.request(config)
}
