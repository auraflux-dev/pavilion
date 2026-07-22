/**
 * Create UptimeRobot HTTPS monitors for shmspto.org via hosted MCP
 * (v2 newMonitor is restricted on free plan; MCP create-monitor works).
 *
 * Usage:
 *   UPTIMEROBOT_API_KEY=xxx node scripts/setup-uptimerobot.mjs
 */
const API_KEY = process.env.UPTIMEROBOT_API_KEY
if (!API_KEY) {
  console.error('Set UPTIMEROBOT_API_KEY')
  process.exit(1)
}

const BASE = 'https://www.shmspto.org'
const monitors = [
  { friendlyName: 'SHMS PTO — Home', url: `${BASE}/` },
  { friendlyName: 'SHMS PTO — Health', url: `${BASE}/api/health` },
  { friendlyName: 'SHMS PTO — Login', url: `${BASE}/auth/login` },
  { friendlyName: 'SHMS PTO — Data security', url: `${BASE}/data-security` },
  { friendlyName: 'SHMS PTO — Cove', url: `${BASE}/cove` },
  { friendlyName: 'SHMS PTO — Membership', url: `${BASE}/membership` },
  { friendlyName: 'SHMS PTO — Fundraising', url: `${BASE}/fundraising` },
]

async function mcp(method, params) {
  const res = await fetch('https://mcp.uptimerobot.com/mcp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  })
  const t = await res.text()
  if (t.trim().startsWith('{')) return JSON.parse(t)
  const lines = t
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i])
    } catch {
      // continue
    }
  }
  throw new Error('bad mcp response: ' + t.slice(0, 300))
}

async function callTool(name, args) {
  return mcp('tools/call', { name, arguments: args })
}

function parseToolText(result) {
  const text = result?.result?.content?.[0]?.text
  if (!text) return result
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

const listed = parseToolText(await callTool('list-monitors', {}))
const existingNames = new Set((listed.monitors || []).map((m) => m.name))

for (const m of monitors) {
  if (existingNames.has(m.friendlyName)) {
    console.log(`exists: ${m.friendlyName}`)
    continue
  }
  const created = parseToolText(
    await callTool('create-monitor', {
      type: 'HTTP',
      friendlyName: m.friendlyName,
      url: m.url,
      interval: 300,
    }),
  )
  console.log(
    created.success ? `created: ${m.friendlyName}` : `fail: ${m.friendlyName}`,
    created.monitor?.id || created.message || '',
  )
  await new Promise((r) => setTimeout(r, 1100))
}

console.log('Done. Account: president@shmspto.org — confirm alert contacts in the dashboard.')
