import type { Db } from '@/mocks/db/types'
import { createNftFixtures } from '@/mocks/fixtures/nfts'
import { FAVORITE_FIXTURES, USER_FIXTURES, WALLET_FIXTURES } from '@/mocks/fixtures/users'
import { DEFAULT_SCENARIO, SCENARIOS, isScenarioName, type ScenarioName } from '@/mocks/scenarios/definitions'

const STORAGE_KEY = 'kurio:mocks:db'
/** Incrementar ao mudar o formato de `Db`: estados antigos são descartados. */
const SCHEMA = 1

let db: Db | undefined

function seed(scenario: ScenarioName): Db {
  return {
    schema: SCHEMA,
    scenario,
    seq: 0,
    users: structuredClone(USER_FIXTURES),
    sessions: [],
    nfts: SCENARIOS[scenario].catalog === 'empty' ? [] : createNftFixtures(),
    favorites: structuredClone(FAVORITE_FIXTURES),
    carts: {},
    wallets: Object.fromEntries(
      Object.entries(WALLET_FIXTURES).map(([userId, wallets]) => [
        userId,
        Object.fromEntries(wallets.map((wallet) => [wallet.slot, structuredClone(wallet)])),
      ]),
    ),
    quotes: {},
    orders: {},
    idempotency: {},
    checkoutChangeDone: false,
  }
}

function load(): Db | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const stored = JSON.parse(raw) as Db
    return stored.schema === SCHEMA && isScenarioName(stored.scenario) ? stored : undefined
  } catch {
    return undefined
  }
}

export function getDb(): Db {
  db ??= load() ?? seed(DEFAULT_SCENARIO)
  return db
}

/** Grava o estado atual; chamado ao fim de toda operação que altera dados. */
export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getDb()))
  } catch {
    // Sem storage (aba privada, cota): a simulação segue em memória.
  }
}

/** Restaura integralmente o estado inicial do cenário. */
export function resetDb(scenario: ScenarioName = getDb().scenario as ScenarioName) {
  db = seed(scenario)
  persist()
  return db
}

export function nextId(prefix: string) {
  const state = getDb()
  state.seq += 1
  return `${prefix}_${String(state.seq).padStart(4, '0')}`
}
