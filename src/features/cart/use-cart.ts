import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { toast } from 'sonner'
import {
  buildPath,
  Cart,
  endpoints,
  Quote,
  type CartItem,
  type CartLineInput,
  type Network,
} from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { cartQuery } from '@/features/cart/api'
import { guestCart, useGuestCartLines } from '@/features/cart/guest-cart'
import { queryKeys } from '@/lib/query-keys'
import { request } from '@/services/http/client'
import { HttpError } from '@/services/http/errors'

const toLines = (items: CartItem[]): CartLineInput[] =>
  items.map(({ nft, edition, quantity }) => ({ nftId: nft.id, editionId: edition.id, quantity }))

const errorMessage = (error: unknown) => (error instanceof HttpError ? error.message : 'Não foi possível atualizar o carrinho.')

/**
 * Carrinho atual com a mesma interface para conta (API) e visitante (navegador + preview na API).
 * Em ambos os casos os preços exibidos vêm da API.
 */
export function useCart() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const guestLines = useGuestCartLines()

  const userCart = useQuery({ ...cartQuery(user?.id ?? ''), enabled: Boolean(user) })
  const guestPreview = useQuery({
    queryKey: queryKeys.guestCart(guestLines),
    queryFn: ({ signal }) =>
      request(Cart, { url: endpoints.cart.preview, method: 'POST', data: { items: guestLines }, signal }),
    enabled: !user && guestLines.length > 0,
    placeholderData: keepPreviousData,
  })
  const query = user ? userCart : guestPreview
  const emptyGuest = !user && guestLines.length === 0

  const setCart = (cart: Cart) => user && queryClient.setQueryData(queryKeys.private.cart(user.id), cart)

  const updateQuantity = useMutation({
    mutationFn: async ({ item, quantity }: { item: CartItem; quantity: number }) => {
      if (!user) return guestCart.setQuantity({ nftId: item.nft.id, editionId: item.edition.id }, quantity)
      setCart(
        await request(Cart, { url: buildPath(endpoints.cart.item, { itemId: item.id }), method: 'PATCH', data: { quantity } }),
      )
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const removeItem = useMutation({
    mutationFn: async (item: CartItem) => {
      if (!user) return guestCart.remove({ nftId: item.nft.id, editionId: item.edition.id })
      setCart(await request(Cart, { url: buildPath(endpoints.cart.item, { itemId: item.id }), method: 'DELETE' }))
    },
    onSuccess: (_data, item) => toast.success(`${item.nft.name} removido do carrinho.`),
    onError: (error) => toast.error(errorMessage(error)),
  })

  const cart = emptyGuest ? undefined : query.data
  return {
    cart,
    lines: cart ? toLines(cart.items) : [],
    isEmpty: emptyGuest || (cart?.items.length ?? -1) === 0,
    isPending: !emptyGuest && query.isPending,
    isError: !emptyGuest && query.isError,
    error: query.error,
    refetch: query.refetch,
    isUpdating: updateQuantity.isPending || removeItem.isPending || query.isFetching,
    updateQuantity: (item: CartItem, quantity: number) => updateQuantity.mutate({ item, quantity }),
    removeItem: (item: CartItem) => removeItem.mutate(item),
  }
}

/**
 * Cotação da API para os itens atuais. Envia a cotação anterior para a API apontar
 * mudanças de preço (PRICE_CHANGED) desde a última vez que o usuário viu os valores.
 */
export function useQuote(items: CartLineInput[], couponCode: string | null, network: Network = 'ethereum') {
  const { user } = useSession()
  const lastQuoteId = useRef<string | undefined>(undefined)
  const body = { items, couponCode: couponCode ?? undefined, network }
  return useQuery({
    queryKey: queryKeys.quote(user?.id ?? 'guest', body),
    queryFn: async ({ signal }) => {
      const quote = await request(Quote, {
        url: endpoints.quote,
        method: 'POST',
        data: { ...body, previousQuoteId: lastQuoteId.current },
        signal,
      })
      lastQuoteId.current = quote.id
      return quote
    },
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
    // A cotação expira na API; refaz antes disso enquanto a tela estiver aberta.
    refetchInterval: 4 * 60_000,
  })
}
