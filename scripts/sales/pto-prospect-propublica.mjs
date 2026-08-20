#!/usr/bin/env node
/**
 * ProPublica Nonprofit Explorer → Commons prod platform leads.
 *
 * Isolation:
 * - Writes only to commons-prod (platform table pto_prospects).
 * - Refuses commons-crm (demo), Stone Hill, and auraflux-pg.
 * - No SHMS Wix / Prisma. Public 990 org data only.
 *
 * Usage:
 *   COMMONS_PROD_DATABASE_URL=… node scripts/sales/pto-prospect-propublica.mjs --states=VA --min=50000
 *   COMMONS_PROD_DATABASE_URL_FILE=/tmp/commons-prod.url node scripts/sales/pto-prospect-propublica.mjs --states=VA,MD --min=50000
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../frontend/package.json'))
const pg = require('pg')

const BASE = 'https://projects.propublica.org/nonprofits/api/v2'
const QUERIES = ['PTO', 'PTA', '"parent teacher"', '"parents association"']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseArgs(argv) {
  const out = { states: ['VA'], min: 50_000, pagesPerQuery: 40 }
  for (const a of argv.slice(2)) {
    if (a.startsWith('--states=')) out.states = a.slice(9).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    else if (a.startsWith('--min=')) out.min = Number(a.slice(6))
    else if (a.startsWith('--pages=')) out.pagesPerQuery = Number(a.slice(8))
  }
  return out
}

function connectionString() {
  if (process.env.COMMONS_PROD_DATABASE_URL?.trim()) return process.env.COMMONS_PROD_DATABASE_URL.trim()
  const file = process.env.COMMONS_PROD_DATABASE_URL_FILE?.trim()
  if (file) return readFileSync(file, 'utf8').trim()
  throw new Error('Set COMMONS_PROD_DATABASE_URL or COMMONS_PROD_DATABASE_URL_FILE')
}

function assertCommonsProdUrl(url) {
  const u = url.toLowerCase()
  if (u.includes('commons_crm') || u.includes('da2fomm')) {
    throw new Error('Refusing demo commons-crm. Use commons-prod only.')
  }
  if (u.includes('auraflux') || u.includes('d7ojt8l')) {
    throw new Error('Refusing auraflux-pg. Prospects belong on commons-prod.')
  }
  if (!(u.includes('commons_prod') || u.includes('da2t016'))) {
    throw new Error('DATABASE URL does not look like commons-prod. Aborting.')
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function searchPage(q, state, page) {
  const params = new URLSearchParams()
  params.set('q', q)
  params.set('page', String(page))
  params.set('state[id]', state)
  params.set('c_code[id]', '3')
  params.set('ntee[id]', '2')
  return fetchJson(`${BASE}/search.json?${params}`)
}

function latestRevenue(filings) {
  const rows = (filings || [])
    .map((f) => ({
      year: Number(f.tax_prd_yr) || 0,
      revenue: Number(f.totrevenue ?? f.totrevnue ?? f.totrcptperbks),
      formtype: f.formtype,
    }))
    .filter((r) => Number.isFinite(r.revenue))
    .sort((a, b) => b.year - a.year)
  return rows[0] || null
}

function looksLikePto(name = '') {
  const n = name.toUpperCase()
  return (
    /\bPTO\b/.test(n) ||
    /\bPTA\b/.test(n) ||
    /PARENT\s*[-]?\s*TEACHER/.test(n) ||
    /PARENTS?\s+AND\s+TEACHERS?/.test(n) ||
    (/PARENT\s+ORGANIZATION/.test(n) &&
      /\b(ELEMENTARY|MIDDLE|HIGH|SCHOOL|ACADEMY)\b/.test(n))
  )
}

function looksLikeBoosterOrBand(name = '') {
  const n = name.toUpperCase()
  return (
    /\bBOOSTER\b/.test(n) ||
    /\bBAND\b/.test(n) ||
    /\bORCHESTRA\b/.test(n) ||
    /\bMARCHING\b/.test(n) ||
    /\bATHLETIC\b/.test(n) ||
    /\bFOOTBALL\b/.test(n) ||
    /\bCHEER\b/.test(n) ||
    /\bGYMNAST/.test(n) ||
    /\bPARENTS?\s+ASSOCIATION\b/.test(n)
  )
}

const DDL = `
create table if not exists pto_prospects (
  ein              text primary key,
  name             text not null,
  city             text not null default '',
  state            text not null default '',
  ntee_code        text not null default '',
  latest_tax_year  integer,
  totrevenue       bigint,
  formtype         integer,
  propublica_url   text not null default '',
  source           text not null default 'propublica',
  status           text not null default 'new',
  notes            text not null default '',
  scraped_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pto_prospects_state_rev_idx on pto_prospects (state, totrevenue desc);
create index if not exists pto_prospects_status_idx on pto_prospects (status);
`

async function main() {
  const opts = parseArgs(process.argv)
  const url = connectionString()
  assertCommonsProdUrl(url)

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query(DDL)

  const byEin = new Map()
  for (const state of opts.states) {
    for (const q of QUERIES) {
      for (let page = 0; page < opts.pagesPerQuery; page++) {
        const data = await searchPage(q, state, page)
        const orgs = data.organizations || []
        if (!orgs.length) break
        for (const o of orgs) {
          if (!o?.ein) continue
          if (!looksLikePto(o.name || '') && !looksLikePto(o.sub_name || '')) continue
          if (looksLikeBoosterOrBand(o.name || '') || looksLikeBoosterOrBand(o.sub_name || '')) continue
          const key = String(o.ein)
          if (!byEin.has(key)) {
            byEin.set(key, {
              ein: key,
              name: o.name || '',
              city: o.city || '',
              state: o.state || state,
              ntee_code: o.ntee_code || o.raw_ntee_code || '',
            })
          }
        }
        const pages = Number(data.num_pages) || 1
        await sleep(250)
        if (page + 1 >= pages) break
      }
    }
  }

  console.log(JSON.stringify({ candidates: byEin.size, states: opts.states, min: opts.min }))

  let kept = 0
  let skipped = 0
  let errors = 0
  for (const org of byEin.values()) {
    try {
      const detail = await fetchJson(`${BASE}/organizations/${org.ein}.json`)
      const latest = latestRevenue(detail.filings_with_data)
      await sleep(300)
      const orgName = detail.organization?.name || org.name
      if (looksLikeBoosterOrBand(orgName)) {
        skipped++
        continue
      }
      if (!latest || latest.revenue < opts.min) {
        skipped++
        continue
      }
      const strein = detail.organization?.strein || org.ein
      const propublicaUrl = `https://projects.propublica.org/nonprofits/organizations/${strein}`
      await client.query(
        `insert into pto_prospects (
           ein, name, city, state, ntee_code, latest_tax_year, totrevenue, formtype,
           propublica_url, source, status, scraped_at, updated_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'propublica','new', now(), now())
         on conflict (ein) do update set
           name = excluded.name,
           city = excluded.city,
           state = excluded.state,
           ntee_code = excluded.ntee_code,
           latest_tax_year = excluded.latest_tax_year,
           totrevenue = excluded.totrevenue,
           formtype = excluded.formtype,
           propublica_url = excluded.propublica_url,
           updated_at = now()`,
        [
          org.ein,
          orgName,
          detail.organization?.city || org.city,
          detail.organization?.state || org.state,
          detail.organization?.ntee_code || org.ntee_code,
          latest.year,
          Math.round(latest.revenue),
          latest.formtype ?? null,
          propublicaUrl,
        ],
      )
      kept++
      if (kept % 10 === 0) {
        console.log(JSON.stringify({ progress: kept, last: org.name, revenue: latest.revenue }))
      }
    } catch (err) {
      errors++
      console.error(JSON.stringify({ ein: org.ein, error: err instanceof Error ? err.message : String(err) }))
      await sleep(500)
    }
  }

  const summary = await client.query(
    `select state, count(*)::int as n, min(totrevenue)::bigint as min_rev, max(totrevenue)::bigint as max_rev
       from pto_prospects
      where totrevenue >= $1
      group by state
      order by state`,
    [opts.min],
  )
  await client.end()
  console.log(
    JSON.stringify(
      {
        ok: true,
        kept,
        skipped,
        errors,
        byState: summary.rows,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
