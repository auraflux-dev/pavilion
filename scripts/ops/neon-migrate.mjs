#!/usr/bin/env node
/**
 * Migrate Pavilion + HSKRG side-project Postgres from Render → Neon.
 *
 * Keeps auraflux-pg on Render. Targets:
 *   - ONE Neon DB for Pavilion (commons-prod + merge commons-crm demo data)
 *   - ONE Neon DB for hskrg-work (schema + seed; no Render dump)
 *
 * Prereqs: Neon account under robert@auraflux.co, pg_dump/pg_restore on PATH.
 *
 *   # 1) Save connection strings (chmod 600):
 *   #    /tmp/neon-pavilion.url   — Neon project "pavilion" (Launch)
 *   #    /tmp/neon-hskrg.url      — Neon project "hskrg-work" (Free)
 *   #    /tmp/render-commons-prod.url
 *   #    /tmp/render-commons-crm.url
 *
 *   node scripts/ops/neon-migrate.mjs --phase=prod
 *   node scripts/ops/neon-migrate.mjs --phase=crm-merge
 *   node scripts/ops/neon-migrate.mjs --phase=hskrg
 *   node scripts/ops/neon-migrate.mjs --phase=smoke
 *
 * After smoke + Vercel env swap + redeploy, delete Render DBs in dashboard.
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../frontend/package.json'))
const { Client } = require('pg')

function readUrl(path) {
  if (process.env[path]) return process.env[path].trim()
  const file = path.startsWith('/') ? path : `/tmp/${path}`
  if (!existsSync(file)) throw new Error(`Missing ${file}`)
  let u = readFileSync(file, 'utf8').trim()
  if (!u.includes('sslmode=')) u += (u.includes('?') ? '&' : '?') + 'sslmode=require'
  return u
}

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: { ...process.env, ...env } })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error(`${cmd} failed (${r.status})`)
  }
  return r.stdout
}

function requirePgTools() {
  for (const bin of ['pg_dump', 'pg_restore', 'psql']) {
    const r = spawnSync('which', [bin], { encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`Need ${bin} on PATH (brew install libpq)`)
  }
}

async function tableNames(client) {
  const { rows } = await client.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  )
  return rows.map((r) => r.tablename)
}

async function copyTableData(src, dest, table) {
  const { rows } = await src.query(`select * from "${table}"`)
  if (!rows.length) {
    console.log(`  skip ${table} (empty)`)
    return 'empty'
  }
  const cols = Object.keys(rows[0])
  const colList = cols.map((c) => `"${c}"`).join(', ')
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
  let inserted = 0
  for (const row of rows) {
    const vals = cols.map((c) => row[c])
    try {
      await dest.query(
        `insert into "${table}" (${colList}) values (${placeholders}) on conflict do nothing`,
        vals,
      )
      inserted++
    } catch (e) {
      const msg = String(e.message || e)
      if (msg.includes('no unique or exclusion constraint')) {
        await dest.query(`insert into "${table}" (${colList}) values (${placeholders})`, vals)
        inserted++
      } else {
        throw e
      }
    }
  }
  console.log(`  ${table}: ${inserted}/${rows.length} rows`)
  return 'copied'
}

async function phaseProd() {
  requirePgTools()
  const src = readUrl('/tmp/render-commons-prod.url')
  const dest = readUrl('/tmp/neon-pavilion.url')
  console.log('=== prod: Render commons-prod → Neon pavilion ===')
  run('pg_dump', [
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
    '-Fc',
    src,
    '-f',
    '/tmp/neon-pavilion.dump',
  ])
  run('pg_restore', [
    '--no-owner',
    '--no-acl',
    '--clean',
    '--if-exists',
    '-d',
    dest,
    '/tmp/neon-pavilion.dump',
  ])
  console.log('prod restore ok')
}

async function applyCrmSchemaIfNeeded(destClient, srcTables, destTableSet) {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '../../frontend/lib/crm/schema.sql')
  const schemaSql = readFileSync(schemaPath, 'utf8')
  const crmTablesInSchema = [...schemaSql.matchAll(/create table if not exists\s+(\w+)/gi)].map((m) => m[1])
  const missingCrm = crmTablesInSchema.filter((t) => srcTables.includes(t) && !destTableSet.has(t))
  if (!missingCrm.length) return destTableSet
  console.log(`  applying CRM schema.sql for missing tables: ${missingCrm.join(', ')}`)
  await destClient.query(schemaSql)
  const refreshed = new Set(await tableNames(destClient))
  return refreshed
}

async function phaseCrmMerge() {
  const src = readUrl('/tmp/render-commons-crm.url')
  const dest = readUrl('/tmp/neon-pavilion.url')
  console.log('=== crm-merge: commons-crm data → Neon pavilion (on conflict skip) ===')
  const s = new Client({ connectionString: src, ssl: { rejectUnauthorized: false } })
  const d = new Client({ connectionString: dest, ssl: { rejectUnauthorized: false } })
  await s.connect()
  await d.connect()
  const merged = []
  const skipped = []
  try {
    const srcTables = await tableNames(s)
    let destTableSet = new Set(await tableNames(d))
    // schema.sql has CRM domain tables only (not Better Auth account/session/user).
    destTableSet = await applyCrmSchemaIfNeeded(d, srcTables, destTableSet)
    const skipNames = new Set(['schema_migrations'])
    // FK-safe order: parents before children (alphabetical order breaks auth + CRM).
    const mergeRank = (name) =>
      ({
        user: 10,
        verification: 20,
        session: 30,
        account: 40,
        organizations: 50,
        people: 60,
        households: 70,
        household_adults: 80,
        students: 90,
        memberships: 100,
        store_cards: 110,
        staff_assignments: 120,
        organization_connectors: 130,
        organization_sync_state: 140,
        staff_audit: 150,
        error_events: 160,
      }[name] ?? 500)
    const ordered = [...srcTables].sort((a, b) => mergeRank(a) - mergeRank(b) || a.localeCompare(b))
    for (const t of ordered) {
      if (skipNames.has(t)) {
        skipped.push(`${t} (excluded)`)
        continue
      }
      if (!destTableSet.has(t)) {
        console.log(`  skip ${t} (missing on dest)`)
        skipped.push(t)
        continue
      }
      const copyResult = await copyTableData(s, d, t)
      if (copyResult === 'empty') skipped.push(`${t} (empty)`)
      else merged.push(t)
    }
  } finally {
    await s.end()
    await d.end()
  }
  console.log(`merged (${merged.length}): ${merged.join(', ') || '(none)'}`)
  console.log(`skipped (${skipped.length}): ${skipped.join(', ') || '(none)'}`)
  console.log('crm merge ok')
}

async function phaseHskrg() {
  const dest = readUrl('/tmp/neon-hskrg.url')
  console.log('=== hskrg: drizzle push + seed on Neon ===')
  const repo = process.env.HSKRG_WORK_REPO || `${process.env.HOME}/hskrg-work`
  const r = spawnSync('npm', ['run', 'db:push'], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: dest },
  })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    throw new Error('db:push failed')
  }
  const s = spawnSync('npm', ['run', 'seed'], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: dest },
  })
  if (s.status !== 0) {
    console.error(s.stderr || s.stdout)
    throw new Error('seed failed')
  }
  console.log('hskrg schema + seed ok')
}

async function phaseSmoke() {
  const pavilion = readUrl('/tmp/neon-pavilion.url')
  const hskrg = readUrl('/tmp/neon-hskrg.url')
  for (const [label, url] of [
    ['pavilion', pavilion],
    ['hskrg', hskrg],
  ]) {
    const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
    await c.connect()
    const { rows } = await c.query('select current_database() as db, version()')
    const tables = await tableNames(c)
    console.log(`${label}: db=${rows[0].db} tables=${tables.length}`)
    await c.end()
  }
}

const phase = (process.argv.find((a) => a.startsWith('--phase=')) || '').split('=')[1]
if (!phase) {
  console.error('Usage: node neon-migrate.mjs --phase=prod|crm-merge|hskrg|smoke')
  process.exit(1)
}

;(async () => {
  if (phase === 'prod') await phaseProd()
  else if (phase === 'crm-merge') await phaseCrmMerge()
  else if (phase === 'hskrg') await phaseHskrg()
  else if (phase === 'smoke') await phaseSmoke()
  else throw new Error(`Unknown phase ${phase}`)
})().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
