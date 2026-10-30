import {
  Cart,
  CartLineInput,
  CartLinesInput,
  CreateOrderInput,
  endpoints,
  IDEMPOTENCY_HEADER,
  Order,
  Quote,
  QuoteRequest,
  UpdateCartItemInput,
} from '@/contracts'
import { addLine, cartOf, mergeLines, previewLines, removeLine, setLineQuantity, toCartView } from '@/mocks/db/cart'
import { createOrder, orderFor } from '@/mocks/db/orders'
import { createQuote } from '@/mocks/db/quotes'
import type { DbCart } from '@/mocks/db/types'
import { fail, json, optionalUser, parseBody, requireUser, route } from '@/mocks/handlers/http'

const cartResponse = (cart: DbCart) => json(Cart, toCartView(cart.lines, cart.updatedAt))

export const commerceHandlers = [
  route('GET', endpoints.cart.root, ({ request }) => cartResponse(cartOf(requireUser(request).id))),

  route('POST', endpoints.cart.items, async ({ request }) => {
    const user = requireUser(request)
    return cartResponse(addLine(user.id, await parseBody(request, CartLineInput)))
  }),

  route('PATCH', endpoints.cart.item, async ({ request, param }) => {
    const user = requireUser(request)
    const { quantity } = await parseBody(request, UpdateCartItemInput)
    return cartResponse(setLineQuantity(user.id, param('itemId'), quantity))
  }),

  route('DELETE', endpoints.cart.item, ({ request, param }) =>
    cartResponse(removeLine(requireUser(request).id, param('itemId'))),
  ),

  route('POST', endpoints.cart.merge, async ({ request }) => {
    const user = requireUser(request)
    const { items } = await parseBody(request, CartLinesInput)
    return cartResponse(mergeLines(user.id, items))
  }),

  route('POST', endpoints.cart.preview, async ({ request }) => {
    const { items } = await parseBody(request, CartLinesInput)
    return json(Cart, previewLines(items))
  }),

  route('POST', endpoints.quote, async ({ request }) => {
    const user = optionalUser(request)
    return json(Quote, createQuote(await parseBody(request, QuoteRequest), user?.id ?? null))
  }),

  route('POST', endpoints.orders.create, async ({ request }) => {
    const user = requireUser(request)
    const key = request.headers.get(IDEMPOTENCY_HEADER)
    if (!key) throw fail.validation({ [IDEMPOTENCY_HEADER]: 'Cabeçalho obrigatório.' })
    const { order, created } = createOrder(user, await parseBody(request, CreateOrderInput), key)
    return json(Order, order, created ? 201 : 200)
  }),

  route('GET', endpoints.orders.detail, ({ request, param }) => json(Order, orderFor(requireUser(request), param('orderId')))),
]
