import type { Eth } from '@/contracts'
import { findEdition, findNft, updateNft } from '@/mocks/db/catalog'
import { settleIfDue } from '@/mocks/db/orders'
import { getDb, persist, resetDb } from '@/mocks/db/store'
import { realtime } from '@/mocks/realtime'
import { activeScenarioName, resetScenarioRuntime } from '@/mocks/scenarios'
import { DEFAULT_SCENARIO, isScenarioName, SCENARIOS, type ScenarioName } from '@/mocks/scenarios/definitions'

/**
 * Controle da simulação para testes E2E e demonstração (`window.__KURIO_MOCKS__`).
 * Toda mudança passa pelo servidor simulado: REST e Socket.IO refletem o mesmo estado.
 */
export const mockControl = {
  scenarios: () =>
    Object.entries(SCENARIOS).map(([name, scenario]) => ({ name, description: scenario.description })),
  scenario: activeScenarioName,
  /** Troca de cenário restaurando o estado inicial. Recarregue a página em seguida. */
  useScenario(name: string) {
    if (!isScenarioName(name)) throw new Error(`Cenário desconhecido: ${name}`)
    resetDb(name)
    resetScenarioRuntime()
  },
  /** Restaura integralmente o estado inicial do cenário ativo. */
  reset() {
    resetDb()
    resetScenarioRuntime()
  },
  /** Altera preço e/ou disponibilidade de uma edição, emitindo `nft.updated`. */
  updateNft(nftId: string, change: { price?: Eth; editionId?: string; available?: number | null }) {
    updateNft(findNft(nftId), (nft) => {
      if (change.price !== undefined) {
        nft.previousPrice = nft.price
        nft.price = change.price
      }
      if (change.editionId !== undefined && change.available !== undefined) {
        findEdition(nft, change.editionId).available = change.available
      }
    })
  },
  /** Expira todas as sessões: a próxima requisição autenticada recebe SESSION_EXPIRED. */
  expireSessions() {
    for (const session of getDb().sessions) session.expiresAt = Date.now() - 1
    persist()
  },
  /** Antecipa o resultado dos pagamentos pendentes (controle de tempo nos testes). */
  settleOrdersNow() {
    for (const record of Object.values(getDb().orders)) {
      if (record.order.status === 'pending') {
        record.settleAt = Date.now()
        settleIfDue(record.order.id)
      }
    }
  },
  realtime,
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __KURIO_MOCKS__?: MockControl
  }
}

/** `?scenario=<nome>` seleciona e reinicia um cenário; `?mocks-reset` reinicia o atual. */
export function applyUrlControls() {
  const url = new URL(window.location.href)
  const requested = url.searchParams.get('scenario')
  if (requested !== null) {
    mockControl.useScenario(isScenarioName(requested) ? requested : DEFAULT_SCENARIO)
    url.searchParams.delete('scenario')
  }
  if (url.searchParams.has('mocks-reset')) {
    mockControl.reset()
    url.searchParams.delete('mocks-reset')
  }
  // Remove os parâmetros para que um refresh não reinicie o estado de novo.
  window.history.replaceState(window.history.state, '', url)
}

export type { ScenarioName }
