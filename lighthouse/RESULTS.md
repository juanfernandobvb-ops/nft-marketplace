# Resultados do Lighthouse

Gerado por `node scripts/lighthouse-summary.mjs` a partir de `lighthouse/reports/`.

| Perfil | Página | Performance (≥ 90) | Accessibility (≥ 95) | Best Practices (≥ 95) | SEO (≥ 90) | LCP | CLS | TBT |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| mobile | Início | 91 | 100 | 100 | 100 | 3.23 s | 0.000 | 108 ms |
| mobile | Detalhe do NFT | 91 | 100 | 100 | 100 | 3.18 s | 0.000 | 84 ms |
| desktop | Início | 100 | 100 | 100 | 100 | 0.81 s | 0.000 | 0 ms |
| desktop | Detalhe do NFT | 99 | 100 | 100 | 100 | 0.82 s | 0.000 | 0 ms |

## Ambiente

- Lighthouse 12.6.1 via @lhci/cli (3 execuções por página e perfil; valores = mediana).
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- Node v25.3.0 · win32 x64 · benchmarkIndex 2958
- Mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×). Desktop: preset `desktop`.
- Throttling: simulate. Build otimizado (`npm run build`) servido por `vite preview`, mocks ativos no cenário `default`.
