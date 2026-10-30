import type { QueryClient } from '@tanstack/react-query'
import {
  EVENTS,
  RealtimeEvent,
  type Nft,
  type NftListResponse,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
} from '@/contracts'
import { queryKeys } from '@/lib/query-keys'
import { socket } from '@/services/realtime/socket'
import { sessionStore } from '@/services/session/store'

type Listener = (event: RealtimeEvent) => void
const listeners = new Set<Listener>()

/** Eventos já aplicados ao cache, para a interface anunciar mudanças (ex.: "preço atualizado"). */
export function onRealtimeEvent(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const SEEN_LIMIT = 500

function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  const nftId = event.resource.id
  const patch = <T extends Pick<Nft, 'price' | 'previousPrice' | 'version'>>(item: T): T =>
    item.version >= event.version
      ? item
      : { ...item, price: event.data.price, previousPrice: event.data.previousPrice, version: event.version }

  queryClient.setQueryData<Nft>(queryKeys.nfts.detail(nftId), (nft) => {
    if (!nft || nft.version >= event.version) return nft
    return {
      ...patch(nft),
      editions: nft.editions.map((edition) => ({
        ...edition,
        available: event.data.editions.find((changed) => changed.id === edition.id)?.available ?? edition.available,
      })),
    }
  })
  queryClient.setQueriesData<NftListResponse>({ queryKey: queryKeys.nfts.lists() }, (list) =>
    list && { ...list, items: list.items.map((item) => (item.id === nftId ? patch(item) : item)) },
  )  // Carrinhos recalculados pela API, que é a referência de preço e disponibilidade.
  const userId = sessionStore.userId()
  if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(userId) })
  void queryClient.invalidateQueries({ queryKey: ['guest-cart'] })
  void queryClient.invalidateQueries({ queryKey: ['quote'] })
}

function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent) {
  const userId = sessionStore.userId()
  if (!userId) return
  const key = queryKeys.private.order(userId, event.resource.id)
  const cached = queryClient.getQueryData<Order>(key)
  if (cached && cached.version >= event.version) return
  if (cached) {
    queryClient.setQueryData<Order>(key, { ...cached, ...event.data, version: event.version })
  }
  // Recibo e carrinho vêm da API (o carrinho perde os itens comprados na confirmação).
  void queryClient.invalidateQueries({ queryKey: key })
  void queryClient.invalidateQueries({ queryKey: queryKeys.private.cart(userId) })
}

/**
 * Aplica eventos Socket.IO ao cache do TanStack Query com proteção contra duplicatas (`id`),
 * eventos antigos (`version`) e eventos de outra sessão (`userId`). Após reconexão,
 * reconcilia com a API REST refazendo as consultas ativas.
 */
export function startRealtimeSync(queryClient: QueryClient) {
  const seen = new Set<string>()
  const versions = new Map<string, number>()

  const handle = (payload: unknown) => {
    const parsed = RealtimeEvent.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    if (seen.has(event.id)) return
    if (event.userId !== null && event.userId !== sessionStore.userId()) return
    const resourceKey = `${event.resource.type}:${event.resource.id}`
    if (event.version <= (versions.get(resourceKey) ?? -1)) return

    seen.add(event.id)
    if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value as string)
    versions.set(resourceKey, event.version)

    if (event.type === EVENTS.nftUpdated) applyNftUpdated(queryClient, event)
    else applyOrderUpdated(queryClient, event)
    listeners.forEach((listener) => listener(event))
  }

  const reconcile = () => void queryClient.invalidateQueries({ refetchType: 'active' })

  // Resposta REST gerada antes de um evento já aplicado (ex.: chegou depois dele) não pode
  // regredir o estado: se trouxer um NFT com versão anterior, a consulta é refeita.
  const stopStaleGuard = queryClient.getQueryCache().subscribe((cacheEvent) => {
    if (cacheEvent.type !== 'updated' || cacheEvent.action.type !== 'success') return
    const { query } = cacheEvent
    if (query.queryKey[0] !== queryKeys.nfts.all[0]) return
    const data = query.state.data as Nft | NftListResponse | undefined
    const nfts = !data ? [] : 'items' in data ? data.items : [data]
    if (nfts.some((nft) => nft.version < (versions.get(`nft:${nft.id}`) ?? -1))) {
      void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
    }
  })

  socket.on(EVENTS.nftUpdated, handle)
  socket.on(EVENTS.orderUpdated, handle)
  socket.io.on('reconnect', reconcile)
  return () => {
    socket.off(EVENTS.nftUpdated, handle)
    socket.off(EVENTS.orderUpdated, handle)
    socket.io.off('reconnect', reconcile)
    stopStaleGuard()
  }
}
