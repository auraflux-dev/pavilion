export const DEMO_REVIEW_COOKIE = 'demo_review'

export function hasDemoReviewCookie(raw: string | undefined): boolean {
  return Boolean(raw && raw.includes('.') && raw.length > 20)
}

/** Edge-safe peek for demo stubs. Join/switch still HMAC-sign in Node. */
export function peekDemoReviewSession(raw: string | undefined): {
  email: string
  firstName: string
  lastName: string
  school: string
  lane: string
  parentKind: 'paid' | 'free'
} | null {
  if (!hasDemoReviewCookie(raw)) return null
  try {
    const payload = raw!.slice(0, raw!.lastIndexOf('.'))
    const pad = payload.replace(/-/g, '+').replace(/_/g, '/')
    const b64 = pad + '='.repeat((4 - (pad.length % 4)) % 4)
    const parsed = JSON.parse(atob(b64)) as {
      email?: string
      firstName?: string
      lastName?: string
      school?: string
      lane?: string
      parentKind?: string
    }
    if (!parsed?.email || !parsed.firstName) return null
    return {
      email: parsed.email,
      firstName: parsed.firstName,
      lastName: parsed.lastName || '',
      school: parsed.school || '',
      lane: parsed.lane || 'both',
      parentKind: parsed.parentKind === 'free' ? 'free' : 'paid',
    }
  } catch {
    return null
  }
}
