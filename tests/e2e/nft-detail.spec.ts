import { expect, test } from '@playwright/test'
import { waitForRealtime } from '../support/scenario.ts'

const EMERALD = '/nfts/emerald-ape-042'

test('acesso direto ao detalhe carrega o NFT', async ({ page }) => {
  await page.goto(`${EMERALD}?scenario=default`)
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  await expect(page.getByText('ID do token:')).toBeVisible()
})

test('NFT inexistente mostra estado de não encontrado', async ({ page }) => {
  await page.goto('/nfts/nao-existe?scenario=default')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Explorar o catálogo' }).click()
  await expect(page).toHaveURL(/#catalogo/)
})

test('edição esgotada fica indisponível e a quantidade respeita o limite', async ({ page }) => {
  await page.goto(`${EMERALD}?scenario=default`)
  await expect(page.getByRole('radio', { name: '1/1 (esgotada)' })).toBeDisabled()
  await page.getByRole('radio', { name: '1/10' }).click()
  // A edição 1/10 do Emerald tem 6 unidades nas fixtures.
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' }).first()
  for (let i = 0; i < 8; i++) if (await increase.isEnabled()) await increase.click()
  await expect(page.getByRole('group', { name: 'Quantidade' }).first().locator('output')).toHaveText('6')
  await expect(increase).toBeDisabled()
})

test('edição que esgota em tempo real é desabilitada sem recarregar', async ({ page }) => {
  await page.goto(`${EMERALD}?scenario=default`)
  await page.getByRole('radio', { name: '1/10' }).click()
  await waitForRealtime(page)
  await page.evaluate(() =>
    window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { editionId: 'emerald-ape-042-1of10', available: 0 }),
  )
  await expect(page.getByRole('radio', { name: '1/10 (esgotada)' })).toBeDisabled()
  await expect(page.getByText('Esta edição está esgotada.')).toBeVisible()
})

test('visitante adiciona ao carrinho e o contador é atualizado', async ({ page, isMobile }) => {
  await page.goto(`${EMERALD}?scenario=default`)
  await page.evaluate(() => localStorage.removeItem('kurio:guest-cart'))
  await page.reload()
  await page.getByRole('radio', { name: '1/50' }).click()
  await page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho/)
  const cartLink = page.getByRole('link', { name: /Carrinho, 1 item/ })
  await expect(cartLink.first()).toBeAttached()
})
