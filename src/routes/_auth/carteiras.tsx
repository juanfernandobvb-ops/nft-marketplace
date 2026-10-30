import { createFileRoute } from '@tanstack/react-router'
import { WalletsView } from '@/features/wallets/components/wallets-view'

export const Route = createFileRoute('/_auth/carteiras')({
  component: WalletsView,
})
