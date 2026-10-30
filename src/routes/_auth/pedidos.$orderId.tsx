import { createFileRoute } from '@tanstack/react-router'
import { OrderView } from '@/features/orders/components/order-view'

export const Route = createFileRoute('/_auth/pedidos/$orderId')({
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  return <OrderView orderId={orderId} />
}
