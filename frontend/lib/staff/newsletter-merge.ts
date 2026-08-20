/**
 * Plain-text merge fields for newsletter subject/body.
 * Diane-safe: still editable as normal text; tokens like {{firstName}}.
 */

export const NEWSLETTER_MERGE_HINT =
  'Optional merge fields (plain text): {{firstName}} {{lastName}} {{name}} {{tier}} {{grade}} {{email}}'

export type NewsletterMergeVars = {
  firstName?: string
  lastName?: string
  name?: string
  tier?: string
  grade?: string
  email?: string
}

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g

export function hasMergeFields(text: string): boolean {
  TOKEN_RE.lastIndex = 0
  return TOKEN_RE.test(String(text ?? ''))
}

export function applyMergeFields(text: string, vars: NewsletterMergeVars): string {
  const map: Record<string, string> = {
    firstname: String(vars.firstName ?? '').trim() || 'there',
    parentfirstname: String(vars.firstName ?? '').trim() || 'there',
    lastname: String(vars.lastName ?? '').trim(),
    parentlastname: String(vars.lastName ?? '').trim(),
    name:
      String(vars.name ?? '').trim() ||
      [vars.firstName, vars.lastName].filter(Boolean).join(' ').trim() ||
      'there',
    tier: String(vars.tier ?? '').trim() || 'member',
    grade: String(vars.grade ?? '').trim(),
    email: String(vars.email ?? '').trim(),
  }

  return String(text ?? '').replace(TOKEN_RE, (_full, rawKey: string) => {
    const key = String(rawKey).toLowerCase()
    return map[key] ?? ''
  })
}

export function mergeVarsFromParent(row: {
  parentEmail: string
  parentFirstName?: string
  parentLastName?: string
  membershipTier?: string
  students?: { grade?: string; archived?: boolean }[]
}): NewsletterMergeVars {
  const active = (row.students ?? []).filter((s) => !s.archived)
  const grades = active
    .map((s) => String(s.grade ?? '').trim())
    .filter(Boolean)
  const uniqueGrades = Array.from(new Set(grades))
  return {
    firstName: String(row.parentFirstName ?? '').trim(),
    lastName: String(row.parentLastName ?? '').trim(),
    email: String(row.parentEmail ?? '').trim().toLowerCase(),
    tier: String(row.membershipTier ?? 'free').trim() || 'free',
    grade: uniqueGrades.join(', '),
  }
}
