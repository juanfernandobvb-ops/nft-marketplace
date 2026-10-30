import { expect, test, type Page } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'
import { loginAs } from '../support/session.ts'

const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })

// PNG 1×1 válido para o envio de avatar.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  await startScenario(page, 'default')
})

test('perfil: edição persiste após refresh e conflito de usuário é tratado', async ({ page }) => {
  await loginAs(page, 'ana@kurio.dev', '/perfil')
  await field(page, 'Nome de usuário').fill('bruno.criador')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

  await field(page, 'Nome de usuário').fill('ana.colecionadora')
  await field(page, 'Nome de exibição').fill('Ana Atualizada')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Perfil atualizado.')).toBeVisible()
  await page.reload()
  await expect(field(page, 'Nome de exibição')).toHaveValue('Ana Atualizada')
})

test('perfil: validação dos campos obrigatórios', async ({ page }) => {
  await loginAs(page, 'ana@kurio.dev', '/perfil')
  await field(page, 'Nome de exibição').fill('')
  await field(page, 'E-mail').fill('sem-arroba')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Informe o nome de exibição')).toBeVisible()
  await expect(page.getByText('E-mail inválido')).toBeVisible()
})

test('avatar: envio, persistência e remoção', async ({ page }) => {
  await loginAs(page, 'ana@kurio.dev', '/perfil')
  await page.getByLabel('Escolher imagem do avatar').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PIXEL })
  await expect(page.getByRole('img', { name: 'Avatar atual' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: 'Avatar atual' })).toBeVisible()
  await page.getByRole('button', { name: 'Remover' }).click()
  await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
})

test('senha: erro de senha atual e troca efetiva', async ({ page }) => {
  // Ana tem o perfil completo; o Bruno começa sem os campos obrigatórios de ENS e apelido.
  await loginAs(page, 'ana@kurio.dev', '/perfil')
  const current = page.getByLabel('Senha atual', { exact: true })
  await current.fill('errada123')
  await page.getByLabel('Nova senha', { exact: true }).fill('novasenha123')
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('outra')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('As senhas não coincidem')).toBeVisible()

  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('novasenha123')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

  await current.fill('kurio1234')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Perfil e senha atualizados.')).toBeVisible()

  // A nova senha passa a valer no login.
  await page.evaluate(() => localStorage.removeItem('kurio:session'))
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.dev')
  await page.getByLabel('Senha', { exact: true }).fill('novasenha123')
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('carteiras: validação, cadastro da principal e da secundária com persistência', async ({ page }) => {
  await loginAs(page, 'bruno@kurio.dev', '/carteiras')
  await page.getByRole('button', { name: 'Adicionar' }).first().click()
  const primary = page.getByRole('form', { name: 'Carteira principal' })
  await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill('0x123')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByText('Endereço inválido para a rede selecionada')).toBeVisible()
  await expect(primary.getByText('Informe o apelido da carteira')).toBeVisible()

  await primary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Principal do Bruno')
  await primary.getByRole('textbox', { name: 'Endereço da carteira' }).fill(`0x${'b'.repeat(40)}`)
  await primary.getByRole('textbox', { name: 'Código de indicação' }).fill('KURIO-BRUNO')
  await primary.getByRole('textbox', { name: 'Nome ENS' }).fill('bruno')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira principal salva.')).toBeVisible()

  await page.getByLabel('Igual à carteira principal').check()
  await page.getByRole('button', { name: 'Adicionar' }).click()
  const secondary = page.getByRole('form', { name: 'Carteira secundária' })
  await expect(secondary.getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue('Principal do Bruno')
  await secondary.getByRole('textbox', { name: 'Apelido da carteira' }).fill('Reserva do Bruno')
  await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira secundária salva.')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByRole('textbox', { name: 'Apelido da carteira' })).toHaveValue(
    'Reserva do Bruno',
  )
})
