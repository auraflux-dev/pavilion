'use client'

/**
 * Mini-cart store (localStorage + useSyncExternalStore).
 * Survives navigation when checkout is not finished.
 */
import { useCallback, useSyncExternalStore } from 'react'
import type { CartLine, CartState } from '@/lib/cart/types'
import { CART_STORAGE_KEY } from '@/lib/cart/types'

const EMPTY: CartState = { lines: [], open: false }

let memory: CartState = EMPTY
let hydrated = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function readStorage(): CartState {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as { lines?: CartLine[] }
    const lines = Array.isArray(parsed.lines) ? parsed.lines : []
    return { lines, open: memory.open }
  } catch {
    return { ...EMPTY, open: memory.open }
  }
}

function writeStorage(lines: CartLine[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ lines }))
  } catch {
    /* quota / private mode */
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === 'undefined') return
  memory = readStorage()
  hydrated = true
}

function setState(next: CartState) {
  memory = next
  writeStorage(next.lines)
  emit()
}

function newLineId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function addCartLine(input: Omit<CartLine, 'id' | 'addedAt'> & { id?: string }): CartLine {
  ensureHydrated()
  const line: CartLine = {
    ...input,
    id: input.id || newLineId(),
    addedAt: Date.now(),
  }
  // Replace same program / product / membership / event key instead of stacking duplicates.
  const key = cartLineKey(line)
  const without = memory.lines.filter((l) => cartLineKey(l) !== key)
  setState({ lines: [...without, line], open: true })
  return line
}

export function removeCartLine(id: string) {
  ensureHydrated()
  setState({ ...memory, lines: memory.lines.filter((l) => l.id !== id) })
}

export function clearCart() {
  ensureHydrated()
  setState({ lines: [], open: memory.open })
}

export function setCartOpen(open: boolean) {
  ensureHydrated()
  setState({ ...memory, open })
}

export function updateCartLine(id: string, patch: Partial<CartLine>) {
  ensureHydrated()
  setState({
    ...memory,
    lines: memory.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  })
}

function cartLineKey(line: CartLine): string {
  if (line.kind === 'program') {
    const addons = (line.addonProgramIds ?? []).slice().sort().join('+')
    // Include student so twins can each hold the same class in the bag.
    return `program:${line.programId}:${addons}:${line.studentId || ''}`
  }
  if (line.kind === 'product') return `product:${line.productId}:${line.variantId || ''}`
  if (line.kind === 'membership') return `membership:${line.tier}`
  if (line.kind === 'event') return `event:${line.eventId}`
  if (line.kind === 'donation') return `donation:${line.amountCents}`
  return line.id
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): CartState {
  ensureHydrated()
  return memory
}

function getServerSnapshot(): CartState {
  return EMPTY
}

export function useCart(): CartState & {
  count: number
  total: number
  add: typeof addCartLine
  remove: typeof removeCartLine
  clear: typeof clearCart
  setOpen: typeof setCartOpen
  update: typeof updateCartLine
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const count = state.lines.reduce((n, l) => n + Math.max(1, Number(l.quantity ?? 1) || 1), 0)
  const total = state.lines.reduce(
    (sum, l) => sum + Number(l.amount || 0) * Math.max(1, Number(l.quantity ?? 1) || 1),
    0,
  )
  const add = useCallback(addCartLine, [])
  const remove = useCallback(removeCartLine, [])
  const clear = useCallback(clearCart, [])
  const setOpen = useCallback(setCartOpen, [])
  const update = useCallback(updateCartLine, [])
  return { ...state, count, total, add, remove, clear, setOpen, update }
}
