// Resume as auditorias do Lighthouse CI: mediana das 3 execuções por página e perfil.
// Lê lighthouse/reports/{mobile,desktop}/*.report.json e escreve lighthouse/RESULTS.md.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'lighthouse'
const PROFILES = ['mobile', 'desktop']
const CATEGORIES = [
  ['performance', 'Performance', 90],
  ['accessibility', 'Accessibility', 95],
  ['best-practices', 'Best Practices', 95],
  ['seo', 'SEO', 90],
]
const PAGES = { '/': 'Início', '/nfts/emerald-ape-042': 'Detalhe do NFT' }

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const rows = []
let sample
for (const profile of PROFILES) {
  const dir = join(ROOT, 'reports', profile)
  const reports = readdirSync(dir)
    .filter((file) => file.endsWith('.report.json'))
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')))
  sample ??= reports[0]
  const byPage = Map.groupBy(reports, (report) => new URL(report.finalDisplayedUrl).pathname)
  for (const [path, runs] of byPage) {
    rows.push({
      profile,
      page: PAGES[path] ?? path,
      runs: runs.length,
      scores: Object.fromEntries(
        CATEGORIES.map(([id]) => [id, median(runs.map((run) => Math.round(run.categories[id].score * 100)))]),
      ),
      lcp: median(runs.map((run) => run.audits['largest-contentful-paint'].numericValue)),
      cls: median(runs.map((run) => run.audits['cumulative-layout-shift'].numericValue)),
      tbt: median(runs.map((run) => run.audits['total-blocking-time'].numericValue)),
    })
  }
}

const mark = (score, target) => (score >= target ? `${score}` : `**${score}** ⚠️`)
const table = [
  `| Perfil | Página | ${CATEGORIES.map(([, label, target]) => `${label} (≥ ${target})`).join(' | ')} | LCP | CLS | TBT |`,
  `|---|---|${CATEGORIES.map(() => '---:').join('|')}|---:|---:|---:|`,
  ...rows.map(
    (row) =>
      `| ${row.profile} | ${row.page} | ${CATEGORIES.map(([id, , target]) => mark(row.scores[id], target)).join(' | ')} | ` +
      `${(row.lcp / 1000).toFixed(2)} s | ${row.cls.toFixed(3)} | ${Math.round(row.tbt)} ms |`,
  ),
].join('\n')

const settings = sample.configSettings
const environment = [
  `- Lighthouse ${sample.lighthouseVersion} via @lhci/cli (3 execuções por página e perfil; valores = mediana).`,
  `- Navegador: ${sample.environment.hostUserAgent}`,
  `- Node ${process.version} · ${process.platform} ${process.arch} · benchmarkIndex ${sample.environment.benchmarkIndex}`,
  `- Mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×). Desktop: preset \`desktop\`.`,
  `- Throttling: ${settings.throttlingMethod}. Build otimizado (\`npm run build\`) servido por \`vite preview\`, mocks ativos no cenário \`default\`.`,
].join('\n')

const markdown = `# Resultados do Lighthouse\n\nGerado por \`node scripts/lighthouse-summary.mjs\` a partir de \`lighthouse/reports/\`.\n\n${table}\n\n## Ambiente\n\n${environment}\n`
writeFileSync(join(ROOT, 'RESULTS.md'), markdown)
console.log(markdown)
