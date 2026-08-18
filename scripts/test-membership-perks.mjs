/**
 * Regression: Reef is not a food perk; pickup is Back to School Night Aug 27.
 *
 *   cd frontend && npx tsx --env-file=.env.local ../scripts/test-membership-perks.mjs
 */
import {
  buildMembershipEntitlements,
  mergePortalEntitlements,
  staffMembershipPerkLines,
  tierNeedsEventRefreshments,
} from '../frontend/lib/membership-entitlements.ts'
import { buildPurchaseConfirmationCopy } from '../frontend/lib/purchase-confirmation.ts'
import { isCovePaidMemberTier } from '../frontend/lib/staff/members-roster.ts'
import { isPaidMemberFamilyCode } from '../frontend/lib/cove-family-code.ts'

const FOOD = 'Free food & refreshments'
const OPEN_HOUSE = 'Open House'
const AUG_13 = 'August 13'
const BTSN = 'Back to School Night'
const PAID_CODES = 'paid codes end in 9'

let failed = 0
function check(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS  ${name}`)
    return
  }
  failed += 1
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}

check('Reef is not a refreshments tier', !tierNeedsEventRefreshments('reef'))
check('legacy ruby is not a refreshments tier', !tierNeedsEventRefreshments('ruby'))
check('Lagoon is a refreshments tier', tierNeedsEventRefreshments('lagoon'))
check('Tide is a refreshments tier', tierNeedsEventRefreshments('tide'))
check('Reef is not a Lagoon/Tide food-code tier', !isCovePaidMemberTier('reef'))
check('Lagoon is a food-code tier', isCovePaidMemberTier('lagoon'))
check('code ending 9 is food ID', isPaidMemberFamilyCode('123459'))
check('code not ending 9 is not food ID', !isPaidMemberFamilyCode('123450'))

const reefEnts = buildMembershipEntitlements({ tier: 'reef' })
const lagoonEnts = buildMembershipEntitlements({ tier: 'lagoon', shirtSize: 'Adult M' })
check(
  'Reef entitlements omit event food',
  !reefEnts.some((e) => e.kind === 'event_refreshments'),
  reefEnts.map((e) => e.kind).join(','),
)
check(
  'Reef still includes magnet',
  reefEnts.some((e) => e.kind === 'magnet'),
)
check(
  'Lagoon includes event food',
  lagoonEnts.some((e) => e.kind === 'event_refreshments'),
)

const staleReef = mergePortalEntitlements(
  [
    {
      kind: 'event_refreshments',
      label: FOOD,
      status: 'info',
      notes: 'stale Open House copy',
    },
    {
      kind: 'magnet',
      label: '1 Stone Hill car magnet',
      status: 'pending',
      notes: 'Pick up at Open House on August 13',
    },
  ],
  reefEnts,
)
check(
  'portal merge drops stale Reef food entitlement',
  !staleReef.some((e) => e.kind === 'event_refreshments'),
)
check(
  'pending Reef magnet gets live BTSN note (not stored Open House)',
  Boolean(staleReef.find((e) => e.kind === 'magnet')?.notes?.includes(BTSN)) &&
    !staleReef.find((e) => e.kind === 'magnet')?.notes?.includes(OPEN_HOUSE),
)

const reefParent = buildPurchaseConfirmationCopy({
  kind: 'membership',
  parentEmail: 'parent@example.com',
  parentName: 'Test Parent',
  amount: 49,
  description: 'Reef membership',
  transactionId: 'test-reef',
  meta: { tier: 'reef', tierName: 'Reef' },
})
check('parent Reef email omits free food', !reefParent.body.includes(FOOD))
check('parent Reef email omits Open House', !reefParent.body.includes(OPEN_HOUSE) && !reefParent.body.includes(AUG_13))
check('parent Reef email mentions magnet', reefParent.body.includes('Stone Hill car magnet'))
check('parent Reef email mentions BTSN Aug 27', reefParent.body.includes(BTSN) && reefParent.body.includes('August 27'))

const lagoonParent = buildPurchaseConfirmationCopy({
  kind: 'membership',
  parentEmail: 'parent@example.com',
  parentName: 'Test Parent',
  amount: 149,
  description: 'Lagoon membership',
  transactionId: 'test-lagoon',
  meta: { tier: 'lagoon', tierName: 'Lagoon', shirtSize: 'Adult M' },
})
check('parent Lagoon email includes free food', lagoonParent.body.includes(FOOD))

const reefStaff = staffMembershipPerkLines({ tier: 'reef' }).join('\n')
const lagoonStaff = staffMembershipPerkLines({ tier: 'lagoon', shirtSize: 'Adult M' }).join('\n')
check('staff Reef alert omits free food', !reefStaff.includes(FOOD))
check('staff Reef alert omits paid-codes-end-in-9', !reefStaff.includes(PAID_CODES))
check('staff Reef alert omits Open House / Aug 13', !reefStaff.includes(OPEN_HOUSE) && !reefStaff.includes(AUG_13))
check('staff Reef alert mentions BTSN', reefStaff.includes(BTSN) && reefStaff.includes('Aug 27'))
check('staff Lagoon alert includes free food', lagoonStaff.includes(FOOD))
check('staff Lagoon food line is Lagoon/Tide codes not paid codes', lagoonStaff.includes('Lagoon/Tide codes end in 9'))

if (process.env.WIX_API_KEY && process.env.WIX_SITE_ID) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.WIX_API_KEY,
      'wix-site-id': process.env.WIX_SITE_ID,
    },
    body: JSON.stringify({
      dataCollectionId: 'Memberships',
      query: { paging: { limit: 100 } },
    }),
  })
  const data = await res.json()
  let reefFood = 0
  let reefEnds9 = 0
  for (const item of data.dataItems || []) {
    const d = item.data || {}
    const tier = String(d.tier || '').toLowerCase()
    if (tier !== 'reef' && tier !== 'ruby') continue
    const json = String(d.entitlementsJson || '')
    if (json.includes('event_refreshments')) reefFood += 1
    const digits = String(d.coveFamilyCode || '').replace(/\D/g, '')
    if (digits.length >= 4 && digits.endsWith('9')) reefEnds9 += 1
  }
  check('live CMS: no Reef row stores event_refreshments', reefFood === 0, `count=${reefFood}`)
  check('live CMS: no Reef Cove code ends in 9', reefEnds9 === 0, `count=${reefEnds9}`)
} else {
  console.log('SKIP  live CMS Reef code/entitlement audit (no Wix env)')
}

if (failed) {
  console.error(`\n${failed} membership perk check(s) failed.`)
  process.exit(1)
}
console.log('\nAll membership perk checks passed.')
