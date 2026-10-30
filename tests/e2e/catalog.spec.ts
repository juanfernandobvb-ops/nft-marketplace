import { expect, test, type Page } from '@playwright/test'
import { waitForRealtime } from '../support/scenario.ts'

// Cada teste parte de um estado conhecido: o cenário é reiniciado pela URL.
async function openHome(page: Page, query = '') {
  await page.goto(`/?scenario=default${query}`)
  await page.waitForFunction(() => Boolean(window.__KURIO_MOCKS__))
}

/** Lista estável: sem requisição em andamento nem dados provisórios. */
const settledGrid = (page: Page) => page.locator('#catalogo ul[aria-busy="false"]:not(.opacity-60)')

const card = (page: Page, name: string) => page.getByRole('listitem').filter({ has: page.getByRole('heading', { name }) })

test('filtros, ordenação e paginação compõem a URL e sobrevivem a refresh e histórico', async ({ page, isMobile }) => {
  await openHome(page)
  await expect(card(page, 'Emerald Ape #042')).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
  const filters = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Filtros' })

  await filters.getByRole('button', { name: /Polygon/ }).click()
  await expect(page).toHaveURL(/networks/)
  if (isMobile) await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /Listados recentemente/ }).click()
  await page.getByRole('menuitemradio', { name: 'Menor preço' }).click()
  await expect(page).toHaveURL(/sort=price-asc/)

  const firstPrice = settledGrid(page).locator('li').first().locator('p').first()
  await expect(firstPrice).toHaveText('0.12 ETH') // NFT mais barato da Polygon nas fixtures
  await page.reload()
  await expect(firstPrice).toHaveText('0.12 ETH')

  await page.goBack()
  await expect(page).not.toHaveURL(/sort=price-asc/)
  await expect(page).toHaveURL(/networks/)
})

test('mudança de filtro reinicia a paginação', async ({ page }) => {
  await openHome(page)
  await expect(card(page, 'Emerald Ape #042')).toBeVisible()
  await page.getByRole('button', { name: 'Página 2' }).click()
  await expect(page).toHaveURL(/page=2/)
  await page.getByRole('button', { name: 'Em alta' }).click()
  await expect(page).toHaveURL(/segment=trending/)
  await expect(page).not.toHaveURL(/page=/)
})

test('busca sem resultados mostra estado vazio e permite limpar', async ({ page }) => {
  await openHome(page, '&q=inexistente')
  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(card(page, 'Emerald Ape #042')).toBeVisible()
})

test('nft.updated via Socket.IO atualiza o preço no catálogo sem recarregar', async ({ page }) => {
  await openHome(page)
  await expect(card(page, 'Emerald Ape #042')).toContainText('1.19 ETH')
  await waitForRealtime(page)
  await page.evaluate(() => window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { price: '2.5' }))
  await expect(card(page, 'Emerald Ape #042')).toContainText('2.50 ETH')
  await expect(card(page, 'Emerald Ape #042')).toContainText('1.19 ETH') // preço anterior riscado
})

test('falha transitória mostra erro e recupera ao tentar novamente', async ({ page }) => {
  await page.goto('/?scenario=server-error')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar o catálogo' })).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => {
    window.__KURIO_MOCKS__?.useScenario('default')
  })
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(card(page, 'Emerald Ape #042')).toBeVisible()
})
