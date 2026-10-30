import { io } from 'socket.io-client'
import { env } from '@/config/env'

// WebSocket-only: o transporte de long-polling não é interceptado pelo binding do MSW.
export const socket = io(env.socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
})

/**
 * (Re)conecta identificando o usuário pelo token no handshake. Chamado a cada troca de sessão:
 * a conexão anterior é encerrada, então eventos de outra sessão não chegam mais.
 */
export function connectRealtime(token: string | null) {
  socket.disconnect()
  socket.io.opts.query = token ? { token } : {}
  socket.connect()
}
