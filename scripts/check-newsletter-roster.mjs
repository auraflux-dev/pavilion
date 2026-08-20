#!/usr/bin/env node
/**
 * Gmail send readiness + roster audience counts (+ optional parent lookup).
 * node scripts/check-newsletter-roster.mjs [parent@email.com]
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

const env = {
  ...loadEnv(path.join(root, 'frontend/.env.local')),
  ...loadEnv(path.join(root, '.env')),
}
for (const [k, v] of Object.entries(env)) process.env[k] = v

async function wixQuery(id, limit = 1000) {
  const r = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: env.WIX_API_KEY,
      'wix-site-id': env.WIX_SITE_ID,
    },
    body: JSON.stringify({ dataCollectionId: id, query: { paging: { limit } } }),
  })
  const data = await r.json()
  if (!r.ok) throw new Error(`${id} ${r.status} ${JSON.stringify(data).slice(0, 200)}`)
  return (data.dataItems || []).map((x) => x.data || {})
}

const TIER_RANK = { tide: 40, trench: 40, pearl: 40, lagoon: 30, supreme: 30, reef: 20, ruby: 20, faculty: 15, free: 0 }

function normalizeTier(raw) {
  const t = String(raw ?? 'free').trim().toLowerCase()
  if (t === 'ruby') return 'reef'
  if (t === 'supreme') return 'lagoon'
  if (t === 'pearl' || t === 'trench') return 'tide'
  return t || 'free'
}

function isPaid(tier) {
  const n = normalizeTier(tier)
  return n !== 'free' && n !== 'none' && n !== ''
}

function pickHighest(tiers) {
  let best = 'free'
  let bestRank = -1
  for (const tier of tiers) {
    const n = normalizeTier(tier)
    const rank = TIER_RANK[n] ?? (isPaid(n) ? 10 : 0)
    if (rank > bestRank) {
      bestRank = rank
      best = n
    }
  }
  return best
}

function buildRoster(students, memberships) {
  const byEmail = new Map()
  for (const item of students) {
    const parentEmail = String(item.parentEmail ?? '').trim().toLowerCase()
    if (!parentEmail) continue
    const student = {
      firstName: String(item.firstName ?? '').trim(),
      lastName: String(item.lastName ?? '').trim(),
      grade: String(item.grade ?? '').trim(),
      membershipTier: normalizeTier(item.membershipTier),
      archived: item.archived === true,
    }
    const existing = byEmail.get(parentEmail)
    if (!existing) {
      byEmail.set(parentEmail, {
        parentEmail,
        parentFirstName: String(item.parentFirstName ?? '').trim(),
        parentLastName: String(item.parentLastName ?? '').trim(),
        membershipTier: 'free',
        accountType: 'free',
        students: [student],
      })
    } else {
      existing.students.push(student)
    }
  }

  for (const m of memberships) {
    const email = String(m.email ?? m.parentEmail ?? '').trim().toLowerCase()
    if (!email) continue
    const status = String(m.status ?? 'active').trim().toLowerCase()
    if (status === 'expired' || status === 'cancelled' || status === 'canceled') continue
    const tier = normalizeTier(m.tier ?? m.membershipTier)
    if (!isPaid(tier)) continue
    const existing = byEmail.get(email)
    if (!existing) {
      byEmail.set(email, {
        parentEmail: email,
        parentFirstName: String(m.parentFirstName ?? m.firstName ?? '').trim(),
        parentLastName: String(m.parentLastName ?? m.lastName ?? '').trim(),
        membershipTier: tier,
        accountType: 'paid',
        students: [],
      })
    } else {
      existing.membershipTier = pickHighest([existing.membershipTier, tier])
      existing.accountType = isPaid(existing.membershipTier) ? 'paid' : 'free'
    }
  }

  for (const row of byEmail.values()) {
    const activeTiers = row.students.filter((s) => !s.archived).map((s) => s.membershipTier)
    const tiers = activeTiers.length ? activeTiers : row.students.map((s) => s.membershipTier)
    row.membershipTier = pickHighest(tiers)
    row.accountType = isPaid(row.membershipTier) ? 'paid' : 'free'
  }

  return [...byEmail.values()].sort((a, b) => a.parentEmail.localeCompare(b.parentEmail))
}

function filterRoster(rows, { tier = 'all', grade = '' } = {}) {
  return rows.filter((row) => {
    const students = row.students.filter((s) => !s.archived)
    if (students.length === 0 && row.accountType !== 'paid') return false
    if (tier === 'free' && row.accountType !== 'free') return false
    if (tier === 'paid' && row.accountType !== 'paid') return false
    if (tier !== 'all' && tier !== 'free' && tier !== 'paid') {
      const want = normalizeTier(tier)
      const hasTier =
        students.some((s) => normalizeTier(s.membershipTier) === want) ||
        normalizeTier(row.membershipTier) === want
      if (!hasTier) return false
    }
    if (grade) {
      const g = grade.replace(/^g/i, '')
      if (!students.some((s) => String(s.grade) === g)) return false
    }
    return true
  })
}

async function gmailStatus() {
  const hasEnvRefresh = Boolean(
    process.env.GMAIL_REFRESH_TOKEN?.trim() &&
      process.env.GMAIL_SENDER?.trim() &&
      (process.env.GMAIL_CLIENT_ID?.trim() || process.env.GOOGLE_OAUTH_CLIENT_ID?.trim()) &&
      (process.env.GMAIL_CLIENT_SECRET?.trim() || process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()),
  )
  const hasOauthClient = Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() && process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
  )
  const tokens = await wixQuery('StaffGoogleTokens', 50)
  const activeTokens = tokens.filter((t) => t.active !== false)
  const sendCandidates = [
    process.env.GMAIL_SENDER?.trim().toLowerCase(),
    'president@shmspto.org',
    'treasurer@shmspto.org',
    'vp-membershipexperience@shmspto.org',
  ].filter(Boolean)
  const connectedSenders = sendCandidates.filter((email) =>
    activeTokens.some((t) => String(t.email ?? '').trim().toLowerCase() === email),
  )

  let mode = 'mailto_fallback'
  let hint = 'No GMAIL_REFRESH_TOKEN on Vercel and no send-mailbox Connect Google token.'
  if (hasEnvRefresh) {
    mode = 'gmail_env'
    hint = `GMAIL_* env path (${process.env.GMAIL_SENDER}).`
  } else if (connectedSenders.length) {
    mode = 'gmail_staff_token'
    hint = `StaffGoogleTokens for ${connectedSenders.join(', ')}.`
  } else if (hasOauthClient) {
    hint +=
      ' GOOGLE_OAUTH is set but president@ / treasurer@ / vp-membershipexperience@ need Inbox → Connect Google.'
  }

  return {
    productionLikelyMode: mode,
    hint,
    vercelHasGmailEnv: hasEnvRefresh,
    oauthClientConfigured: hasOauthClient,
    activeStaffGoogleTokens: activeTokens.map((t) => String(t.email ?? '')).filter(Boolean),
    connectedSendCandidates: connectedSenders,
  }
}

if (!env.WIX_API_KEY || !env.WIX_SITE_ID) {
  console.error('Missing WIX_API_KEY / WIX_SITE_ID in frontend/.env.local')
  process.exit(1)
}

const gmail = await gmailStatus()
console.log('=== Gmail send (production snapshot) ===')
console.log(JSON.stringify(gmail, null, 2))

const [students, memberships] = await Promise.all([wixQuery('Students'), wixQuery('Memberships')])
const roster = buildRoster(students, memberships)

console.log('\n=== Roster totals ===')
console.log(
  `Parents: ${roster.length} | paid: ${roster.filter((r) => r.accountType === 'paid').length} | free: ${roster.filter((r) => r.accountType === 'free').length}`,
)
console.log('\n=== Newsletter audience counts ===')
for (const t of ['all', 'free', 'paid', 'reef', 'lagoon', 'tide']) {
  console.log(`tier ${t}: ${filterRoster(roster, { tier: t }).length}`)
}
for (const g of ['6', '7', '8']) {
  console.log(`grade ${g}: ${filterRoster(roster, { tier: 'all', grade: g }).length}`)
}

const lookup = process.argv[2]
if (lookup) {
  const email = lookup.trim().toLowerCase()
  const row = roster.find((r) => r.parentEmail === email)
  console.log(`\n=== Lookup: ${email} ===`)
  if (!row) {
    console.log('NOT on roster (no Students.parentEmail and no active paid Memberships row).')
  } else {
    console.log(
      JSON.stringify(
        {
          parentEmail: row.parentEmail,
          name: `${row.parentFirstName} ${row.parentLastName}`.trim(),
          accountType: row.accountType,
          membershipTier: row.membershipTier,
          students: row.students.map((s) => ({
            name: `${s.firstName} ${s.lastName}`.trim(),
            grade: s.grade,
            tier: s.membershipTier,
            archived: s.archived,
          })),
          includedIn: {
            all: filterRoster([row], { tier: 'all' }).length === 1,
            free: filterRoster([row], { tier: 'free' }).length === 1,
            paid: filterRoster([row], { tier: 'paid' }).length === 1,
            reef: filterRoster([row], { tier: 'reef' }).length === 1,
            lagoon: filterRoster([row], { tier: 'lagoon' }).length === 1,
            tide: filterRoster([row], { tier: 'tide' }).length === 1,
            grade6: filterRoster([row], { tier: 'all', grade: '6' }).length === 1,
            grade7: filterRoster([row], { tier: 'all', grade: '7' }).length === 1,
            grade8: filterRoster([row], { tier: 'all', grade: '8' }).length === 1,
          },
        },
        null,
        2,
      ),
    )
  }
} else {
  console.log('\nTip: node scripts/check-newsletter-roster.mjs parent@example.com')
}
