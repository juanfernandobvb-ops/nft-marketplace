import type { Nft, NftSummary, Profile, User, Wallet } from '@/contracts'
import type { DbUser, DbWallet } from '@/mocks/db/types'

// Conversões do estado interno para os contratos públicos.

export const toUser = (user: DbUser): User => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
})

export const toProfile = (user: DbUser): Profile => ({
  userId: user.id,
  displayName: user.displayName,
  username: user.username,
  email: user.email,
  ensName: user.ensName,
  walletAlias: user.walletAlias,
  avatarUrl: user.avatarUrl,
})

export const toSummary = (nft: Nft): NftSummary => ({
  id: nft.id,
  tokenId: nft.tokenId,
  name: nft.name,
  category: nft.category,
  network: nft.network,
  price: nft.price,
  previousPrice: nft.previousPrice,
  images: nft.images,
  version: nft.version,
})

export const toWallet = (wallet: DbWallet): Wallet => ({
  ...wallet,
  updatedAt: new Date(wallet.updatedAt).toISOString(),
})
