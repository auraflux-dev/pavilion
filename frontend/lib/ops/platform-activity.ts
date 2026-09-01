/**
 * Append-only platform activity (auth-first).
 * Dual-write: console + Wix CMS PlatformActivity + Postgres when Commons DB.
 * Never store passwords or raw reset tokens.
 */

import { createHash } from 'crypto'
import { getWixClient } from '@/lib/wix-client'
import { commonsDbEnabled } from '@/lib/crm/db'
import { sqlForOrg } from '@/lib/crm/tenant'

export type PlatformActivityCategory = 'auth' | 'staff' | 'member' | 'ops'

export type PlatformActivityAction =
  | 'password_reset_requested'
  | 'password_reset_token_hit'
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | string

export type PlatformActivityEvent = {
  category: PlatformActivityCategory
  action: PlatformActivityAction
  actorKind: 'anonymous' | 'member' | 'staff' | 'system'
  email?: string
  emailHash?: string
  emailDomain?: string
  method?: string
  outcome: 'ok' | 'failed' | 'ambiguous'
  route?: string
  ip?: string
  userAgentClass?: string
  correlationId?: string
  detail?: string
  organizationId?: string
  /** Raw token to fingerprint (never stored). */
  tokenFingerprintSource?: string
}

export function activityPepper(): string {
  return (
    process.env.PLATFORM_ACTIVITY_PEPPER?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.HSKRG_AGENT_API_KEY?.trim() ||
    'pavilion-activity-dev'
  )
}

export function hashEmailForActivity(email: string): { emailHash: string; emailDomain: string } {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  const domain = at >= 0 ? normalized.slice(at + 1) : ''
  const digest = createHash('sha256')
    .update(`${activityPepper()}:email:${normalized}`)
    .digest('hex')
  return { emailHash: digest.slice(0, 12), emailDomain: domain }
}

export function fingerprintToken(token: string): string {
  return createHash('sha256')
    .update(`${activityPepper()}:token:${token.trim()}`)
    .digest('hex')
    .slice(0, 16)
}

export function classifyUserAgent(ua: string): string {
  const s = ua.toLowerCase()
  if (!s) return 'unknown'
  if (/bot|crawler|spider|preview|lighthouse/i.test(s)) return 'bot'
  if (/iphone|ipad|ipod/.test(s)) return 'ios'
  if (/android/.test(s)) return 'android'
  if (/mobile/.test(s)) return 'mobile'
  if (/macintosh|mac os/.test(s)) return 'mac'
  if (/windows/.test(s)) return 'windows'
  return 'desktop'
}

export function clientIpFromHeaders(req: {
  headers: { get(name: string): string | null }
}): string {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const first = forwarded.split(',')[0]?.trim()
  if (first) return first
  return req.headers.get('x-real-ip')?.trim() || ''
}

export type PlatformActivityRow = {
  category: string
  action: string
  actorKind: string
  emailHash: string
  emailDomain: string
  method: string
  outcome: string
  route: string
  ip: string
  userAgentClass: string
  correlationId: string
  detail: string
  createdAt: string
}

