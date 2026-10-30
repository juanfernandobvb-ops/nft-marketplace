import { expect, test } from '@playwright/test'
import { startScenario } from '../support/scenario.ts'

const skeletons = '[data-slot="skeleton"]'

test('rede lenta: catálogo mostra skeletons com as dimensões dos cards e depois o conteúdo', async ({ page }) => {
  await startScenario(page, 'slow')
  // Skeleton da imagem do card (os filtros laterais também têm skeletons).
  const firstSkeletonCard = page.locator(`#catalogo .aspect-square${skeletons}`).first()
  await expect(firstSkeletonCard).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Carregando NFTs' })).toBeAttached()
  const placeholder = await firstSkeletonCard.boundingBox()

  const firstImage = page.locator('#catalogo ul[aria-busy] li img').first()
  await expect(firstImage).toBeVisible({ timeout: 10_000 })
  const loaded = await firstImage.boundingBox()
  // O skeleton ocupa o mesmo espaço da imagem real: sem deslocamento de layout ao carregar.
  expect(Math.abs((placeholder?.height ?? 0) - (loaded?.height ?? 0))).toBeLessThanOrEqual(2)
  expect(Math.abs((placeholder?.width ?? 0) - (loaded?.width ?? 0))).toBeLessThanOrEqual(2)
})

test('rede lenta: detalhe e carrinho mostram skeletons enquanto carregam', async ({ page }) => {
  await startScenario(page, 'slow')
  await page.goto('/nfts/emerald-ape-042')
  await expect(page.getByLabel('Carregando NFT')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible({ timeout: 10_000 })

  await page.evaluate(() =>
    localStorage.setItem('kurio:guest-cart', JSON.stringify([{ nftId: 'emerald-ape-042', editionId: 'emerald-ape-042-1of50', quantity: 1 }])),
  )
  await page.goto('/carrinho')
  await expect(page.getByLabel('Carregando carrinho')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Itens do carrinho' })).toBeVisible({ timeout: 10_000 })
})

test('shimmer respeita a preferência por movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await startScenario(page, 'slow')
  const skeleton = page.locator(`${skeletons} >> visible=true`).first()
  await expect(skeleton).toBeVisible()
  const shimmer = await skeleton.evaluate((element) => getComputedStyle(element, '::before').display)
  expect(shimmer).toBe('none')
})

test('falha no detalhe mostra o erro e recupera ao tentar novamente', async ({ page }) => {
  await startScenario(page, 'server-error', '/nfts/emerald-ape-042')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar o NFT' })).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => window.__KURIO_MOCKS__?.useScenario('default'))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
})
