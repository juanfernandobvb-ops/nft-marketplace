import { expect, test, type Page } from '@playwright/test'
import { startScenario, waitForRealtime } from '../support/scenario.ts'

const summary = (page: Page) => page.getByRole('complementary', { name: 'Resumo da carteira' })
const total = (page: Page) => summary(page).locator('dd').last()
const cartItems = (page: Page) => page.getByRole('region', { name: 'Itens do carrinho' })

/** Carrinho do visitante montado direto no navegador (mesmo formato persistido pela aplicação). */
async function guestCartWith(page: Page, lines: { nftId: string; editionId: string; quantity: number }[]) {
  await page.evaluate((items) => localStorage.setItem('kurio:guest-cart', JSON.stringify(items)), lines)
  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Itens do carrinho' })).toBeAttached()
}

const EMERALD_50 = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 2 }

test.beforeEach(async ({ page }) => {
  await startScenario(page, 'default')
  await page.evaluate(() => {
    localStorage.removeItem('kurio:guest-cart')
    localStorage.removeItem('kurio:coupon')
  })
})

test('carrinho vazio orienta a explorar o catálogo', async ({ page }) => {
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('resumo vem da cotação da API e o cupom trata válido, inválido e expirado', async ({ page }) => {
  await guestCartWith(page, [EMERALD_50])
  // 2 × 1.19 = 2.38 + taxa 0.016
  await expect(total(page)).toHaveText('2.396 ETH')

  const coupon = page.getByLabel('Código promocional')
  await coupon.fill('naoexiste')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('O cupom NAOEXISTE é inválido.')).toBeVisible()
  await expect(total(page)).toHaveText('2.396 ETH')

  await coupon.fill('genesis20')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('O cupom GENESIS20 expirou.')).toBeVisible()

  await coupon.fill('kurio10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText(/Cupom KURIO10 aplicado/)).toBeVisible()
  // 2.38 − 0.238 + 0.016
  await expect(total(page)).toHaveText('2.158 ETH')

  await page.reload()
  await expect(total(page)).toHaveText('2.158 ETH') // cupom e itens persistem após refresh
  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(total(page)).toHaveText('2.396 ETH')
})

test('alterar quantidade e remover item atualizam o resumo', async ({ page }) => {
  await guestCartWith(page, [EMERALD_50, { nftId: 'golden-beat-207', editionId: 'golden-beat-207-open', quantity: 1 }])
  await expect(cartItems(page).getByRole('link', { name: 'Golden Beat #207' })).toBeVisible()
  await page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' }).click()
  await expect(page.getByRole('group', { name: 'Quantidade de Emerald Ape #042' })).toContainText('1')
  await page.getByRole('button', { name: 'Remover Golden Beat #207 do carrinho' }).click()
  await expect(cartItems(page).getByRole('link', { name: 'Golden Beat #207' })).toHaveCount(0)
  // 1.19 + 0.016
  await expect(total(page)).toHaveText('1.206 ETH')
})

test('mudança de preço via Socket.IO com o carrinho aberto é informada e atualiza o resumo', async ({ page }) => {
  await guestCartWith(page, [EMERALD_50])
  await expect(total(page)).toHaveText('2.396 ETH')
  await waitForRealtime(page)
  await page.evaluate(() => window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { price: '1.5' }))
  await expect(summary(page).getByRole('status').filter({ hasText: 'mudou de 1.19 ETH para 1.50 ETH' })).toBeVisible()
  // 2 × 1.5 + 0.016
  await expect(total(page)).toHaveText('3.016 ETH')
})

test('edição esgotada em tempo real bloqueia a finalização até ajustar o item', async ({ page }) => {
  await guestCartWith(page, [EMERALD_50])
  await waitForRealtime(page)
  await page.evaluate(() =>
    window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { editionId: 'emerald-ape-042-1of50', available: 1 }),
  )
  await expect(page.getByText('Restam apenas 1 unidade(s)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  await page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' }).click()
  await expect(page.getByRole('link', { name: 'Conectar e finalizar' })).toBeVisible()
})

test('finalizar como visitante pede login e volta ao pagamento', async ({ page }) => {
  await guestCartWith(page, [EMERALD_50])
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fpagamento/)
})
