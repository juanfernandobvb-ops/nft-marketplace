import { expect, test, type Page } from '@playwright/test'
import { startScenario, waitForRealtime } from '../support/scenario.ts'
import { loginAs, orderCount } from '../support/session.ts'

const EMERALD_50 = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 2 }

/** Ana (com carteira MetaMask cadastrada) no pagamento, com o Emerald Ape no carrinho. */
async function checkoutAsAna(page: Page, scenario = 'default') {
  await startScenario(page, scenario)
  await page.evaluate((line) => {
    localStorage.setItem('kurio:guest-cart', JSON.stringify([line]))
    localStorage.removeItem('kurio:coupon')
  }, EMERALD_50)
  await loginAs(page, 'ana@kurio.dev', '/pagamento')
}

async function connectAndReview(page: Page) {
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByText('Conectada:')).toBeVisible()
  await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeVisible()
}

const confirmButton = (page: Page) => page.getByRole('dialog').getByRole('button', { name: /Confirmar compra|Tentar novamente/ })

/** O pagamento simulado leva 2,5 s para ser liquidado (cenários default e payment-rejected). */
const PAYMENT_SETTLE = 3_000

test('compra completa do catálogo ao recibo confirmado', async ({ page, isMobile }) => {
  await page.clock.install()
  await startScenario(page, 'default')
  await loginAs(page, 'ana@kurio.dev', '/')
  await page.getByRole('heading', { name: 'Emerald Ape #042' }).click()
  await page.getByRole('radio', { name: '1/50' }).click()
  await page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR' }).click()
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/pagamento$/)

  await connectAndReview(page)
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\//)
  await expect(page.getByText('Processando seu pagamento')).toBeVisible()
  await page.clock.fastForward(PAYMENT_SETTLE)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await expect(page.getByRole('cell', { name: /Emerald Ape #042/ })).toBeVisible()
  // Após a confirmação, o item comprado sai do carrinho.
  await page.goto('/carrinho')
  await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
})

test('formulário valida os campos e exige carteira conectada antes da revisão', async ({ page }) => {
  await checkoutAsAna(page)
  await page.getByRole('textbox', { name: 'Nome de exibição' }).fill('')
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('invalido')
  await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
  await expect(page.getByText('Informe o nome de exibição')).toBeVisible()
  await expect(page.getByText('E-mail inválido')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('rascunho do formulário sobrevive à expiração da sessão', async ({ page }) => {
  await page.clock.install()
  await checkoutAsAna(page)
  await page.getByLabel('Observação do colecionador (opcional)').fill('Presente para a coleção')
  // A sessão simulada dura 30 min: a hora avança além disso sem disparar os timers da página
  // (ping do socket, polling), para a expiração ser detectada exatamente na próxima ação.
  await page.clock.setSystemTime(Date.now() + 31 * 60_000)
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fpagamento/)
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.dev')
  await page.getByLabel('Senha', { exact: true }).fill('kurio1234')
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Presente para a coleção')
})

test('carteira recusa a conexão e aceita na nova tentativa', async ({ page }) => {
  await checkoutAsAna(page, 'wallet-rejected')
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByText('A conexão foi recusada na carteira')).toBeVisible()
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByText('Conectada:')).toBeVisible()
  await page.getByRole('button', { name: 'Desconectar' }).click()
  await expect(page.getByRole('button', { name: 'Conectar MetaMask' })).toBeVisible()
})

test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
  await page.clock.install()
  await checkoutAsAna(page, 'payment-rejected')
  await connectAndReview(page)
  await confirmButton(page).click()
  await expect(page.getByText('Processando seu pagamento')).toBeVisible()
  await page.clock.fastForward(PAYMENT_SETTLE)
  await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
  await page.getByRole('link', { name: 'Ver carrinho' }).click()
  await expect(page.getByRole('region', { name: 'Itens do carrinho' }).getByText('Emerald Ape #042')).toBeVisible()
})

test('clique repetido em confirmar não duplica o pedido', async ({ page }) => {
  await checkoutAsAna(page)
  await connectAndReview(page)
  await confirmButton(page).dblclick()
  await expect(page).toHaveURL(/\/pedidos\//)
  expect(await orderCount(page)).toBe(1)
})

test('timeout após criar o pedido: o reenvio recupera o mesmo pedido', async ({ page }) => {
  await page.clock.install()
  await checkoutAsAna(page, 'order-timeout')
  await connectAndReview(page)
  await confirmButton(page).click()
  // O servidor registra o pedido, mas a resposta se perde; o cliente desiste após 10 s.
  await expect.poll(() => orderCount(page)).toBe(1)
  await page.clock.fastForward(10_500)
  await expect(page.getByText('Não recebemos a confirmação do servidor')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page).toHaveURL(/\/pedidos\//)
  expect(await orderCount(page)).toBe(1)
})

test('preço alterado via Socket.IO durante a revisão exige nova confirmação', async ({ page }) => {
  await checkoutAsAna(page)
  await connectAndReview(page)
  await waitForRealtime(page)
  await page.evaluate(() => window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { price: '1.5' }))
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Os valores mudaram desde a sua revisão')).toBeVisible()
  await expect(confirmButton(page)).toBeDisabled()
  await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
  // 2 × 1.5 + 0.016
  await expect(confirmButton(page)).toHaveText('Confirmar compra • 3.016 ETH')
  await confirmButton(page).click()
  await expect(page).toHaveURL(/\/pedidos\//)
})

test('pedido pendente é retomado após refresh e queda da conexão em tempo real', async ({ page }) => {
  await page.clock.install()
  await checkoutAsAna(page, 'payment-slow')
  await connectAndReview(page)
  await confirmButton(page).click()
  await expect(page.getByText('Processando seu pagamento')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Processando seu pagamento')).toBeVisible()

  // Sem conexão em tempo real, a confirmação chega pela consulta de reserva à API.
  await page.evaluate(() => window.__KURIO_MOCKS__?.realtime.setAvailable(false))
  // O cenário payment-slow mantém o pedido pendente por 15 s.
  await page.clock.fastForward(15_000)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  await page.evaluate(() => window.__KURIO_MOCKS__?.realtime.setAvailable(true))
  expect(await orderCount(page)).toBe(1)
})

test('eventos duplicados ou antigos não regridem o estado', async ({ page }) => {
  await startScenario(page, 'default')
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'Emerald Ape #042' }) })
  // Preço atual (o anterior aparece riscado ao lado).
  const price = card.locator('p').first().locator('span').first()
  await waitForRealtime(page)
  await page.evaluate(() => window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { price: '2.5' }))
  await expect(price).toHaveText('2.50 ETH')
  await page.evaluate(() => window.__KURIO_MOCKS__?.updateNft('emerald-ape-042', { price: '3' }))
  await expect(price).toHaveText('3.00 ETH')
  // Reenvia o evento da versão anterior (2.5) e o mais recente (duplicata).
  await page.evaluate(() => {
    const events = window.__KURIO_MOCKS__?.realtime.events().filter((event) => event.resource.id === 'emerald-ape-042') ?? []
    for (const event of events) window.__KURIO_MOCKS__?.realtime.replay(event.id)
  })
  await page.waitForTimeout(500)
  await expect(price).toHaveText('3.00 ETH')
})
