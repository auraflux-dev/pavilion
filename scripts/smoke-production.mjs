const baseUrl = (process.env.SMOKE_BASE_URL || 'https://www.shmspto.org').replace(/\/$/, '')

const checks = [
  ...['/', '/programs', '/events', '/fundraising', '/volunteer', '/board', '/meetings', '/cove', '/membership'].map(
    (path) => ({ name: `GET ${path}`, path, expected: 200 }),
  ),
  { name: 'legacy /store redirects to /cove', path: '/store', expected: 308, redirectIncludes: '/cove' },
  { name: 'legacy /spirit-wear redirects to /cove', path: '/spirit-wear', expected: 308, redirectIncludes: '/cove' },
  { name: 'member portal requires login', path: '/member-portal', expected: 307, redirectIncludes: '/auth/join' },
  { name: 'anonymous auth API returns visitor', path: '/api/auth/me', expected: 200 },
  { name: 'anonymous staff API rejected', path: '/api/staff/me', expected: 401 },
  { name: 'membership roster requires staff', path: '/api/staff/members?mode=list', expected: 401 },
  { name: 'membership outreach requires staff', path: '/api/staff/membership/outreach', expected: 401 },
  { name: 'workspace status requires staff', path: '/api/staff/workspace/status', expected: 401 },
  { name: 'workspace mail requires staff', path: '/api/staff/workspace/mail', expected: 401 },
  { name: 'student archive requires admin', path: '/api/staff/students/not-a-student', method: 'PATCH', expected: 403 },
  { name: 'Wix webhook rejects missing token', path: '/api/webhooks/wix-orders', method: 'POST', expected: 401 },
  { name: 'CheddarUp webhook rejects missing token', path: '/api/webhooks/cheddarup', method: 'POST', expected: 401 },
  { name: 'Square webhook rejects missing signature', path: '/api/webhooks/square', method: 'POST', expected: 401 },
  { name: 'cron rejects missing bearer token', path: '/api/cron/sync-membership-orders', expected: 401 },
  { name: 'backup cron rejects missing bearer', path: '/api/cron/backup-cms', expected: 401 },
  { name: 'health endpoint', path: '/api/health', expected: 200 },
  { name: 'data security legal page', path: '/data-security', expected: 200 },
]

let failures = 0
console.log(`Smoke testing ${baseUrl}`)

for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: check.method || 'GET',
      body: check.method === 'POST' ? '{}' : undefined,
      headers: check.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      redirect: 'manual',
    })
    const location = response.headers.get('location') || ''
    const statusOk = response.status === check.expected
    const redirectOk = !check.redirectIncludes || location.includes(check.redirectIncludes)
    const ok = statusOk && redirectOk
    if (!ok) failures += 1
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${check.name}: ${response.status}` +
        (location ? ` → ${location}` : ''),
    )
  } catch (error) {
    failures += 1
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : error}`)
  }
}

if (failures) {
  console.error(`${failures} smoke check(s) failed.`)
  process.exit(1)
}

console.log(`All ${checks.length} smoke checks passed.`)
