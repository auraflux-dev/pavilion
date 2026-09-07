#!/usr/bin/env node
/**
 * SHMS VIP weekly intake — accept / deny SHMS-ahead changes into Pavilion.
 *
 * Lane B (VIP survival): ship on shmspto first, then catch product up on a schedule.
 * Lane A (future default): author in pavilion → promote → ship www.
 *
 *   node scripts/shms-weekly-intake.mjs
 *   node scripts/shms-weekly-intake.mjs --board
 *   node scripts/shms-weekly-intake.mjs --apply-accept
 *   node scripts/shms-weekly-intake.mjs --fetch --board
 *   node scripts/shms-weekly-intake.mjs --json
 *
 * Does NOT deploy www. After --apply-accept: commit pavilion, ship commons-pto-demo.
 * See docs/CUSTOMER-SHMS-VIP.md
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collect,
  isMarketingWrapper,
  isPavilionAhead,
  isProductPath,
  readText,
} from './lib/shms-frontend-trees.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const MONO =
  process.env.MONO_ROOT?.trim() ||
  (existsSync(join(repoRoot, 'frontend', 'app')) ? repoRoot : join(homedir(), 'pavilion'))
const SHMS = process.env.SHMS_ROOT?.trim() || join(homedir(), 'shmspto')

const args = new Set(process.argv.slice(2))
const wantJson = args.has('--json')
const wantBoard = args.has('--board')
const applyAccept = args.has('--apply-accept')
const doFetch = args.has('--fetch')
const includeMarketing = args.has('--include-marketing')

function gitSha(cwd) {
  const res = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' })
  return res.status === 0 ? res.stdout.trim() : ''
}

function gitShort(cwd) {
  const res = spawnSync('git', ['log', '-1', '--oneline'], { cwd, encoding: 'utf8' })
  return res.status === 0 ? res.stdout.trim() : ''
}

function fetchShms() {
  console.log(`Fetching ${SHMS} origin/main …`)
  const fetch = spawnSync('git', ['fetch', 'origin'], { cwd: SHMS, encoding: 'utf8' })
  if (fetch.status !== 0) {
    console.error(fetch.stderr || fetch.stdout || 'git fetch failed')
    process.exit(1)
  }
  const merge = spawnSync('git', ['merge', '--ff-only', 'origin/main'], {
    cwd: SHMS,
    encoding: 'utf8',
  })
  if (merge.status !== 0) {
    console.error(merge.stderr || merge.stdout || 'ff-only merge failed (dirty or diverged?)')
    process.exit(1)
  }
  console.log(`  HEAD ${gitShort(SHMS)}\n`)
}

function boardCli(cmdArgs) {
  const script = join(homedir(), 'hskrg-work', 'scripts', 'agent-board.mjs')
  if (!existsSync(script)) {
    throw new Error(`Missing ${script}`)
  }
  const res = spawnSync(process.execPath, [script, ...cmdArgs], {
    encoding: 'utf8',
    env: process.env,
  })
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || `agent-board exit ${res.status}`)
  }
  return (res.stdout || '').trim()
}

function todayStamp() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function bucketLines(rows) {
  if (!rows.length) return '_None._'
  return rows.map((r) => `- \`${r.action}\` \`${r.f}\` — ${r.reason}`).join('\n')
}

if (doFetch) fetchShms()

const monoFront = join(MONO, 'frontend')
const shmsFront = join(SHMS, 'frontend')

if (!existsSync(monoFront) || !existsSync(shmsFront)) {
  console.error('Missing frontend trees.')
  console.error(`  MONO: ${monoFront} (${existsSync(monoFront) ? 'ok' : 'missing'})`)
  console.error(`  SHMS: ${shmsFront} (${existsSync(shmsFront) ? 'ok' : 'missing'})`)
  process.exit(2)
}

const mono = collect(monoFront)
const shms = collect(shmsFront)
const allSchool = new Set([...mono, ...shms].filter((f) => isProductPath(f, { includeMarketing: true })))

/** @typedef {{ f: string, action: 'add' | 'update', bucket: 'accept' | 'deny' | 'later', reason: string }} IntakeRow */

/** @type {IntakeRow[]} */
const rows = []

for (const f of [...allSchool].sort()) {
  const from = join(shmsFront, f)
  const to = join(monoFront, f)
  const inShms = shms.has(f)
  const inMono = mono.has(f)
  if (!inShms) continue

  const shmsText = readText(from)
  const pavText = inMono ? readText(to) : ''

  if (isMarketingWrapper(f) && !includeMarketing) {
    if (!inMono || shmsText !== pavText) {
      rows.push({
        f,
        action: inMono ? 'update' : 'add',
        bucket: 'deny',
        reason: 'SHMS marketing wrapper (school-only)',
      })
    }
    continue
  }

  if (!isProductPath(f, { includeMarketing })) continue

  /** @type {'add' | 'update' | null} */
  let action = null
  if (!inMono) action = 'add'
  else if (shmsText !== pavText) action = 'update'
  else continue

  if (inMono && isPavilionAhead(f, pavText, shmsText)) {
    rows.push({
      f,
      action,
      bucket: 'deny',
      reason: 'Pavilion product ahead (do not overwrite)',
    })
    continue
  }

  rows.push({
    f,
    action,
    bucket: 'accept',
    reason: action === 'add' ? 'SHMS-only shared product' : 'SHMS content ahead',
  })
}

