import type { NextRequest } from 'next/server'

const REVIEW_HOSTS = new Set(['shmspto.vercel.app'])

function hostFromRequest(req: NextRequest): string {
  return (req.headers.get('x-forwarded-host') || req.headers.get('host') || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .split(':')[0]
}

/** True on stable staging + ephemeral Vercel previews. Never on www.shmspto.org production. */
export function isSyntheticReviewHost(host: string): boolean {
  const h = host.trim().toLowerCase().split(':')[0]
  if (REVIEW_HOSTS.has(h)) return true
  if (h.endsWith('-treasurer-4353s-projects.vercel.app')) return true
  return false
}

export function isSyntheticStagingFromRequest(req: NextRequest): boolean {
  if (process.env.STAGING_SYNTHETIC_DATA === 'true') return true
  if (String(process.env.VERCEL_ENV ?? '').toLowerCase() === 'production') return false
  return isSyntheticReviewHost(hostFromRequest(req))
}

/**
 * Server-side synthetic mode (no request). Preview deploys + local dev with flag.
 * Production www stays false even if STAGING_SYNTHETIC_DATA is mis-set on prod.
 */
export function isSyntheticStagingMode(): boolean {
  if (process.env.STAGING_SYNTHETIC_DATA === 'true') {
    if (String(process.env.VERCEL_ENV ?? '').toLowerCase() === 'production') {
      const url = String(process.env.VERCEL_URL ?? '').toLowerCase()
      if (!url || url.includes('shmspto.org')) return false
    }
    return true
  }
  const vercelEnv = String(process.env.VERCEL_ENV ?? '').toLowerCase()
  if (vercelEnv === 'production') return false
  if (vercelEnv === 'preview') return true
  if (process.env.NODE_ENV === 'development') return true
  return false
}

export function usesFixtureData(): boolean {
  if (process.env.DEMO_INSTANCE === 'true' || process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true') {
    return true
  }
  return isSyntheticStagingMode()
}
