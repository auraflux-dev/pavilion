#!/usr/bin/env node
/**
 * Product e2e smoke for SignUpGenius-style sheets on commons-pto-demo.
 *
 *   node scripts/e2e-signups-demo.mjs
 *   node scripts/e2e-signups-demo.mjs --base https://commons-pto-demo.vercel.app
 */
const args = process.argv.slice(2)
const baseIdx = args.indexOf('--base')
const BASE =
  (baseIdx >= 0 && args[baseIdx + 1]) ||
  process.env.PAVILION_DEMO_BASE ||
  'https://commons-pto-demo.vercel.app'
const SLUG = 'demo-carnival-volunteers'

function fail(msg) {
  console.error(`FAIL  ${msg}`)
  process.exit(1)
}

async function main() {
  console.log(`Signups e2e against ${BASE}\n`)

  const sheetRes = await fetch(`${BASE}/api/signups/${SLUG}`)
  if (!sheetRes.ok) fail(`GET sheet HTTP ${sheetRes.status}`)
  const sheetJson = await sheetRes.json()
  const slots = sheetJson?.sheet?.slots || []
  const open = slots.find((s) => (s.quantityRemaining ?? 0) > 0)
  if (!open) fail('No open slots on demo sheet (reseed or free a slot)')

  const email = `signup-e2e+${Date.now()}@pavilion-demo.test`
  const claimRes = await fetch(`${BASE}/api/signups/${SLUG}/claim`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: BASE,
      referer: `${BASE}/signups/${SLUG}`,
    },
    body: JSON.stringify({
      name: 'E2E Agent',
      email,
      customAnswers: {},
      slots: [{ slotId: open.id, quantity: 1 }],
    }),
  })
  const claim = await claimRes.json()
  if (!claimRes.ok) fail(`claim HTTP ${claimRes.status}: ${claim.error || JSON.stringify(claim)}`)
  if (claim.demo && !claim.confirmationToken) {
    fail('demo write stub still blocking claims')
  }
  if (!claim.confirmationToken) fail('missing confirmationToken')
  if (claim.email?.mode === 'unavailable' && claim.email?.error) {
    fail(`email path unavailable: ${claim.email.error}`)
  }
  console.log(`PASS  claim (${claim.email?.mode || 'no-email-mode'})`)

  const confirmPath =
    claim.confirmPath || `/signups/${SLUG}/confirm?token=${claim.confirmationToken}`
  const confirmRes = await fetch(`${BASE}${confirmPath}`)
  if (!confirmRes.ok) fail(`confirm page HTTP ${confirmRes.status}`)
  const html = await confirmRes.text()
  if (!html.includes("You're signed up") && !html.includes('You&apos;re signed up')) {
    fail('confirm page missing success copy')
  }
  if (!html.includes('E2E Agent')) fail('confirm page missing participant name')
  console.log('PASS  confirm page')

  console.log('\nPASS  signups e2e')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
