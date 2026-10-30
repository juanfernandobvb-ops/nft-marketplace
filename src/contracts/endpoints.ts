/**
 * Rotas REST relativas a `env.apiUrl`, no formato de path do MSW (`:param`).
 * O Axios resolve os parâmetros com `buildPath`; os handlers usam o padrão como está.
 */
export const endpoints = {
  auth: {
    register: '/auth/register', // POST
    login: '/auth/login', // POST
    session: '/auth/session', // GET
    logout: '/auth/logout', // POST
  },
  nfts: {
    list: '/nfts', // GET ?NftListQuery
    detail: '/nfts/:nftId', // GET
  },
  favorites: {
    list: '/favorites', // GET
    item: '/favorites/:nftId', // PUT | DELETE
  },
  cart: {
    root: '/cart', // GET
    items: '/cart/items', // POST
    item: '/cart/items/:itemId', // PATCH | DELETE
    merge: '/cart/merge', // POST
    preview: '/cart/preview', // POST: resolve o carrinho do visitante sem persistir
  },
  quote: '/quote', // POST
  orders: {
    create: '/orders', // POST + Idempotency-Key
    detail: '/orders/:orderId', // GET
  },
  profile: {
    root: '/profile', // GET | PATCH
    avatar: '/profile/avatar', // POST (multipart) | DELETE
    password: '/profile/password', // POST
  },
  wallets: {
    list: '/wallets', // GET
    slot: '/wallets/:slot', // PUT
    connect: '/wallets/:slot/connect', // POST: conexão simulada da carteira
  },
} as const

export function buildPath(pattern: string, params: Record<string, string>) {
  return pattern.replace(/:(\w+)/g, (_, key: string) => {
    const value = params[key]
    if (value === undefined) throw new Error(`Parâmetro ausente "${key}" em ${pattern}`)
    return encodeURIComponent(value)
  })
}
