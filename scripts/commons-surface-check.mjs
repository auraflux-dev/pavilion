#!/usr/bin/env node
/**
 * Fail if Commons demo still exposes SHMS live-money Staff nav or in-person POS.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const surface = readFileSync(join(root, 'frontend/lib/demo/commons-surface.ts'), 'utf8')
const dashboard = readFileSync(join(root, 'frontend/components/staff/staff-dashboard.tsx'), 'utf8')
const middleware = readFileSync(join(root, 'frontend/middleware.ts'), 'utf8')
const me = readFileSync(join(root, 'frontend/app/api/staff/me/route.ts'), 'utf8')

const errors = []

for (const ws of ['inbox', 'payments', 'retail', 'newsletter', 'canva', 'timesheets', 'social']) {
  if (!surface.includes(`'${ws}'`)) {
    errors.push(`commons-surface missing hidden workspace ${ws}`)
  }
}

if (!dashboard.includes('filterCommonsDemoWorkspaces')) {
  errors.push('staff-dashboard must filter Commons demo workspaces')
}
if (!dashboard.includes('StaffCustomDomainPanel')) {
  errors.push('staff-dashboard must show custom domain panel')
}
if (!middleware.includes('/staff/in-person')) {
  errors.push('middleware must 404 demo in-person')
}
if (!me.includes('loadCommonsStaffJson')) {
  errors.push('staff/me must load Commons Better Auth staff')
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ ok: true, hiddenWorkspaces: true, domainPanel: true }))
process.exit(0)
