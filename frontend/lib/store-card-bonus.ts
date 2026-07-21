/**
 * Cove store-card bonus.
 * 10% applies only on:
 *   - family's first parent-paid load, OR
 *   - membership gift-card provisioning
 * Reloads after that are 1:1 (no bonus).
 * One card / one balance per family.
 */
import { familyHasPriorStoreCardCredit } from '@/lib/family-store-card'

export function getStoreCardBonusPercent(
  raw: string | number | undefined | null,
  fallback = 10
): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''))
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(50, Math.round(n * 100) / 100)
}

export function storeCardLoadCents(payCents: number, bonusPercent: number): number {
  if (!Number.isInteger(payCents) || payCents < 0) return 0
  if (bonusPercent <= 0) return payCents
  return Math.round(payCents * (1 + bonusPercent / 100))
}

export function formatStoreCardBonusExample(payDollars: number, bonusPercent: number): string {
  const load = payDollars * (1 + bonusPercent / 100)
  const loadLabel = Number.isInteger(load) ? `$${load}` : `$${load.toFixed(2)}`
  return `Pay $${payDollars} · get ${loadLabel} on the family card (${bonusPercent}% first-load bonus)`
}

/**
 * Bonus % for a parent-paid load. Zero after the family already has credit
 * (including membership provision).
 */
export async function resolveParentLoadBonusPercent(
  parentEmail: string,
  configuredPercent: number
): Promise<number> {
  if (configuredPercent <= 0) return 0
  if (await familyHasPriorStoreCardCredit(parentEmail)) return 0
  return configuredPercent
}
