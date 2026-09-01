import { NextResponse } from 'next/server'
import {
  COMMONS_DEMO_ALLOWED_STAFF_GET,
  isCommonsDemoHiddenPath,
} from '@/lib/demo/commons-surface'

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
  '/api/demo/brand',
  '/api/auth/logout',
  '/api/auth/email-login',
  '/api/auth/reset-password',
  '/api/ops/platform-activity',
])

/** Pavilion CMS page builder (demo/trial Neon). Not Wix school data. */
const CMS_PAGE_BUILDER_WRITE_ALLOW = new Set([
  '/api/staff/page-sections',
  '/api/staff/site-brand',
  '/api/staff/cms-media/upload',
  '/api/staff/page-content',
  '/api/staff/inline-copy',
])

export function isDemoJoinAllowPath(pathname: string): boolean {
  if (JOIN_ALLOW.has(pathname)) return true
  if (CMS_PAGE_BUILDER_WRITE_ALLOW.has(pathname)) return true
  if (pathname.startsWith('/api/id')) return true
  if (pathname.startsWith('/api/commons')) return true
  if (pathname.startsWith('/api/webhooks/commons')) return true
  // Neon product signups (SignUpGenius-style) — demo writes stay off Wix school CMS.
  if (pathname.startsWith('/api/signups/')) return true
  if (pathname.startsWith('/api/staff/signups')) return true
  return false
}

const STAFF_GET_ALLOW = new Set(COMMONS_DEMO_ALLOWED_STAFF_GET)

/** Staff/portal routes that would expose Stone Hill families, money, or mail. */
export function isDemoPiiPath(pathname: string): boolean {
  // Signup sheets/registrations are product Neon data (not live school CMS PII stubs).
  if (pathname.startsWith('/api/staff/signups')) return false
  if (pathname.startsWith('/api/staff/') && !STAFF_GET_ALLOW.has(pathname)) return true
  if (pathname.startsWith('/api/portal/')) return true
  if (pathname.startsWith('/api/students')) return true
  if (isCommonsDemoHiddenPath(pathname) && pathname.startsWith('/api/')) return true
  return false
}
