#!/usr/bin/env node
/**
 * Fail if Commons demo still exposes SHMS live-money surfaces.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = join(root, 'frontend')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

const errors = []
const surface = read('frontend/lib/demo/commons-surface.ts')
const guard = read('frontend/lib/demo/guard.ts')
const middleware = read('frontend/middleware.ts')
const me = read('frontend/app/api/staff/me/route.ts')
const session = read('frontend/lib/staff/session.ts')
const layout = read('frontend/app/layout.tsx')

for (const ws of ['inbox', 'payments', 'retail', 'newsletter', 'canva', 'timesheets', 'social']) {
  if (!surface.includes(`'${ws}'`)) {
    errors.push(`commons-surface missing hidden workspace ${ws}`)
  }
}

for (const path of ['/staff/in-person', '/api/gift-card', '/api/checkout/pay']) {
  if (!surface.includes(`'${path}'`)) {
    errors.push(`commons-surface missing hidden path ${path}`)
  }
}

if (!guard.includes('COMMONS_DEMO_ALLOWED_STAFF_GET')) {
  errors.push('demo/guard must import COMMONS_DEMO_ALLOWED_STAFF_GET')
}
if (!guard.includes('isCommonsDemoHiddenPath')) {
  errors.push('demo/guard must use isCommonsDemoHiddenPath')
}
if (!middleware.includes('isCommonsDemoHiddenPath')) {
  errors.push('middleware must use isCommonsDemoHiddenPath')
}
if (!read('frontend/components/staff/staff-dashboard.tsx').includes('useLiveCommerceGate')) {
  errors.push('staff-dashboard must use useLiveCommerceGate')
}
if (!read('frontend/components/staff/staff-dashboard.tsx').includes('StaffCustomDomainPanel')) {
  errors.push('staff-dashboard must show custom domain panel')
}
if (!read('frontend/components/member-portal/store-card-reload.tsx').includes('useLiveCommerceGate')) {
  errors.push('store-card-reload must gate live commerce')
}
if (!read('frontend/app/api/commons/surface/route.ts').includes('liveCommerceGate')) {
  errors.push('missing /api/commons/surface route')
}
if (!session.includes('loadCommonsStaffJson')) {
  errors.push('getStaffSession must load Commons Better Auth staff')
}
if (!me.includes('loadCommonsStaffJson')) {
  errors.push('staff/me must load Commons Better Auth staff')
}
if (!layout.includes('CommonsSurfaceShell')) {
  errors.push('layout must wrap CommonsSurfaceShell on demo/platform')
}

const shmsFingerprints = ['treasurer@shmspto.org', 'president@shmspto.org', 'SQ *SHMSPTO']
const kb = read('frontend/lib/kb/staff.ts')
for (const fp of shmsFingerprints) {
  if (kb.includes(fp) && !kb.includes('Stone Hill')) {
    // KB may legitimately mention Stone Hill ops — only flag visitor components
  }
}

const visitorFiles = [
  'frontend/components/demo/demo-banner.tsx',
  'frontend/app/review/page.tsx',
]
for (const rel of visitorFiles) {
  const text = read(rel)
  if (/shmspto\.org/i.test(text) && !/do not|Stone Hill production|sample/i.test(text)) {
    errors.push(`${rel} may expose shmspto.org on demo`)
  }
}

try {
  readdirSync(join(frontend, 'app/api/staff'))
} catch {
  errors.push('could not read staff API routes')
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, checks: errors.length === 0 }))
process.exit(0)
