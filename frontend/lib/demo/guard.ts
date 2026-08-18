import { NextResponse } from 'next/server'

export const DEMO_WRITE_MESSAGE =
  'Preview only. Demo does not save, charge, or email. Nothing is written to a live school.'

export function demoWriteResponse() {
  return NextResponse.json(
    { ok: true, demo: true, message: DEMO_WRITE_MESSAGE },
    { status: 200 },
  )
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase())
}

const JOIN_ALLOW = new Set([
  '/api/demo/join',
  '/api/demo/switch',
  '/api/auth/logout',
])

export function isDemoJoinAllowPath(pathname: string): boolean {
  return JOIN_ALLOW.has(pathname)
}

const STAFF_GET_ALLOW = new Set([
  '/api/staff/me',
  '/api/staff/onboarding',
  '/api/staff/site-settings',
  '/api/staff/page-content',
])

/** Staff/portal routes that would expose Stone Hill families, money, or mail. */
export function isDemoPiiPath(pathname: string): boolean {
  if (pathname.startsWith('/api/staff/') && !STAFF_GET_ALLOW.has(pathname)) return true
  if (pathname.startsWith('/api/portal/')) return true
  if (pathname.startsWith('/api/students')) return true
  if (pathname.startsWith('/api/gift-card')) return true
  return false
}
