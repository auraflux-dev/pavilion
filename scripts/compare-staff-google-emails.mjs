#!/usr/bin/env node
/**
 * Compare StaffRoles + BoardMembers + known aliases vs Google Admin (GAM).
 *
 * Usage:
 *   node scripts/compare-staff-google-emails.mjs
 *
 * Optional Google Admin pull (after `gam oauth create`):
 *   gam print users fields primaryEmail,name,suspended,orgUnitPath,lastLoginTime > tmp/google-admin-users.csv
 *   node scripts/compare-staff-google-emails.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function loadEnv(p) {
  const out = {}
  try {
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      out[m[1]] = v
    }
  } catch {
    /* missing */
  }
  return out
}

function norm(e) {
  return String(e || '')
    .trim()
    .toLowerCase()
}

function parseGamCsv(csvPath) {
  if (!fs.existsSync(csvPath)) return []
  const text = fs.readFileSync(csvPath, 'utf8').trim()
  if (!text) return []
  const lines = text.split(/\r?\n/)
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const emailIdx = headers.findIndex((h) => /primaryemail|email/.test(h))
  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'name.fullnamename')
  const susIdx = headers.findIndex((h) => h === 'suspended')
  const ouIdx = headers.findIndex((h) => /orgunit/.test(h))
  const loginIdx = headers.findIndex((h) => /lastlogin/.test(h))
  const users = []
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    // simple CSV split (GAM fields rarely quote commas in these columns)
    const cols = line.split(',')
    const email = norm(cols[emailIdx] || '')
    if (!email.endsWith('@shmspto.org')) continue
    users.push({
      email,
      name: nameIdx >= 0 ? cols[nameIdx] : '',
      suspended: susIdx >= 0 ? /true|yes|1/i.test(cols[susIdx] || '') : false,
      orgUnitPath: ouIdx >= 0 ? cols[ouIdx] : '',
      lastLoginTime: loginIdx >= 0 ? cols[loginIdx] : '',
    })
  }
  return users.sort((a, b) => a.email.localeCompare(b.email))
}

const KNOWN = [
  'president@shmspto.org',
  'treasurer@shmspto.org',
  'secretary@shmspto.org',
  'vp-marketing@shmspto.org',
  'vp-events@shmspto.org',
  'vp-initiatives@shmspto.org',
  'bayansouqi@shmspto.org',
  'vp-initiatives@shmspto.org',
  'vp-membershipexperience@shmspto.org',
  'vp-sales@shmspto.org',
  'cove@shmspto.org',

  'info@shmspto.org',
  'membership@shmspto.org',
  'programs@shmspto.org',
  'noreply@shmspto.org',
  'marketing@shmspto.org',
]

async function wixQuery(headers, id, limit = 100) {
  const r = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({ dataCollectionId: id, query: { paging: { limit } } }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`${id} ${r.status} ${JSON.stringify(data).slice(0, 200)}`)
  return (data.dataItems || []).map((x) => x.data || {})
}

const env = {
  ...loadEnv(path.join(root, 'frontend/.env.local')),
  ...loadEnv(path.join(root, '.env')),
}
const headers = {
  'Content-Type': 'application/json',
  Authorization: env.WIX_API_KEY,
  'wix-site-id': env.WIX_SITE_ID,
}
if (!env.WIX_API_KEY || !env.WIX_SITE_ID) {
  console.error('Missing WIX_API_KEY / WIX_SITE_ID')
  process.exit(1)
}

const staff = await wixQuery(headers, 'StaffRoles')
const board = await wixQuery(headers, 'BoardMembers')
const settings = await wixQuery(headers, 'SiteSettings', 50)
const googleUsers = parseGamCsv(path.join(root, 'tmp/google-admin-users.csv'))

const staffRoles = staff
  .map((d) => ({
    email: norm(d.email),
    name: d.name || '',
    roles: d.roles || '',
    boardTitle: d.boardTitle || '',
    personalEmail: norm(d.personalEmail),
    active: d.active !== false,
  }))
  .sort((a, b) => a.email.localeCompare(b.email))

const boardMembers = board
  .filter((b) => norm(b.email))
  .map((b) => ({
    name: b.name || '',
    role: b.role || '',
    email: norm(b.email),
  }))
  .sort((a, b) => a.email.localeCompare(b.email))

const settingEmails = []
for (const s of settings) {
  for (const [k, v] of Object.entries(s)) {
    if (typeof v === 'string' && /@shmspto\.org/i.test(v)) {
      settingEmails.push({ key: k, email: norm(v), id: s.key || s._id || '' })
    }
  }
}

