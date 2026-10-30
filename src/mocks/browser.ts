import { setupWorker } from 'msw/browser'
import { applyUrlControls, mockControl } from '@/mocks/control'
import { resumePendingOrders } from '@/mocks/db/orders'
import { handlers } from '@/mocks/handlers'

export const worker = setupWorker(...handlers)

export async function startMocks() {
  applyUrlControls()
  resumePendingOrders()
  window.__KURIO_MOCKS__ = mockControl
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
}
