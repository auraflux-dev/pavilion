#!/usr/bin/env node
/**
 * REQUIRED agent ship path for Pavilion (robert-4220).
 *
 *   node scripts/ship-pavilion.mjs --target commons-pto-demo
 *   node scripts/ship-pavilion.mjs --target commons-site
 *   node scripts/ship-pavilion.mjs --target commons-pto-demo --skip-push --cli-fallback
 *
 * Stone Hill www ships from ~/shmspto only — never from this script.
 */
import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const skipPush = args.includes('--skip-push')
const cliFallback = args.includes('--cli-fallback')
const targetIdx = args.indexOf('--target')
const target =
  targetIdx >= 0 && args[targetIdx + 1] ? args[targetIdx + 1] : 'commons-pto-demo'

const POLL_ATTEMPTS = 8
const POLL_SECONDS = 30

function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd ?? ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
  })
  if (opts.inherit) {
    if (res.status !== 0 && !opts.allowFail) process.exit(res.status || 1)
    return res.status ?? 0
  }
  if (res.status !== 0 && !opts.allowFail) process.exit(res.status || 1)
  return res.status ?? 0
}

function sleep(seconds) {
  spawnSync('sleep', [String(seconds)], { stdio: 'ignore' })
}

console.log(`Pavilion product ship — target "${target}" (robert-4220).`)
console.log('This does NOT update www.shmspto.org (customer #1). Use promote-to-shms when intentional.\n')

console.log('Optional: parity if school + demo both touched …')
run('node', ['scripts/shms-frontend-parity.mjs'], { allowFail: true })

if (!skipPush) {
  console.log('\n1/2  git push origin main …')
  run('git', ['push', 'origin', 'main'], { inherit: true })
} else {
  console.log('\n1/2  Skipping push (--skip-push).')
}

console.log(`\n2/2  Waiting for ${target} (up to ${POLL_ATTEMPTS} × ${POLL_SECONDS}s) …`)
let live = false
for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
  console.log(`\n  check attempt ${attempt}/${POLL_ATTEMPTS} …`)
  if (
    run('node', ['scripts/check-pavilion-deploy.mjs', '--target', target], {
      allowFail: true,
    }) === 0
  ) {
    live = true
    break
  }
  if (attempt < POLL_ATTEMPTS) sleep(POLL_SECONDS)
}

if (!live && cliFallback) {
  console.error('\nCLI fallback (Doppler robert-4220) …\n')
  run('node', ['scripts/deploy-pavilion.mjs', '--target', target], {
    inherit: true,
    env: { PAVILION_SHIP_CLI_FALLBACK: '1' },
  })
  run('node', ['scripts/check-pavilion-deploy.mjs', '--target', target], { inherit: true })
  live = true
}

if (!live) {
  console.error(`
FAIL  ${target} did not pass check-pavilion-deploy.

  node scripts/ship-pavilion.mjs --target ${target} --skip-push --cli-fallback

Stone Hill www: ~/shmspto → node scripts/ship-stone-hill.mjs
`)
  process.exit(1)
}

console.log(`\nPASS  Pavilion product ship complete (${target}).`)
console.log('Note: www.shmspto.org unchanged. Promote + ship-stone-hill only when updating customer #1.')
process.exit(0)
