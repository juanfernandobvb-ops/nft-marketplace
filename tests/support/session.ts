import { expect, type Page } from '@playwright/test'

/** Login pela interface, voltando ao caminho indicado; espera as consultas privadas iniciais. */
export async function loginAs(page: Page, email: string, redirect = '/') {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('kurio1234')
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === redirect)
  await page.waitForLoadState('networkidle')
}

/** Quantidade de pedidos registrados no servidor simulado (para provar que não houve duplicação). */
export const orderCount = (page: Page) =>
  page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kurio:mocks:db') ?? '{}').orders ?? {}).length)