export async function writePlatformActivity(event: PlatformActivityEvent): Promise<void> {
  let emailHash = (event.emailHash || '').trim()
  let emailDomain = (event.emailDomain || '').trim().toLowerCase()
  if (event.email?.includes('@')) {
    const h = hashEmailForActivity(event.email)
    emailHash = h.emailHash
    emailDomain = h.emailDomain
  }

  let detail = (event.detail || '').slice(0, 500)
  if (event.tokenFingerprintSource) {
    const fp = fingerprintToken(event.tokenFingerprintSource)
    detail = detail ? `${detail} · tokenFp=${fp}` : `tokenFp=${fp}`
  }

  const row: PlatformActivityRow = {
    category: event.category,
    action: event.action,
    actorKind: event.actorKind,
    emailHash,
    emailDomain,
    method: (event.method || '').slice(0, 40),
    outcome: event.outcome,
    route: (event.route || '').slice(0, 200),
    ip: (event.ip || '').slice(0, 64),
    userAgentClass: (event.userAgentClass || '').slice(0, 40),
    correlationId: (event.correlationId || '').slice(0, 64),
    detail,
    createdAt: new Date().toISOString(),
  }

  console.info(
    '[platform-activity]',
    JSON.stringify({ ...row, organizationId: event.organizationId || '' }),
  )

  if (commonsDbEnabled() && event.organizationId) {
    try {
      await sqlForOrg(
        event.organizationId,
        `insert into platform_activity (
           organization_id, category, action, actor_kind, email_hash, email_domain,
           method, outcome, route, ip, user_agent_class, correlation_id, detail
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          event.organizationId,
          row.category,
          row.action,
          row.actorKind,
          row.emailHash,
          row.emailDomain,
          row.method,
          row.outcome,
          row.route,
          row.ip,
          row.userAgentClass,
          row.correlationId,
          row.detail,
        ],
      )
    } catch (err) {
      console.warn(
        '[platform-activity] Postgres insert skipped',
        err instanceof Error ? err.message : err,
      )
    }
  }

  try {
    const client = getWixClient()
    await client.items.insert('PlatformActivity', row)
  } catch (err) {
    console.warn(
      '[platform-activity] CMS insert skipped',
      err instanceof Error ? err.message : err,
    )
  }
}

export const ACTIVITY_CORRELATION_COOKIE = 'pavilion_act_cid'

export function newCorrelationId(): string {
  return createHash('sha256')
    .update(`${Date.now()}:${Math.random()}:${activityPepper()}`)
    .digest('hex')
    .slice(0, 24)
}

function mapCmsItem(item: Record<string, unknown>): PlatformActivityRow {
  const created =
    typeof item.createdAt === 'string'
      ? item.createdAt
      : item._createdDate
        ? String(item._createdDate)
        : ''
  return {
    category: String(item.category || ''),
    action: String(item.action || ''),
    actorKind: String(item.actorKind || ''),
    emailHash: String(item.emailHash || ''),
    emailDomain: String(item.emailDomain || ''),
    method: String(item.method || ''),
    outcome: String(item.outcome || ''),
    route: String(item.route || ''),
    ip: String(item.ip || ''),
    userAgentClass: String(item.userAgentClass || ''),
    correlationId: String(item.correlationId || ''),
    detail: String(item.detail || ''),
    createdAt: created,
  }
}

export async function listPlatformActivity(opts: {
  category?: string
  sinceIso: string
  limit?: number
  organizationId?: string
}): Promise<PlatformActivityRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 300)
  const category = (opts.category || 'auth').trim() || 'auth'
  const rows: PlatformActivityRow[] = []

  if (commonsDbEnabled() && opts.organizationId) {
    try {
      const pg = await sqlForOrg(
        opts.organizationId,
        `select category, action, actor_kind as "actorKind", email_hash as "emailHash",
                email_domain as "emailDomain", method, outcome, route, ip,
                user_agent_class as "userAgentClass", correlation_id as "correlationId",
                detail, created_at as "createdAt"
         from platform_activity
         where organization_id = $1
           and category = $2
           and created_at >= $3::timestamptz
         order by created_at desc
         limit $4`,
        [opts.organizationId, category, opts.sinceIso, limit],
      )
      for (const r of pg.rows as PlatformActivityRow[]) {
        rows.push({
          ...r,
          createdAt:
            typeof r.createdAt === 'string'
              ? r.createdAt
              : new Date(r.createdAt as unknown as string).toISOString(),
        })
      }
    } catch (err) {
      console.warn(
        '[platform-activity] Postgres list skipped',
        err instanceof Error ? err.message : err,
      )
    }
  }

  if (rows.length === 0) {
    try {
      const client = getWixClient()
      let q = client.items
        .query('PlatformActivity')
        .ge('createdAt', opts.sinceIso)
        .descending('createdAt')
        .limit(limit)
      if (category) q = q.eq('category', category)
      const found = await q.find()
      for (const item of found.items || []) {
        rows.push(mapCmsItem(item as Record<string, unknown>))
      }
    } catch (err) {
      console.warn(
        '[platform-activity] CMS list skipped',
        err instanceof Error ? err.message : err,
      )
    }
  }

  return rows
}

export type AuthActivityCounts = {
  passwordResetRequested: number
  passwordResetTokenHit: number
  loginSuccess: number
  loginFailed: number
  logout: number
}

export async function countAuthActivity(opts: {
  startIso: string
  endIso: string
  organizationId?: string
}): Promise<AuthActivityCounts> {
  const empty: AuthActivityCounts = {
    passwordResetRequested: 0,
    passwordResetTokenHit: 0,
    loginSuccess: 0,
    loginFailed: 0,
    logout: 0,
  }
  const bump = (action: string) => {
    if (action === 'password_reset_requested') empty.passwordResetRequested += 1
    else if (action === 'password_reset_token_hit') empty.passwordResetTokenHit += 1
    else if (action === 'login_success') empty.loginSuccess += 1
    else if (action === 'login_failed') empty.loginFailed += 1
    else if (action === 'logout') empty.logout += 1
  }

  if (commonsDbEnabled() && opts.organizationId) {
    try {
      const pg = await sqlForOrg(
        opts.organizationId,
        `select action, count(*)::int as n
         from platform_activity
         where organization_id = $1
           and category = 'auth'
           and created_at >= $2::timestamptz
           and created_at < $3::timestamptz
         group by action`,
        [opts.organizationId, opts.startIso, opts.endIso],
      )
      for (const row of pg.rows as { action: string; n: number }[]) bump(row.action)
      return empty
    } catch (err) {
      console.warn(
        '[platform-activity] Postgres count skipped',
        err instanceof Error ? err.message : err,
      )
    }
  }

  try {
    const client = getWixClient()
    const found = await client.items
      .query('PlatformActivity')
      .eq('category', 'auth')
      .ge('createdAt', opts.startIso)
      .lt('createdAt', opts.endIso)
      .limit(1000)
      .find()
    for (const item of found.items || []) {
      bump(String((item as { action?: string }).action || ''))
    }
  } catch (err) {
    console.warn(
      '[platform-activity] CMS count skipped',
      err instanceof Error ? err.message : err,
    )
  }
  return empty
}