const accept = rows.filter((r) => r.bucket === 'accept')
const deny = rows.filter((r) => r.bucket === 'deny')
const later = rows.filter((r) => r.bucket === 'later')

const report = {
  at: new Date().toISOString(),
  date: todayStamp(),
  pavilionHead: gitSha(MONO),
  shmsHead: gitSha(SHMS),
  pavilionTip: gitShort(MONO),
  shmsTip: gitShort(SHMS),
  counts: { accept: accept.length, deny: deny.length, later: later.length },
  accept,
  deny,
  later,
}

mkdirSync(join(repoRoot, 'tmp'), { recursive: true })
writeFileSync(join(repoRoot, 'tmp', 'last-shms-intake.json'), JSON.stringify(report, null, 2))

if (wantJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log('SHMS VIP weekly intake (shmspto → pavilion)')
  console.log(`  pavilion: ${report.pavilionTip || report.pavilionHead.slice(0, 7)}`)
  console.log(`  shmspto:  ${report.shmsTip || report.shmsHead.slice(0, 7)}`)
  console.log(`  accept ${accept.length} · deny ${deny.length} · later ${later.length}`)
  console.log('')
  console.log('ACCEPT (shared product — safe to port)')
  for (const r of accept) console.log(`  ${r.action.padEnd(6)} ${r.f}`)
  if (!accept.length) console.log('  (none)')
  console.log('')
  console.log('DENY (keep school-only or pavilion-ahead)')
  for (const r of deny) console.log(`  ${r.action.padEnd(6)} ${r.f}  # ${r.reason}`)
  if (!deny.length) console.log('  (none)')
  console.log('')
  console.log('LATER')
  for (const r of later) console.log(`  ${r.action.padEnd(6)} ${r.f}`)
  if (!later.length) console.log('  (none — move files here manually in the board ticket)')
  console.log('')
  console.log('Stamp: tmp/last-shms-intake.json')
  console.log('Next:')
  console.log('  node scripts/shms-weekly-intake.mjs --board')
  console.log('  node scripts/shms-weekly-intake.mjs --apply-accept')
  console.log('  # then commit pavilion + ship-pavilion (NOT www)')
}

if (applyAccept) {
  if (!accept.length) {
    console.log('\nNothing to apply in ACCEPT.')
  } else {
    console.log(`\nAPPLY ACCEPT (${accept.length} files) …`)
    for (const r of accept) {
      const from = join(shmsFront, r.f)
      const to = join(monoFront, r.f)
      mkdirSync(dirname(to), { recursive: true })
      copyFileSync(from, to)
      console.log(`  wrote ${r.f}`)
    }
    console.log('\nReview git diff, then commit + ship commons-pto-demo.')
    console.log('Do not promote/ship www unless Rob asks.')
  }
}

if (wantBoard) {
  const title = `SHMS weekly intake ${report.date}`
  const body = `## Goal
VIP weekly intake: port accepted SHMS-ahead shared product into pavilion.

## Heads
- pavilion: \`${report.pavilionTip || report.pavilionHead}\`
- shmspto: \`${report.shmsTip || report.shmsHead}\`

## Accept (${accept.length})
${bucketLines(accept)}

## Deny (${deny.length})
${bucketLines(deny)}

## Later (${later.length})
${bucketLines(later)}

## Commands
\`\`\`bash
cd ~/pavilion
node scripts/shms-weekly-intake.mjs --fetch
node scripts/shms-weekly-intake.mjs --apply-accept
# review, commit, ship-pavilion — NOT www
\`\`\`

Audience: product (+ customer:shms)
Wiki: HOME/product-shms-weekly-intake
`

  let issueId = ''
  try {
    const searchOut = boardCli(['search', '--org', 'pavilion', '--q', 'SHMS weekly intake'])
    const lines = searchOut.split('\n').filter((l) => l.startsWith('iss_'))
    const hit = lines.find((l) => l.includes(report.date) && !l.includes('\tdone\t'))
    if (hit) {
      issueId = hit.split('\t')[0]
      boardCli(['comment', '--org', 'pavilion', '--issue', issueId, '--body', body])
      boardCli(['set-status', '--org', 'pavilion', '--issue', issueId, '--status', 'open'])
      console.log(`\nBoard: updated ${issueId}`)
    } else {
      const created = boardCli([
        'create-issue',
        '--org',
        'pavilion',
        '--title',
        title,
        '--labels',
        'product,customer:shms',
        '--body',
        body,
      ])
      const parsed = JSON.parse(created)
      issueId = parsed.issueId || ''
      console.log(`\nBoard: created ${issueId || created}`)
    }
  } catch (err) {
    console.error(`\nBoard update failed: ${err instanceof Error ? err.message : err}`)
    process.exitCode = 1
  }
}

if (!wantJson && !applyAccept && !wantBoard) {
  process.exit(accept.length || deny.length ? 0 : 0)
}
