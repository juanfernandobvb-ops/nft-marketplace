import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cart, endpoints, type CartLineInput } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { guestCart, useGuestCartLines } from '@/features/cart/guest-cart'
import { queryKeys } from '@/lib/query-keys'
import { request } from '@/services/http/client'

export const cartQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.private.cart(userId),
    queryFn: ({ signal }) => request(Cart, { url: endpoints.cart.root, signal }),
  })

/** Quantidade total de itens: carrinho da conta (API) ou do visitante (navegador). */
export function useCartCount() {
  const { user } = useSession()
  const guestLines = useGuestCartLines()
  const { data } = useQuery({ ...cartQuery(user?.id ?? ''), enabled: Boolean(user) })
  const lines = user ? (data?.items ?? []) : guestLines
  return lines.reduce((total, line) => total + line.quantity, 0)
}

/** Adiciona ao carrinho da conta (API valida a disponibilidade) ou ao do visitante (navegador). */
export function useAddToCart() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: async ({ limit, ...line }: CartLineInput & { limit: number }) => {
      if (!user) {
        guestCart.add(line, limit)
        return null
      }
      return request(Cart, { url: endpoints.cart.items, method: 'POST', data: line })
    },
    onSuccess: (cart) => {
      if (user && cart) queryClient.setQueryData(queryKeys.private.cart(user.id), cart)
    },
  })
}
