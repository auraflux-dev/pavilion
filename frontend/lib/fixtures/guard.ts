import { NextResponse } from 'next/server'
import { isDemoPiiPath, isWriteMethod } from '@/lib/demo/guard'

export const SYNTHETIC_WRITE_MESSAGE =
  'Synthetic staging. Saves, charges, and emails are off. Use www.shmspto.org for live data.'

export function syntheticWriteResponse() {
  return NextResponse.json(
    { ok: true, synthetic: true, message: SYNTHETIC_WRITE_MESSAGE },
    { status: 200 },
  )
}

export function syntheticBlockedResponse(message = SYNTHETIC_WRITE_MESSAGE) {
  return NextResponse.json({ error: message, synthetic: true }, { status: 403 })
}

export { isDemoPiiPath as isSyntheticPiiPath, isWriteMethod }

const SYNTHETIC_WRITE_ALLOW = new Set([
  '/api/auth/logout',
  '/api/auth/email-login',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/checkout/quote',
  '/api/staff/membership/outreach',
])

export function isSyntheticWriteAllowPath(pathname: string): boolean {
  return SYNTHETIC_WRITE_ALLOW.has(pathname)
}
