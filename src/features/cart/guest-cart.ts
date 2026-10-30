import { useSyncExternalStore } from 'react'
import { GuestCart, MAX_QUANTITY_PER_ITEM, type CartLineInput } from '@/contracts'

const STORAGE_KEY = 'kurio:guest-cart'

function load(): GuestCart {
  try {
    const parsed = GuestCart.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

let lines = load()
const listeners = new Set<() => void>()

function set(next: GuestCart) {
  lines = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Sem storage: o carrinho do visitante vale só nesta aba.
  }
  listeners.forEach((listener) => listener())
}

const sameLine = (a: CartLineInput, b: Pick<CartLineInput, 'nftId' | 'editionId'>) =>
  a.nftId === b.nftId && a.editionId === b.editionId

/** Carrinho do visitante no navegador; enviado à API (merge) ao autenticar. */
export const guestCart = {
  getLines: () => lines,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /** Soma à quantidade existente, sem ultrapassar o limite da edição. */
  add(line: CartLineInput, limit = MAX_QUANTITY_PER_ITEM) {
    const existing = lines.find((candidate) => sameLine(candidate, line))
    const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, limit)
    set(existing ? lines.map((item) => (item === existing ? { ...item, quantity } : item)) : [...lines, { ...line, quantity }])
  },
  setQuantity(line: Pick<CartLineInput, 'nftId' | 'editionId'>, quantity: number) {
    set(lines.map((item) => (sameLine(item, line) ? { ...item, quantity } : item)))
  },
  remove(line: Pick<CartLineInput, 'nftId' | 'editionId'>) {
    set(lines.filter((item) => !sameLine(item, line)))
  },
  clear() {
    set([])
  },
}

export function useGuestCartLines() {
  return useSyncExternalStore(guestCart.subscribe, guestCart.getLines)
}
