import { expect, type Page } from '@playwright/test'

/**
 * Textos visíveis que saem da área que os recorta (contêiner com overflow ou a própria tela).
 * Ignora trilhos com rolagem horizontal intencional e textos truncados com reticências.
 */
function findClippedText() {
  const clipped: string[] = []
  const hasText = (el: Element) => (el as HTMLElement).innerText?.trim()
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    if (!hasText(el) || [...el.children].some(hasText)) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.textOverflow === 'ellipsis') continue
    // Conteúdo só para leitores de tela (sr-only) é recortado de propósito.
    if (style.clip === 'rect(0px, 0px, 0px, 0px)' || el.closest('.sr-only')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue

    let clipper: HTMLElement | null = el.parentElement
    while (clipper && clipper !== document.body && getComputedStyle(clipper).overflowX === 'visible') {
      clipper = clipper.parentElement
    }
    // Trilhos de cards rolam na horizontal de propósito (scroll-snap em x). Outros contêineres
    // com overflow (ex.: diálogo com rolagem vertical) não podem esconder conteúdo na horizontal.
    if (clipper && getComputedStyle(clipper).scrollSnapType.startsWith('x')) continue
    const bounds = clipper && clipper !== document.body ? clipper.getBoundingClientRect() : { left: 0, right: window.innerWidth }
    const overflowsSelf = style.display !== 'inline' && el.scrollWidth > el.clientWidth + 1
    if (overflowsSelf || rect.right > bounds.right + 1 || rect.left < bounds.left - 1) {
      clipped.push(`<${el.tagName.toLowerCase()}> "${el.innerText.trim().slice(0, 40)}"`)
    }
  }
  return clipped
}

/** Sem rolagem horizontal e sem texto cortado na largura atual. */
export async function expectReflow(page: Page, where: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `rolagem horizontal em ${where}`).toBeLessThanOrEqual(0)
  expect(await page.evaluate(findClippedText), `conteúdo cortado em ${where}`).toEqual([])
}
