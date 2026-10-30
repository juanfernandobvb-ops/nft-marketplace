import { createFileRoute } from '@tanstack/react-router'
import { CartView } from '@/features/cart/components/cart-view'

export const Route = createFileRoute('/carrinho')({
  component: CartView,
})
