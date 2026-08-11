/** Primary public event host categories (Wix Events Categories). */
export const PRIMARY_EVENT_CATEGORIES = ['PTO led', 'SHMS led', 'PTO/SHMS'] as const

export type PrimaryEventCategory = (typeof PRIMARY_EVENT_CATEGORIES)[number]

export function sortEventCategoryNames(names: string[]): string[] {
  const primary = PRIMARY_EVENT_CATEGORIES.filter((c) => names.includes(c))
  const rest = names
    .filter((n) => !(PRIMARY_EVENT_CATEGORIES as readonly string[]).includes(n))
    .sort((a, b) => a.localeCompare(b))
  return [...primary, ...rest]
}
