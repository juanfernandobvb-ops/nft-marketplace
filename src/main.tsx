import { env } from '@/config/env'
import '@/styles/globals.css'

async function bootstrap() {
  // O MSW precisa substituir globalThis.WebSocket antes de o socket.io-client ser avaliado,
  // por isso a aplicação só é importada depois que os mocks iniciam.
  if (env.enableMocks) {
    const { startMocks } = await import('@/mocks/browser')
    await startMocks()
  }
  const { renderApp } = await import('@/app/render')
  renderApp(document.getElementById('root')!)
}

bootstrap()
