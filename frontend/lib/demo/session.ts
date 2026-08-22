import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import type { StaffProfile, StaffRole } from '@/lib/staff/roles'
import { DEMO_REVIEW_COOKIE } from '@/lib/demo/cookie'

export { DEMO_REVIEW_COOKIE }
export const DEMO_REVIEW_MAX_AGE = 60 * 60 * 24 * 7

export type DemoLane = 'staff' | 'parent' | 'both'
export type DemoParentKind = 'paid' | 'free'

export type DemoReviewSession = {
  email: string
  firstName: string
  lastName: string
  school: string
  lane: DemoLane
  parentKind: DemoParentKind
  iat: number
}

function signingSecret(): string {
  return (
    process.env.DEMO_SIGNING_SECRET ||
    process.env.DEMO_JOIN_CODE ||
    ''
  )
}

function sign(payload: string): string {
  const secret = signingSecret()
  if (!secret) return ''
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function expectedDemoJoinCode(): string {
  return String(process.env.DEMO_JOIN_CODE ?? '').trim()
}

export function joinCodeMatches(input: string): boolean {
  const expected = expectedDemoJoinCode()
  if (!expected) return false
  const got = input.trim()
  if (!got || got.length !== expected.length) return false
  return safeEqual(got, expected)
}

export function encodeDemoReviewCookie(session: DemoReviewSession): string {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  const signature = sign(payload)
  if (!signature) return ''
  return `${payload}.${signature}`
}

export function parseDemoReviewCookie(raw: string | undefined): DemoReviewSession | null {
  if (!raw || !raw.includes('.')) return null
  const secret = signingSecret()
  if (!secret) return null
  const dot = raw.lastIndexOf('.')
  const payload = raw.slice(0, dot)
  const signature = raw.slice(dot + 1)
  const expected = sign(payload)
  if (!expected || !safeEqual(signature, expected)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DemoReviewSession
    if (!parsed?.email?.includes('@') || !parsed.firstName) return null
    if (parsed.lane !== 'staff' && parsed.lane !== 'parent' && parsed.lane !== 'both') {
      return null
    }
    if (parsed.parentKind !== 'free') parsed.parentKind = 'paid'
    return parsed
  } catch {
    return null
  }
}

export function getDemoReviewSession(req: NextRequest): DemoReviewSession | null {
  return parseDemoReviewCookie(req.cookies.get(DEMO_REVIEW_COOKIE)?.value)
}

export function demoStaffProfile(session: DemoReviewSession): StaffProfile {
  const name = `${session.firstName} ${session.lastName}`.trim()
  // Demo Staff is a full board seat for the tour, not a silent super-admin claim.
  return {
    email: session.email,
    roles: ['admin', 'membership', 'marketing', 'events', 'retail', 'treasurer'] as StaffRole[],
    boardTitle: 'Board (demo)',
    name,
    emailSignature: `${name}\n${session.school}`,
    assignedProgramIds: [],
    personalEmail: session.email,
    extraWorkspaces: [],
  }
}

export function demoMemberId(email: string): string {
  return `demo-${createHmac('sha256', 'demo-member').update(email).digest('hex').slice(0, 16)}`
}
