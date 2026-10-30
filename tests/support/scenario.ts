import type { Page } from '@playwright/test'

/**
 * Abre a aplicação reiniciando o cenário dos mocks e espera o MSW confirmá-lo.
 * Sem essa espera, navegar logo em seguida pode acontecer antes de o cenário ser gravado.
 */
export async function startScenario(page: Page, name: string, path = '/') {
  const separator = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${separator}scenario=${name}`)
  await page.waitForFunction((expected) => window.__KURIO_MOCKS__?.scenario() === expected, name)
  // Os mocks sobem antes da aplicação: espera também a interface renderizar.
  await page.locator('main#conteudo').waitFor({ state: 'attached' })
}

/** Espera o socket.io-client conectar ao servidor simulado antes de disparar eventos. */
export async function waitForRealtime(page: Page) {
  await page.waitForFunction(() => (window.__KURIO_MOCKS__?.realtime.connections() ?? 0) > 0)
}
