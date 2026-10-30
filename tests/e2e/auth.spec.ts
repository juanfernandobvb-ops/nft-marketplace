import { expect, test, type Page } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'

const EMERALD = '/nfts/emerald-ape-042'
const favoriteButton = (page: Page) => page.getByRole('button', { name: /^(Favoritar|Favorito|Remover dos favoritos)$/ })

async function fillLogin(page: Page, email: string, password = 'kurio1234') {
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
}

async function loginAt(page: Page, path: string, email: string) {
  await page.goto(`/login?redirect=${encodeURIComponent(path)}`)
  await fillLogin(page, email)
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[$/]/g, '\\$&')}$`))
  // Consultas privadas iniciais concluídas (favoritos, carrinho) antes de interagir.
  await page.waitForLoadState('networkidle')
}

test.beforeEach(async ({ page }) => {
  await startScenario(page, 'default')
  await page.evaluate(() => localStorage.removeItem('kurio:guest-cart'))
})

test('rota privada leva ao login e volta ao destino após autenticar', async ({ page }) => {
  await page.goto('/perfil')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/)
  await fillLogin(page, 'ana@kurio.dev', 'senhaerrada')
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos')
  await fillLogin(page, 'ana@kurio.dev')
  await expect(page).toHaveURL(/\/perfil$/)
})

test('cadastro valida campos, trata conflito e cria a conta', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
  await expect(page.getByText('Mínimo de 8 caracteres')).toBeVisible()

  await page.getByLabel('Nome de usuário').fill('ana.colecionadora')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.dev')
  await page.getByLabel('Senha', { exact: true }).fill('novasenha123')
  await page.getByLabel('Confirmar senha').fill('novasenha123')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
  await expect(page.getByText('Este e-mail já está cadastrado.')).toBeVisible()
  await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

  await page.getByLabel('Nome de usuário').fill('nova.colecionadora')
  await page.getByLabel('E-mail', { exact: true }).fill('nova@kurio.dev')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).last().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Conta criada!')).toBeVisible()
})

test('favoritar sem sessão leva ao login e retorna ao NFT', async ({ page }) => {
  await page.goto(EMERALD)
  await favoriteButton(page).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await fillLogin(page, 'bruno@kurio.dev')
  await expect(page).toHaveURL(new RegExp(`${EMERALD}$`))
  await favoriteButton(page).click()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')
})

test('logout e troca de usuário não mantêm dados privados da sessão anterior', async ({ page, isMobile }) => {
  await loginAt(page, EMERALD, 'ana@kurio.dev')
  // Emerald Ape é favorito da Ana nas fixtures.
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'true')

  if (isMobile) {
    await page.evaluate(() => localStorage.removeItem('kurio:session'))
    await page.reload()
  } else {
    await page.getByRole('button', { name: 'Ana Colecionadora' }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible()
  }

  await loginAt(page, EMERALD, 'bruno@kurio.dev')
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
})

test('sessão expirada durante a navegação avisa e permite retomar', async ({ page }) => {
  await page.clock.install()
  await loginAt(page, EMERALD, 'bruno@kurio.dev')
  // A sessão simulada dura 30 min: o relógio avança além disso.
  await page.clock.fastForward('31:00')
  await favoriteButton(page).click()
  await expect(page.getByText('Sua sessão expirou')).toBeVisible()
  await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await fillLogin(page, 'bruno@kurio.dev')
  await expect(page).toHaveURL(new RegExp(`${EMERALD}$`))
})

test('itens do visitante são preservados ao autenticar', async ({ page, isMobile }) => {
  await page.goto(EMERALD)
  await page.getByRole('radio', { name: '1/50' }).click()
  await page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/carrinho/)

  await loginAt(page, '/', 'bruno@kurio.dev')
  await expect(page.getByRole('link', { name: /Carrinho, 1 item/ }).first()).toBeAttached()
  expect(await page.evaluate(() => localStorage.getItem('kurio:guest-cart'))).toBe('[]')
})

test('falha ao favoritar desfaz a atualização otimista e avisa', async ({ page }) => {
  await startScenario(page, 'favorites-error')
  await loginAt(page, '/nfts/sage-nomad-009', 'bruno@kurio.dev')
  await favoriteButton(page).click()
  await expect(page.getByText('Não foi possível favoritar')).toBeVisible()
  await expect(favoriteButton(page)).toHaveAttribute('aria-pressed', 'false')
})
