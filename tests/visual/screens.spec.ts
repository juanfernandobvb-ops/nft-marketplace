import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'
import { loginAs } from '../support/session.ts'

// Regressão visual das telas principais com dados estáveis (cenário default, fixtures com semente fixa).
// As baselines são por sistema operacional: a renderização de fontes muda entre eles.

/** Carrega todas as imagens (inclusive as lazy) e as fontes antes da captura de página inteira. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(async () => {
    document.documentElement.dataset.fullpage = ''
    for (const image of document.images) image.loading = 'eager'
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)))
    await document.fonts.ready
  })
}

const CART = [{ nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 2 }]

test.beforeEach(async ({ page }, testInfo) => {
  const updating = testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed'
  test.skip(
    !updating && !existsSync(dirname(testInfo.snapshotPath('inicio.png'))),
    `Sem baselines visuais para ${process.platform}: rode "npm run test:visual:docker" (Linux, via Docker).`,
  )
  await startScenario(page, 'default')
  await page.evaluate(() => {
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:coupon')
  })
})

test('início', async ({ page }) => {
  await page.reload()
  await expect(page.locator('#catalogo ul[aria-busy="false"]')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
})

test('detalhe do NFT', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Mais desta coleção' }).locator('img').first()).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
})

test('carrinho', async ({ page }) => {
  await page.evaluate((lines) => localStorage.setItem('kurio:guest-cart', JSON.stringify(lines)), CART)
  await page.goto('/carrinho')
  await expect(page.getByRole('complementary', { name: 'Resumo da carteira' }).getByText('2.396 ETH')).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
})

test('pagamento', async ({ page }) => {
  await page.evaluate((lines) => localStorage.setItem('kurio:guest-cart', JSON.stringify(lines)), CART)
  await loginAs(page, 'ana@kurio.dev', '/pagamento')
  await expect(page.getByText('2.396 ETH').first()).toBeVisible()
  await settle(page)
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
})

test('início: primeira dobra com a navegação fixa', async ({ page }) => {
  await page.reload()
  await expect(page.locator('#catalogo ul[aria-busy="false"]')).toBeVisible()
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('inicio-dobra.png')
})
