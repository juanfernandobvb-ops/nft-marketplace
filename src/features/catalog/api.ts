import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { buildPath, endpoints, Nft, NftListResponse, type NftListQuery } from '@/contracts'
import { queryKeys } from '@/lib/query-keys'
import { request } from '@/services/http/client'

/**
 * Cada combinação de filtros é uma chave própria: respostas de buscas antigas nunca
 * sobrescrevem a atual, e o `signal` cancela a requisição obsoleta ao trocar de filtro.
 */
export const nftListQuery = (query: NftListQuery) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(query),
    queryFn: ({ signal }) => request(NftListResponse, { url: endpoints.nfts.list, params: query, signal }),
    // Mantém a página anterior visível (esmaecida) enquanto a nova carrega: sem salto de layout.
    placeholderData: keepPreviousData,
  })

export const nftDetailQuery = (nftId: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(nftId),
    queryFn: ({ signal }) => request(Nft, { url: buildPath(endpoints.nfts.detail, { nftId }), signal }),
  })
