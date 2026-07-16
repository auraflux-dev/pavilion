const baseUrl = (process.env.SMOKE_BASE_URL || 'https://shmspto.vercel.app').replace(/\/$/, '')

const checks = [
  ...['/', '/programs', '/events', '/fundraising', '/volunteer', '/board', '/meetings', '/store', '/membership'].map(
    (path) => ({ name: `GET ${path}`, path, expected: 200 }),
  ),
  { name: 'member portal requires login', path: '/member-portal', expected: 307, redirectIncludes: '/auth/login' },
  { name: 'anonymous auth API rejected', path: '/api/auth/me', expected: 401 },
  { name: 'anonymous staff API rejected', path: '/api/staff/me', expected: 401 },
  { name: 'Wix webhook rejects missing token', path: '/api/webhooks/wix-orders', method: 'POST', expected: 401 },
  { name: 'CheddarUp webhook rejects missing token', path: '/api/webhooks/cheddarup', method: 'POST', expected: 401 },
  { name: 'Square webhook rejects missing signature', path: '/api/webhooks/square', method: 'POST', expected: 401 },
  { name: 'cron rejects missing bearer token', path: '/api/cron/sync-membership-orders', expected: 401 },
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
