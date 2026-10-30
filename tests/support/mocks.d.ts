// Superfície de `window.__KURIO_MOCKS__` (src/mocks/control.ts) usada pelos testes E2E.
// Os testes rodam em outro projeto TypeScript e não importam código da aplicação.

interface KurioMockControl {
  scenario(): string
  useScenario(name: string): void
  reset(): void
  updateNft(nftId: string, change: { price?: string; editionId?: string; available?: number | null }): void
  expireSessions(): void
  settleOrdersNow(): void
  realtime: {
    events(): { id: string; type: string; resource: { type: string; id: string }; version: number }[]
    replay(eventId: string): void
    connections(): number
    disconnectAll(): void
    setAvailable(value: boolean): void
  }
}

interface Window {
  __KURIO_MOCKS__?: KurioMockControl
}
