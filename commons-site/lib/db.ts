import 'server-only'
import { readFileSync } from 'node:fs'
import pg from 'pg'

function connectionString(): string {
  if (process.env.COMMONS_PROD_DATABASE_URL?.trim()) {
    return process.env.COMMONS_PROD_DATABASE_URL.trim()
  }
  const file = process.env.COMMONS_PROD_DATABASE_URL_FILE?.trim()
  if (file) return readFileSync(file, 'utf8').trim()
  throw new Error('Set COMMONS_PROD_DATABASE_URL or COMMONS_PROD_DATABASE_URL_FILE')
}

function assertCommonsProdUrl(url: string) {
  const u = url.toLowerCase()
  if (u.includes('commons_crm') || u.includes('da2fomm')) {
    throw new Error('Refusing demo commons-crm. Use commons-prod only.')
  }
  if (!(u.includes('commons_prod') || u.includes('da2t016'))) {
    throw new Error('DATABASE URL does not look like commons-prod. Aborting.')
  }
}

const DDL = `
create table if not exists commons_subscriptions (
  id                  bigserial primary key,
  email               text not null,
  school_name         text not null default '',
  city                text not null default '',
  role                text not null default '',
  amount_cents        integer not null default 39900,
  status              text not null default 'checkout_started',
  stripe_checkout_session_id text,
  stripe_customer_id  text,
  stripe_subscription_id text,
  stripe_event_id     text,
  raw                 jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists commons_subscriptions_email_idx on commons_subscriptions (email);
create unique index if not exists commons_subscriptions_stripe_event_uidx
  on commons_subscriptions (stripe_event_id);
alter table commons_subscriptions add column if not exists stripe_checkout_session_id text;
alter table commons_subscriptions add column if not exists stripe_customer_id text;
alter table commons_subscriptions add column if not exists stripe_subscription_id text;
alter table commons_subscriptions add column if not exists stripe_event_id text;

create table if not exists commons_account_tokens (
  id         bigserial primary key,
  email      text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists commons_account_tokens_email_idx
  on commons_account_tokens (email);
`

let pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (pool) return pool
  const url = connectionString()
  assertCommonsProdUrl(url)
  pool = new pg.Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 2,
  })
  return pool
}

export async function ensureSubscriptionsSchema(): Promise<void> {
  const p = getPool()
  await p.query(DDL)
}

export type SubscriptionLead = {
  email: string
  schoolName: string
  city: string
  role: string
  checkoutSessionId?: string | null
  status?: string
  raw?: Record<string, unknown>
}

export async function insertCheckoutStarted(lead: SubscriptionLead): Promise<number> {
  await ensureSubscriptionsSchema()
  const p = getPool()
  const r = await p.query<{ id: string }>(
    `insert into commons_subscriptions (
       email, school_name, city, role, status, stripe_checkout_session_id, raw, updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7::jsonb, now())
     returning id`,
    [
      lead.email,
      lead.schoolName,
      lead.city,
      lead.role,
      lead.status || 'checkout_started',
      lead.checkoutSessionId || null,
      JSON.stringify(lead.raw || {}),
    ],
  )
  return Number(r.rows[0].id)
}

export async function upsertFromStripeEvent(input: {
  eventId: string
  status: string
  email?: string | null
  customerId?: string | null
  subscriptionId?: string | null
  checkoutSessionId?: string | null
  schoolName?: string | null
  city?: string | null
  role?: string | null
  raw: unknown
}): Promise<void> {
  await ensureSubscriptionsSchema()
  const p = getPool()
  await p.query(
    `insert into commons_subscriptions (
       email, school_name, city, role, status, stripe_event_id, stripe_customer_id,
       stripe_subscription_id, stripe_checkout_session_id, raw, updated_at
     ) values (
       coalesce($1, ''), coalesce($2, ''), coalesce($3, ''), coalesce($4, ''),
       $5, $6, $7, $8, $9, $10::jsonb, now()
     )
     on conflict (stripe_event_id) do update set
       status = excluded.status,
       stripe_customer_id = coalesce(excluded.stripe_customer_id, commons_subscriptions.stripe_customer_id),
       stripe_subscription_id = coalesce(excluded.stripe_subscription_id, commons_subscriptions.stripe_subscription_id),
       stripe_checkout_session_id = coalesce(excluded.stripe_checkout_session_id, commons_subscriptions.stripe_checkout_session_id),
       email = case when excluded.email <> '' then excluded.email else commons_subscriptions.email end,
       school_name = case when excluded.school_name <> '' then excluded.school_name else commons_subscriptions.school_name end,
       city = case when excluded.city <> '' then excluded.city else commons_subscriptions.city end,
       role = case when excluded.role <> '' then excluded.role else commons_subscriptions.role end,
       raw = excluded.raw,
       updated_at = now()`,
    [
      input.email || '',
      input.schoolName || '',
      input.city || '',
      input.role || '',
      input.status,
      input.eventId,
      input.customerId || null,
      input.subscriptionId || null,
      input.checkoutSessionId || null,
      JSON.stringify(input.raw ?? {}),
    ],
  )
}

export type SubscriptionRow = {
  id: number
  email: string
  school_name: string
  city: string
  role: string
  status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  amount_cents: number
  updated_at: Date
}

export async function findLatestSubscriptionByEmail(
  email: string,
): Promise<SubscriptionRow | null> {
  await ensureSubscriptionsSchema()
  const p = getPool()
  const r = await p.query<SubscriptionRow>(
    `select id, email, school_name, city, role, status, stripe_customer_id,
            stripe_subscription_id, amount_cents, updated_at
       from commons_subscriptions
      where lower(email) = lower($1)
        and email <> ''
      order by updated_at desc
      limit 1`,
    [email],
  )
  return r.rows[0] || null
}

export async function insertAccountToken(input: {
  email: string
  tokenHash: string
  expiresAt: Date
}): Promise<void> {
  await ensureSubscriptionsSchema()
  const p = getPool()
  await p.query(
    `insert into commons_account_tokens (email, token_hash, expires_at)
     values ($1, $2, $3)`,
    [input.email.toLowerCase(), input.tokenHash, input.expiresAt],
  )
}

export async function consumeAccountToken(
  tokenHash: string,
): Promise<string | null> {
  await ensureSubscriptionsSchema()
  const p = getPool()
  const r = await p.query<{ email: string }>(
    `update commons_account_tokens
        set used_at = now()
      where token_hash = $1
        and used_at is null
        and expires_at > now()
      returning email`,
    [tokenHash],
  )
  return r.rows[0]?.email || null
}
