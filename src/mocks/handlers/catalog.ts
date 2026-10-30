import { endpoints, Favorites, Nft, NftListQuery, NftListResponse } from '@/contracts'
import { findNft, listNfts } from '@/mocks/db/catalog'
import { getDb, persist } from '@/mocks/db/store'
import { fail, issuesToFieldErrors, json, requireUser, route } from '@/mocks/handlers/http'

function queryFromUrl(url: URL) {
  const raw: Record<string, unknown> = {}
  for (const key of ['q', 'segment', 'minPrice', 'maxPrice', 'sort', 'page', 'pageSize']) {
    const value = url.searchParams.get(key)
    if (value) raw[key] = value
  }
  for (const key of ['categories', 'networks']) {
    const values = url.searchParams.getAll(key)
    if (values.length) raw[key] = values
  }
  return raw
}

export const catalogHandlers = [
  route('GET', endpoints.nfts.list, ({ request }) => {
    const result = NftListQuery.safeParse(queryFromUrl(new URL(request.url)))
    if (!result.success) throw fail.validation(issuesToFieldErrors(result.error.issues), 'Parâmetros de busca inválidos.')
    return json(NftListResponse, listNfts(result.data))
  }),

  route('GET', endpoints.nfts.detail, ({ param }) => json(Nft, findNft(param('nftId')))),

  route('GET', endpoints.favorites.list, ({ request }) => {
    const user = requireUser(request)
    return json(Favorites, { nftIds: getDb().favorites[user.id] ?? [] })
  }),

  route('PUT', endpoints.favorites.item, ({ request, param }) => {
    const user = requireUser(request)
    const nft = findNft(param('nftId'))
    const db = getDb()
    const current = db.favorites[user.id] ?? []
    if (!current.includes(nft.id)) db.favorites[user.id] = [...current, nft.id]
    persist()
    return json(Favorites, { nftIds: db.favorites[user.id] ?? [] })
  }),

  route('DELETE', endpoints.favorites.item, ({ request, param }) => {
    const user = requireUser(request)
    const nftId = param('nftId')
    const db = getDb()
    const nftIds = (db.favorites[user.id] ?? []).filter((id) => id !== nftId)
    db.favorites[user.id] = nftIds
    persist()
    return json(Favorites, { nftIds })
  }),
]
