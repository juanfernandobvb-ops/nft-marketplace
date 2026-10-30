// Roda a regressão visual no Linux da imagem oficial do Playwright: mesmas fontes e mesma renderização
// em qualquer máquina com Docker. `--update` regenera as baselines de Linux.
// O node_modules do contêiner fica num volume próprio (binários nativos de Linux), sem tocar no local.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const version = lock.packages['node_modules/@playwright/test'].version
const update = process.argv.includes('--update') ? ' --update-snapshots' : ''

const result = spawnSync(
  'docker',
  [
    'run', '--rm', '--ipc=host',
    '-v', `${process.cwd()}:/work`,
    '-v', '/work/node_modules',
    '-w', '/work',
    `mcr.microsoft.com/playwright:v${version}-noble`,
    'bash', '-c', `npm ci --no-audit --no-fund && npx playwright test tests/visual${update}`,
  ],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
