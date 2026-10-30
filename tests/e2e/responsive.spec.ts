import { expect, test, type Page } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'
import { loginAs } from '../support/session.ts'

const CART_LINE = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 2 }

async function expectNoHorizontalOverflow(page: Page, path: string) {
  await page.goto(path)
  await page.locator('main#conteudo').waitFor({ state: 'attached' })
  await page.waitForLoadState('networkidle')
  // Em mobile, conteúdo largo demais amplia o viewport de layout (zoom-out) em vez de rolar.
  expect(await page.evaluate(() => window.innerWidth), `largura de layout em ${path}`).toBe(page.viewportSize()?.width)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `rolagem horizontal em ${path}`).toBeLessThanOrEqual(0)
}

test('telas públicas não geram rolagem horizontal', async ({ page }) => {
  await startScenario(page, 'default')
  await page.evaluate((line) => localStorage.setItem('kurio:guest-cart', JSON.stringify([line])), CART_LINE)
  for (const path of ['/', '/nfts/emerald-ape-042', '/carrinho', '/login', '/cadastro']) {
    await expectNoHorizontalOverflow(page, path)
  }
})

test('telas autenticadas não geram rolagem horizontal', async ({ page }) => {
  await startScenario(page, 'default')
  await page.evaluate((line) => localStorage.setItem('kurio:guest-cart', JSON.stringify([line])), CART_LINE)
  // O cabeçalho logado (nome do usuário) é o mais largo.
  await loginAs(page, 'ana@kurio.dev', '/')
  for (const path of ['/', '/carrinho', '/pagamento', '/perfil', '/carteiras']) {
    await expectNoHorizontalOverflow(page, path)
  }
})
