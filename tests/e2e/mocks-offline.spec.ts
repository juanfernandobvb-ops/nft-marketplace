import { expect, test } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'

const FRIENDLY = 'A demonstração não carregou direito'

test('requisição que escapa da API simulada mostra uma orientação amigável', async ({ page, context }) => {
  await startScenario(page, 'default')
  // Equivale a marcar "Bypass for network" no DevTools: as requisições deixam de passar pelo MSW
  // e o servidor de arquivos responde com a página HTML da aplicação.
  const devtools = await context.newCDPSession(page)
  await devtools.send('Network.enable')
  await devtools.send('Network.setBypassServiceWorker', { bypass: true })

  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.dev')
  await page.getByLabel('Senha', { exact: true }).fill('kurio1234')
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: FRIENDLY })).toBeVisible()
  await expect(page.getByText('Resposta inesperada do servidor')).toHaveCount(0)
})
