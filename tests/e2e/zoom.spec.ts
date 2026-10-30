import { expect, test, type Page } from '@playwright/test'
import { expectReflow } from '../support/layout.ts'
import { startScenario } from '../support/scenario.ts'
import { loginAs } from '../support/session.ts'

// Zoom do navegador reduz a largura em pixels CSS: 200% numa tela de 1280 px = 640 px;
// 400% = 320 px, o limite de reflow da WCAG (1.4.10). O conteúdo deve se reorganizar sem cortes.
const ZOOMS = [
  { label: '200%', width: 640 },
  { label: '400%', width: 320 },
]

const CART_LINE = { nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 2 }

async function visit(page: Page, path: string) {
  await page.goto(path)
  await page.locator('main#conteudo').waitFor({ state: 'attached' })
  await page.waitForLoadState('networkidle')
}

test.beforeEach(({ isMobile }, testInfo) => {
  test.skip(isMobile || testInfo.project.name !== 'desktop', 'O zoom é simulado a partir do perfil desktop')
})

for (const { label, width } of ZOOMS) {
  test(`zoom de ${label}: telas se reorganizam sem rolagem horizontal nem perda de conteúdo`, async ({ page }) => {
    await page.clock.install()
    await page.setViewportSize({ width, height: 800 })
    await startScenario(page, 'default')
    await page.evaluate((line) => localStorage.setItem('kurio:guest-cart', JSON.stringify([line])), CART_LINE)
    for (const path of ['/', '/nfts/emerald-ape-042', '/carrinho', '/login', '/cadastro']) {
      await visit(page, path)
      await expectReflow(page, path)
    }

    await loginAs(page, 'ana@kurio.dev', '/pagamento')
    await expectReflow(page, '/pagamento')
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText('Conectada:')).toBeVisible()
    await page.getByRole('button', { name: 'Revisar e confirmar compra' }).click()
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(dialog).toBeVisible()
    await expectReflow(page, 'revisão do pedido')

    await dialog.getByRole('button', { name: /Confirmar compra/ }).click()
    await expect(page).toHaveURL(/\/pedidos\//)
    await page.clock.fastForward(3_000)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    await expectReflow(page, 'recibo')

    for (const path of ['/perfil', '/carteiras']) {
      await visit(page, path)
      await expectReflow(page, path)
    }
  })
}
