/**
 * Who may see the public enrichment catalog before Sunday 4pm Eastern unlock.
 * - Parents: after PROGRAMS_PUBLIC_OPENS_AT_MS
 * - Staff (signed in with StaffRoles): always, for dry runs
 * - Preview secret cookie / ?programsPreview=: for agent + bookmark dry runs
 * - Staging host (shmspto.vercel.app): always open for review
 */
import { cookies, headers } from 'next/headers'
import { NextRequest } from 'next/server'
import {
  isPublicProgramsCatalogOpen,
  PROGRAMS_PREVIEW_COOKIE,
} from '@/lib/programs/season'

export type ProgramsCatalogAccess = {
  allowed: boolean
  /** True when catalog is shown before the public unlock time. */
  previewMode: boolean
  reason: 'public' | 'staff' | 'preview_secret' | 'staging' | 'closed'
}

function previewSecret(): string {
  return String(process.env.PROGRAMS_PREVIEW_SECRET ?? '').trim()
}

export function previewSecretMatches(token: string | null | undefined): boolean {
  const secret = previewSecret()
  if (!secret || !token) return false
  return token === secret
}

/** Stable staging + ephemeral Vercel review hosts. www stays gated until unlock. */
export async function isProgramsReviewHost(): Promise<boolean> {
  if (process.env.VERCEL_ENV === 'preview') return true
  try {
    const h = await headers()
    const host = (h.get('x-forwarded-host') || h.get('host') || '')
      .split(',')[0]
      .trim()
      .toLowerCase()
      .split(':')[0]
    return (
      host === 'shmspto.vercel.app' ||
      host.endsWith('-treasurer-4353s-projects.vercel.app')
    )
  } catch {
    return false
  }
}

/** Build a request so staff session helpers can read the same cookies as the RSC. */
async function requestFromCookies(): Promise<NextRequest> {
  const jar = await cookies()
  const cookie = jar
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
  return new NextRequest('https://www.shmspto.org/programs', {
    headers: cookie ? { cookie } : undefined,
  })
}

export async function canViewProgramsCatalogNow(opts?: {
  /** From ?programsPreview= on the page URL */
  previewToken?: string | null
}): Promise<ProgramsCatalogAccess> {
  if (isPublicProgramsCatalogOpen()) {
    return { allowed: true, previewMode: false, reason: 'public' }
  }

  if (await isProgramsReviewHost()) {
    return { allowed: true, previewMode: true, reason: 'staging' }
  }

  if (previewSecretMatches(opts?.previewToken)) {
    return { allowed: true, previewMode: true, reason: 'preview_secret' }
  }

  try {
    const jar = await cookies()
    if (previewSecretMatches(jar.get(PROGRAMS_PREVIEW_COOKIE)?.value)) {
      return { allowed: true, previewMode: true, reason: 'preview_secret' }
    }
  } catch {
    // cookies() unavailable outside a request
  }

  try {
    const { getStaffSession } = await import('@/lib/staff/session')
    const req = await requestFromCookies()
    const staffSession = await getStaffSession(req)
    if (staffSession?.staff) {
      return { allowed: true, previewMode: true, reason: 'staff' }
    }
  } catch {
    // ignore
  }

  return { allowed: false, previewMode: false, reason: 'closed' }
}
