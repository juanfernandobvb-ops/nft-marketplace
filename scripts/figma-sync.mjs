// Sincroniza referências do Figma para o repositório. Não faz parte do build: roda sob demanda.
// Uso: npm run figma:sync  (requer FIGMA_TOKEN no .env)
import { mkdir, writeFile } from 'node:fs/promises'

const FILE_KEY = process.env.FIGMA_FILE_KEY || '7vIJUmtwwDlhbrAkTw5hQU'
const TOKEN = process.env.FIGMA_TOKEN
const API = 'https://api.figma.com/v1'
const DOCS = 'docs/figma'
const ICONS = 'src/assets/icons'

// Frames de tela exportados como referência visual (nome do frame no Figma → arquivo).
const SCREENS = {
  'Desktop / Início': 'desktop-inicio',
  'Desktop / Detalhes do NFT': 'desktop-detalhe-nft',
  'Desktop / Carrinho de NFTs': 'desktop-carrinho',
  'Desktop / Pagamento': 'desktop-pagamento',
  'Desktop / Confirmação de Pedido': 'desktop-confirmacao',
  'Desktop / Login': 'desktop-login',
  'Desktop / Cadastro': 'desktop-cadastro',
  'Desktop / Perfil do Colecionador': 'desktop-perfil',
  'Desktop / Carteiras': 'desktop-carteiras',
  'Mobile / Início': 'mobile-inicio',
  'Mobile / Detalhes do NFT': 'mobile-detalhe-nft',
  'Mobile / Carrinho de NFTs': 'mobile-carrinho',
  'Mobile / Pagamento': 'mobile-pagamento',
  'Mobile / Login': 'mobile-login',
  'Mobile / Cadastro': 'mobile-cadastro',
}

// Ícones exportados pelo nome do componente no Figma (primeira ocorrência).
const ICON_NODES = {
  warning: 'Iconly/Curved/Danger Triangle',
  wallet: 'Iconly/Curved/Wallet',
  'thank-you': 'thank-you 1',
}

if (!TOKEN) {
  console.error('FIGMA_TOKEN ausente. Defina no .env (veja .env.example).')
  process.exit(1)
}

async function api(path) {
  const res = await fetch(`${API}${path}`, { headers: { 'X-Figma-Token': TOKEN } })
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`)
  return res.json()
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function* walk(node) {
  yield node
  for (const child of node.children ?? []) yield* walk(child)
}

/** Ícones monocromáticos passam a herdar a cor do texto (currentColor). */
function normalizeIcon(svg) {
  return svg
    .replace(/(fill|stroke)="(?!none|url)[^"]*"/g, '$1="currentColor"')
    .replace(/<svg([^>]*) fill="currentColor"/, '<svg$1 fill="none"')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim()
}

const file = await api(`/files/${FILE_KEY}`)
await mkdir(DOCS, { recursive: true })
await writeFile(`${DOCS}/file.json`, JSON.stringify(file))
console.log(`file.json: "${file.name}" (modificado em ${file.lastModified})`)

const nodes = [...walk(file.document)]
const byName = (name) => nodes.find((n) => n.name === name)

const screenIds = Object.fromEntries(
  Object.entries(SCREENS).map(([name, out]) => {
    const node = byName(name)
    if (!node) throw new Error(`Frame não encontrado: ${name}`)
    return [node.id, out]
  }),
)
const { images: screenUrls } = await api(
  `/images/${FILE_KEY}?ids=${Object.keys(screenIds).join(',')}&format=jpg&scale=1`,
)
for (const [id, url] of Object.entries(screenUrls)) {
  await writeFile(`${DOCS}/${screenIds[id]}.jpg`, await download(url))
}
console.log(`telas: ${Object.keys(screenUrls).length} exportadas`)

const iconIds = Object.fromEntries(
  Object.entries(ICON_NODES).map(([out, name]) => {
    const node = byName(name)
    if (!node) throw new Error(`Ícone não encontrado: ${name}`)
    return [node.id, out]
  }),
)
const { images: iconUrls } = await api(
  `/images/${FILE_KEY}?ids=${Object.keys(iconIds).join(',')}&format=svg&svg_include_id=false&svg_outline_text=false`,
)
for (const [id, url] of Object.entries(iconUrls)) {
  const svg = (await download(url)).toString('utf8')
  await writeFile(`${ICONS}/${iconIds[id]}.svg`, normalizeIcon(svg) + '\n')
}
console.log(`ícones: ${Object.values(iconIds).join(', ')}`)

// Conferência: quantas imagens raster distintas o arquivo usa.
const imageRefs = new Set(
  nodes.flatMap((n) => (n.fills ?? []).filter((f) => f.type === 'IMAGE').map((f) => f.imageRef)),
)
console.log(`imagens raster distintas no arquivo: ${imageRefs.size}`)
