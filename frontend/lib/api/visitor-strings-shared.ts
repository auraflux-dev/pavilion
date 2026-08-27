/** Client-safe visitor string helper (no CMS/db imports). */

import { pickString } from '@/lib/api/page-strings-shared'

export function visitorString(
  copy: Record<string, string>,
  key: string,
  fallback: string,
): string {
  return pickString(copy, key, fallback)
}