const staffActive = new Set(
  staffRoles.filter((s) => s.active && s.email.endsWith('@shmspto.org')).map((s) => s.email),
)
const boardSet = new Set(boardMembers.map((b) => b.email))
const expected = new Set([...KNOWN, ...settingEmails.map((s) => s.email), ...boardSet])
const googleSet = new Set(googleUsers.filter((u) => !u.suspended).map((u) => u.email))

const gaps = {
  onBoardOrExpectedButNoActiveStaffRole: [...expected]
    .filter((e) => e && !staffActive.has(e))
    .sort(),
  activeStaffRoleButNotOnBoardRoster: [...staffActive].filter((e) => !boardSet.has(e)).sort(),
  inactiveOrPersonalStaffRows: staffRoles.filter(
    (s) => !s.active || !s.email.endsWith('@shmspto.org'),
  ),
  inGoogleNotInStaffRoles: googleUsers.length
    ? [...googleSet].filter((e) => !staffActive.has(e)).sort()
    : null,
  inStaffRolesNotInGoogle: googleUsers.length
    ? [...staffActive].filter((e) => !googleSet.has(e)).sort()
    : null,
  expectedNotInGoogle: googleUsers.length
    ? [...expected].filter((e) => e && !googleSet.has(e)).sort()
    : null,
}

const report = {
  generatedAt: new Date().toISOString(),
  googleAdmin: {
    status: googleUsers.length ? 'loaded' : 'unavailable',
    source: 'tmp/google-admin-users.csv',
    users: googleUsers,
  },
  staffRoles,
  boardMembers,
  siteSettingEmails: settingEmails,
  expectedAliases: [...expected].sort(),
  gaps,
}

fs.mkdirSync(path.join(root, 'tmp'), { recursive: true })
fs.writeFileSync(path.join(root, 'tmp/staff-email-audit.json'), JSON.stringify(report, null, 2))

let md = `# Staff vs Google email audit\n\nGenerated ${report.generatedAt}\n\n`
md += `## Google Admin\n\n`
if (!googleUsers.length) {
  md += `**Not pulled yet.** Authenticate GAM, then:\n\n\`\`\`bash\ngam oauth create\ngam print users fields primaryEmail,name,suspended,orgUnitPath,lastLoginTime > tmp/google-admin-users.csv\nnode scripts/compare-staff-google-emails.mjs\n\`\`\`\n\n`
} else {
  md += `| Email | Suspended | OU | Last login |\n|-------|-----------|----|------------|\n`
  for (const u of googleUsers) {
    md += `| ${u.email} | ${u.suspended} | ${u.orgUnitPath || '—'} | ${u.lastLoginTime || '—'} |\n`
  }
  md += `\n`
}

md += `## StaffRoles (CMS)\n\n| Email | Active | Roles | Board title | Personal |\n|-------|--------|-------|-------------|----------|\n`
for (const s of staffRoles) {
  md += `| ${s.email || '—'} | ${s.active} | ${s.roles} | ${s.boardTitle} | ${s.personalEmail || '—'} |\n`
}

md += `\n## BoardMembers with email\n\n| Name | Role | Email |\n|------|------|-------|\n`
for (const b of boardMembers) {
  md += `| ${b.name} | ${b.role} | ${b.email} |\n`
}

md += `\n## Gaps\n\n### Board / expected alias but **no active StaffRoles**\n`
for (const e of gaps.onBoardOrExpectedButNoActiveStaffRole) md += `- ${e}\n`

md += `\n### Active StaffRoles not on public board\n`
md += gaps.activeStaffRoleButNotOnBoardRoster.length
  ? gaps.activeStaffRoleButNotOnBoardRoster.map((e) => `- ${e}\n`).join('')
  : `- (none)\n`

if (gaps.inGoogleNotInStaffRoles) {
  md += `\n### In Google Admin (active) but no StaffRoles\n`
  for (const e of gaps.inGoogleNotInStaffRoles) md += `- ${e}\n`
  md += `\n### In StaffRoles but missing from Google Admin\n`
  for (const e of gaps.inStaffRolesNotInGoogle) md += `- ${e}\n`
  md += `\n### Expected / board email missing from Google Admin\n`
  for (const e of gaps.expectedNotInGoogle) md += `- ${e}\n`
}

fs.writeFileSync(path.join(root, 'tmp/staff-email-audit.md'), md)
console.log(md)
console.log('\nWrote tmp/staff-email-audit.md and tmp/staff-email-audit.json')
