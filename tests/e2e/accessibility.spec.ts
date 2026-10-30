import { expect, test, type Locator, type Page } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'

/** Foco visível: o elemento focado precisa ter contorno (outline) ou anel (box-shadow) desenhado. */
async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused()
  const style = await locator.evaluate((element) => {
    const computed = getComputedStyle(element)
    return { outline: computed.outlineStyle, width: computed.outlineWidth, shadow: computed.boxShadow }
  })
  expect(style.outline !== 'none' && style.width !== '0px' || style.shadow !== 'none').toBe(true)
}

/** Avança com Tab até o foco estar no locator (limite para evitar laço infinito). */
async function tabTo(page: Page, target: Locator, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('Elemento não alcançado pelo teclado')
}

test.beforeEach(async ({ page }) => {
  await startScenario(page, 'default')
})

test('link "Pular para o conteúdo" é o primeiro foco e leva ao conteúdo principal', async ({ page }) => {
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expectVisibleFocus(skip)
  await page.keyboard.press('Enter')
  await expect(page.locator('main#conteudo')).toBeFocused()
})

test('catálogo é operável por teclado até o detalhe do NFT', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Navegação por Tab é avaliada no layout desktop')
  const segment = page.getByRole('button', { name: 'Em alta' })
  await tabTo(page, segment)
  await expectVisibleFocus(segment)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/segment=trending/)
  await expect(segment).toHaveAttribute('aria-pressed', 'true')

  const card = page.locator('#catalogo ul[aria-busy="false"] li a').first()
  await tabTo(page, card)
  await expectVisibleFocus(card)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/nfts\//)
})

test('diálogo de imagem prende o foco, fecha com Esc e devolve o foco ao gatilho', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Emerald Ape #042' })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('modal de login prende o foco e valida o formulário só com teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'No mobile o login é uma página, não um modal')
  await page.goto('/login')
  const dialog = page.getByRole('dialog', { name: 'Entrar' })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
  const email = page.getByLabel('E-mail', { exact: true })
  await email.focus()
  await email.fill('invalido')
  await page.keyboard.press('Enter')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  // A mensagem de erro é associada ao campo (lida pelo leitor de tela junto com ele).
  const describedBy = await email.getAttribute('aria-describedby')
  await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('E-mail inválido')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('seletores de edição e quantidade funcionam pelo teclado', async ({ page }) => {
  await page.goto('/nfts/emerald-ape-042')
  const edition = page.getByRole('radio', { name: '1/50' })
  await edition.focus()
  await expectVisibleFocus(edition)
  await page.keyboard.press('Space')
  await expect(edition).toHaveAttribute('aria-checked', 'true')
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' }).first()
  await increase.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('group', { name: 'Quantidade' }).first().locator('output')).toHaveText('2')
})
