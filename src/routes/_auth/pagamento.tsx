import { createFileRoute } from '@tanstack/react-router'
import { CheckoutView } from '@/features/checkout/components/checkout-view'

export const Route = createFileRoute('/_auth/pagamento')({
  component: CheckoutView,
})
