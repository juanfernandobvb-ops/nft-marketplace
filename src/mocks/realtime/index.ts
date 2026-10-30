import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { env } from '@/config/env'
import { EVENTS, type Nft, type Order, type RealtimeEvent } from '@/contracts'
import { nextId } from '@/mocks/db/store'
import { userFromToken } from '@/mocks/handlers/http'

// Só a origem: o MSW remove o prefixo "/socket.io/" da URL do cliente antes de comparar com o link.
const link = ws.link(env.socketUrl.replace(/^http/, 'ws'))

interface Client {
  io: ReturnType<typeof toSocketIo>
  close: () => void
  /** Dono da conexão, pelo token enviado no handshake (`?token=`); `null` = visitante. */
  userId: string | null
}

const clients = new Set<Client>()
const history: RealtimeEvent[] = []
const HISTORY_LIMIT = 50
let available = true

/** Eventos públicos (`userId: null`) vão para todos; privados, só para as conexões do dono. */
function publish(event: RealtimeEvent) {
  history.push(event)
  if (history.length > HISTORY_LIMIT) history.shift()
  for (const client of clients) {
    if (event.userId === null || event.userId === client.userId) client.io.client.emit(event.type, event)
  }
}

export function publishNftUpdated(nft: Nft) {
  publish({
    id: nextId('evt'),
    type: EVENTS.nftUpdated,
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    userId: null,
    occurredAt: new Date().toISOString(),
    data: {
      price: nft.price,
      previousPrice: nft.previousPrice,
      editions: nft.editions.map(({ id, available }) => ({ id, available })),
    },
  })
}

export function publishOrderUpdated(order: Order, userId: string) {
  publish({
    id: nextId('evt'),
    type: EVENTS.orderUpdated,
    resource: { type: 'order', id: order.id },
    version: order.version,
    userId,
    occurredAt: new Date().toISOString(),
    data: { status: order.status, transaction: order.transaction, failureReason: order.failureReason },
  })
}

export const realtime = {
  events: () => [...history],
  /** Conexões abertas: evento publicado antes de o cliente conectar não é entregue a ninguém. */
  connections: () => clients.size,
  /** Reenvia um evento já emitido: simula duplicata ou, se houver versão mais nova, evento antigo. */
  replay(eventId: string) {
    const event = history.find((candidate) => candidate.id === eventId)
    if (!event) throw new Error(`Evento ${eventId} não encontrado no histórico`)
    for (const client of clients) {
      if (event.userId === null || event.userId === client.userId) client.io.client.emit(event.type, event)
    }
  },
  /** Derruba as conexões abertas; o socket.io-client tenta reconectar sozinho. */
  disconnectAll() {
    for (const client of clients) client.close()
  },
  /** Com `false`, recusa novas conexões até ser reativado (queda prolongada). */
  setAvailable(value: boolean) {
    available = value
    if (!value) realtime.disconnectAll()
  },
}

export const realtimeHandler = link.addEventListener('connection', (connection) => {
  if (!available) {
    connection.client.close()
    return
  }
  const token = connection.client.url.searchParams.get('token')
  const client: Client = {
    io: toSocketIo(connection),
    close: () => connection.client.close(),
    userId: userFromToken(token)?.id ?? null,
  }
  clients.add(client)
  connection.client.addEventListener('close', () => clients.delete(client))
})
