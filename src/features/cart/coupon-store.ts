import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'kurio:coupon'

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let code = load()
const listeners = new Set<() => void>()

/** Cupom escolhido no carrinho; reaproveitado na cotação do checkout. */
export const couponStore = {
  get: () => code,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  set(next: string | null) {
    code = next
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Sem storage: o cupom vale só nesta aba.
    }
    listeners.forEach((listener) => listener())
  },
}

export function useCoupon() {
  return useSyncExternalStore(couponStore.subscribe, couponStore.get)
}
