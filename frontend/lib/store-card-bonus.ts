/**
 * Cove store-card bonus.
 * 10% applies only on:
 *   - family's first parent-paid load, OR
 *   - membership gift-card provisioning
 * Reloads after that are 1:1 (no bonus).
 * One card / one balance per family.
 */
import { familyHasPriorStoreCardCredit } from '@/lib/family-store-card'

export {
  getStoreCardBonusPercent,
  storeCardLoadCents,
  formatStoreCardBonusExample,
} from '@/lib/store-card-bonus-shared'

/**
 * Bonus % for a parent-paid load. Zero after the family already has credit
 * (including membership provision).
 */
export async function resolveParentLoadBonusPercent(
  parentEmail: string,
  configuredPercent: number,
): Promise<number> {
  if (configuredPercent <= 0) return 0
  if (await familyHasPriorStoreCardCredit(parentEmail)) return 0
  return configuredPercent
}
