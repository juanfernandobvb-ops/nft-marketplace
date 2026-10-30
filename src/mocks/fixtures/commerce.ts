import type { Network } from '@/contracts'

export interface Coupon {
  code: string
  description: string
  percentOff: number
  expiresAt: number
}

/** KURIO10 e LAUNCH5 válidos; GENESIS20 expirado; qualquer outro código é inválido. */
export const COUPONS: Coupon[] = [
  { code: 'KURIO10', description: '10% de desconto de lançamento', percentOff: 10, expiresAt: Date.parse('2099-01-01') },
  { code: 'LAUNCH5', description: '5% de desconto', percentOff: 5, expiresAt: Date.parse('2099-01-01') },
  { code: 'GENESIS20', description: '20% gênesis', percentOff: 20, expiresAt: Date.parse('2026-01-01') },
]

/** Taxa de rede estimada por rede (ETH). */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

export const QUOTE_TTL_MS = 5 * 60_000
export const SESSION_TTL_MS = 30 * 60_000
