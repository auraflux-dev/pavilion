/**
 * Parent display name from Wix member contact. Required for checkout / sale alerts.
 */

export type NameParts = {
  firstName: string
  lastName: string
}

export function parseNameParts(input: {
  firstName?: unknown
  lastName?: unknown
  fullName?: unknown
}): NameParts {
  let firstName = String(input.firstName ?? '').trim()
  let lastName = String(input.lastName ?? '').trim()
  if ((!firstName || !lastName) && input.fullName) {
    const parts = String(input.fullName)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (parts.length >= 2) {
      firstName = firstName || parts[0]
      lastName = lastName || parts.slice(1).join(' ')
    } else if (parts.length === 1) {
      firstName = firstName || parts[0]
    }
  }
  return { firstName, lastName }
}

export function formatParentName(parts: NameParts): string {
  return `${parts.firstName} ${parts.lastName}`.trim()
}

export function nameFromMemberContact(member: {
  contact?: { firstName?: string | null; lastName?: string | null } | null
}): string {
  return formatParentName({
    firstName: String(member.contact?.firstName ?? '').trim(),
    lastName: String(member.contact?.lastName ?? '').trim(),
  })
}

export function memberNeedsName(member: {
  contact?: { firstName?: string | null; lastName?: string | null } | null
}): boolean {
  return !nameFromMemberContact(member)
}

/** Reject nicknames / email-local-parts that are not a real person name. */
export function isUsableParentName(name: string): boolean {
  const n = name.trim()
  if (n.length < 3) return false
  if (!/\s/.test(n)) return false // need first + last
  if (/@/.test(n)) return false
  return true
}
