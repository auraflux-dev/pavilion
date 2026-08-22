#!/usr/bin/env node
/**
 * Concurrent program checkout burst against staging (Square sandbox).
 *
 * Usage:
 *   CHECKOUT_LOADTEST_SECRET=... node scripts/checkout-burst.mjs
 *   CHECKOUT_LOADTEST_SECRET=... CONCURRENCY=30 node scripts/checkout-burst.mjs
 *   CHECKOUT_LOADTEST_SECRET=... CLEANUP=1 node scripts/checkout-burst.mjs
 *
 * Defaults to https://shmspto.vercel.app. Refuses production hosts.
 * Writes JSONL to tmp/checkout-burst-<runId>.jsonl
 */
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const baseUrl = (process.env.BURST_BASE_URL || 'https://shmspto.vercel.app').replace(/\/$/, '')
const secret = String(process.env.CHECKOUT_LOADTEST_SECRET || '').trim()
const concurrencyRaw = process.env.CONCURRENCY
const concurrency = Math.max(
  0,
  Math.min(60, Number(concurrencyRaw === undefined ? 30 : concurrencyRaw) || 0),
)
const programId = String(process.env.PROGRAM_ID || '').trim() || undefined
const doCleanup = process.env.CLEANUP === '1' || process.env.CLEANUP === 'true'
const runId =
  String(process.env.RUN_ID || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 16) || randomBytes(5).toString('hex')

function refuseIfProdHost(url) {
  const host = new URL(url).host.toLowerCase()
  if (host === 'www.shmspto.org' || host === 'shmspto.org') {
    console.error(`REFUSING: ${host} is production. Use shmspto.vercel.app`)
    process.exit(1)
  }
}

if (!secret) {
  console.error('Set CHECKOUT_LOADTEST_SECRET (Preview env on frontend).')
  process.exit(1)
}

refuseIfProdHost(baseUrl)

const outDir = join(root, 'tmp')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `checkout-burst-${runId}.jsonl`)
writeFileSync(outPath, '')

console.log(`Checkout burst`)
console.log(`  base:        ${baseUrl}`)
console.log(`  runId:       ${runId}`)
console.log(`  concurrency: ${concurrency}`)
console.log(`  programId:   ${programId || '(auto pick paid Fall)'}`)
console.log(`  report:      ${outPath}`)
console.log('')

async function runWorker(workerId) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${baseUrl}/api/checkout/loadtest/worker`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ runId, workerId, programId }),
    })
    const body = await res.json().catch(() => ({}))
    const row = {
      httpStatus: res.status,
      client_ms: Date.now() - t0,
      ...body,
    }
    appendFileSync(outPath, `${JSON.stringify(row)}\n`)
    return row
  } catch (err) {
    const row = {
      httpStatus: 0,
      client_ms: Date.now() - t0,
      ok: false,
      runId,
      workerId,
      outcome: 'error',
      error: err instanceof Error ? err.message : String(err),
    }
    appendFileSync(outPath, `${JSON.stringify(row)}\n`)
    return row
  }
}

if (concurrency === 0 && !doCleanup) {
  console.error('CONCURRENCY=0 requires CLEANUP=1 (cleanup-only mode).')
  process.exit(1)
}

const started = Date.now()
const results =
  concurrency === 0
    ? []
    : await Promise.all(Array.from({ length: concurrency }, (_, i) => runWorker(i)))
const elapsed = Date.now() - started

const counts = {
  ok: 0,
  pay_fail: 0,
  pay_ok_fulfill_fail: 0,
  error: 0,
}
const latencies = []
for (const r of results) {
  const outcome = String(r.outcome || 'error')
  if (outcome in counts) counts[outcome] += 1
  else counts.error += 1
  if (typeof r.t_total_ms === 'number') latencies.push(r.t_total_ms)
  else if (typeof r.client_ms === 'number') latencies.push(r.client_ms)
}
latencies.sort((a, b) => a - b)
const pct = (p) => {
  if (!latencies.length) return null
  const idx = Math.min(latencies.length - 1, Math.ceil((p / 100) * latencies.length) - 1)
  return latencies[idx]
}

console.log('Results')
console.log(`  wall_ms:              ${elapsed}`)
console.log(`  ok:                   ${counts.ok}`)
console.log(`  pay_fail:             ${counts.pay_fail}`)
console.log(`  pay_ok_fulfill_fail:  ${counts.pay_ok_fulfill_fail}`)
console.log(`  error:                ${counts.error}`)
console.log(`  p50_ms:               ${pct(50)}`)
console.log(`  p95_ms:               ${pct(95)}`)
console.log(`  max_ms:               ${latencies[latencies.length - 1] ?? null}`)

if (doCleanup) {
  console.log('\nCleanup…')
  const res = await fetch(`${baseUrl}/api/checkout/loadtest/cleanup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ runId }),
  })
  const body = await res.json().catch(() => ({}))
  console.log(`  cleanup HTTP ${res.status}`, body)
} else {
  console.log(`\nLeave CMS rows tagged loadtest:${runId}. Cleanup with:`)
  console.log(
    `  CHECKOUT_LOADTEST_SECRET=… CLEANUP=1 RUN_ID=${runId} CONCURRENCY=0 node scripts/checkout-burst.mjs`,
  )
  console.log(`  or POST ${baseUrl}/api/checkout/loadtest/cleanup { "runId": "${runId}" }`)
}

const failed =
  concurrency > 0 && (counts.ok < concurrency || counts.pay_ok_fulfill_fail > 0)
process.exit(failed ? 1 : 0)
