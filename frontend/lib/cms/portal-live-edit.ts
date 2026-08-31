/** App-shell surfaces: live copy yes, section layout composer no. */

export const COPY_ONLY_PAGE_SLUGS = new Set([
  'member-portal',
  'staff-portal',
  'portal-hub',
  'portal-notices',
  'portal-forms',
  'portal-help',
])

export function isCopyOnlyPageSlug(slug: string): boolean {
  return COPY_ONLY_PAGE_SLUGS.has(String(slug ?? '').trim())
}
