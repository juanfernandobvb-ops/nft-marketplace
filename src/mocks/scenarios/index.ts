import { getDb } from '@/mocks/db/store'
import { createRandom, seedFrom } from '@/mocks/random'
import { SCENARIOS, type FailureRule, type Scenario, type ScenarioName } from '@/mocks/scenarios/definitions'

// Estado de execução do cenário: reinicia a cada carregamento, com semente fixa por cenário.
let random = createRandom(seedFrom(getDb().scenario))
const requestCounts = new Map<string, number>()
const failureHits = new Map<FailureRule, number>()

export function activeScenarioName() {
  return getDb().scenario as ScenarioName
}

export function activeScenario(): Scenario {
  return SCENARIOS[activeScenarioName()]
}

export function resetScenarioRuntime() {
  random = createRandom(seedFrom(activeScenarioName()))
  requestCounts.clear()
  failureHits.clear()
}

export function nextLatency(method: string, path: string) {
  const key = `${method} ${path}`
  const count = (requestCounts.get(key) ?? 0) + 1
  requestCounts.set(key, count)
  return activeScenario().latency({ method, path, count, random: random.next })
}

/** Primeira regra de falha aplicável à requisição; consome uma ocorrência quando limitada. */
export function takeFailure(method: string, path: string): FailureRule | undefined {
  const rule = activeScenario().failures.find(
    (candidate) =>
      (!candidate.method || candidate.method === method) &&
      (!candidate.path || candidate.path === path) &&
      (candidate.times === undefined || (failureHits.get(candidate) ?? 0) < candidate.times),
  )
  if (rule?.times !== undefined) failureHits.set(rule, (failureHits.get(rule) ?? 0) + 1)
  return rule
}

export function randomHex(length: number) {
  return random.hex(length)
}
