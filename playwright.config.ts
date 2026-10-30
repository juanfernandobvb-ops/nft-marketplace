import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
/** Roda a suíte contra uma URL publicada (ex.: o deploy na Vercel) em vez do preview local. */
const EXTERNAL_BASE_URL = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  // e2e/ (fluxos) e visual/ (regressão visual); support/ só tem utilitários.
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  // Baselines versionadas por sistema e perfil: a renderização de fontes difere entre plataformas.
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
      stylePath: './tests/visual/screenshot.css',
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      // Largura intermediária pedida no enunciado: só a verificação de layout, sem repetir os fluxos.
      name: 'tablet',
      testMatch: 'e2e/responsive.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
  ],
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
