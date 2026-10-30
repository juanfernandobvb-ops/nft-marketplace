import type { CartLineInput, Network, NftListQuery } from '@/contracts'

/**
 * Chaves do TanStack Query. Dados privados ficam sob `['private', userId]`:
 * isolados por usuário e removidos em bloco no logout/troca de usuário.
 */
export const queryKeys = {
  nfts: {
    all: ['nfts'] as const,
    lists: () => [...queryKeys.nfts.all, 'list'] as const,
    list: (query: NftListQuery) => [...queryKeys.nfts.lists(), query] as const,
    detail: (nftId: string) => [...queryKeys.nfts.all, 'detail', nftId] as const,
  },
  guestCart: (lines: CartLineInput[]) => ['guest-cart', lines] as const,
  /** Cotação por escopo (usuário ou visitante), itens, cupom e rede; descartada na troca de sessão. */
  quote: (scope: string, request: { items: CartLineInput[]; couponCode?: string; network: Network }) =>
    ['quote', scope, request] as const,
  private: {
    all: ['private'] as const,
    user: (userId: string) => [...queryKeys.private.all, userId] as const,
    session: (userId: string) => [...queryKeys.private.user(userId), 'session'] as const,
    favorites: (userId: string) => [...queryKeys.private.user(userId), 'favorites'] as const,
    cart: (userId: string) => [...queryKeys.private.user(userId), 'cart'] as const,
    order: (userId: string, orderId: string) => [...queryKeys.private.user(userId), 'order', orderId] as const,
    profile: (userId: string) => [...queryKeys.private.user(userId), 'profile'] as const,
    wallets: (userId: string) => [...queryKeys.private.user(userId), 'wallets'] as const,
  },
}
