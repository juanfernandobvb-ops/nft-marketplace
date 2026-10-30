import type { Nft, Order, Quote, WalletInput, WalletSlot, WalletType } from '@/contracts'

// Estado interno do servidor simulado. Nunca sai dos mocks: os handlers convertem para os contratos.

export interface DbUser {
  id: string
  email: string
  username: string
  displayName: string
  ensName: string | null
  walletAlias: string | null
  /** data URL do avatar enviado. */
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: number
}

export interface DbCartLine {
  id: string
  nftId: string
  editionId: string
  quantity: number
}

export interface DbCart {
  lines: DbCartLine[]
  updatedAt: number
}

export interface DbWallet extends WalletInput {
  slot: WalletSlot
  type: WalletType
  updatedAt: number
}

export interface DbQuote {
  quote: Quote
  userId: string | null
}

export interface DbOrder {
  order: Order
  userId: string
  /** Momento em que a simulação define o resultado do pagamento. */
  settleAt: number
  outcome: 'confirm' | 'reject'
}

export interface DbIdempotency {
  userId: string
  requestHash: string
  orderId: string
}

export interface Db {
  schema: number
  scenario: string
  seq: number
  users: DbUser[]
  sessions: DbSession[]
  nfts: Nft[]
  favorites: Record<string, string[]>
  carts: Record<string, DbCart>
  wallets: Record<string, Partial<Record<WalletSlot, DbWallet>>>
  quotes: Record<string, DbQuote>
  orders: Record<string, DbOrder>
  idempotency: Record<string, DbIdempotency>
  /** Mudança de checkout do cenário já disparada (não repete após refresh). */
  checkoutChangeDone: boolean
}
