/**
 * seed-pearl-membership.mjs
 *
 * Ensures Pearl exists in MembershipTiers + gift-card credit Site Settings.
 * Create the Wix Stores product yourself, then paste productId on the Pearl row.
 *
 * Usage (from repo root):
 *   node --env-file=frontend/.env.local scripts/seed-pearl-membership.mjs
 */

const siteId = process.env.WIX_SITE_ID
const apiKey = process.env.WIX_API_KEY
if (!siteId || !apiKey) {
  console.error('Need WIX_SITE_ID and WIX_API_KEY')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: apiKey,
  'wix-site-id': siteId,
}

async function queryCollection(collectionId, filter) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dataCollectionId: collectionId,
      query: { filter, paging: { limit: 10 } },
    }),
  })
  if (!res.ok) throw new Error(`query ${collectionId}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.dataItems ?? []
}

async function insertItem(collectionId, data) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dataCollectionId: collectionId,
      dataItem: { data },
    }),
  })
  if (!res.ok) throw new Error(`insert ${collectionId}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function updateItem(collectionId, id, data) {
  const res = await fetch(`https://www.wixapis.com/wix-data/v2/items/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      dataCollectionId: collectionId,
      dataItem: { id, data },
    }),
  })
  if (!res.ok) throw new Error(`update ${collectionId}: ${res.status} ${await res.text()}`)
  return res.json()
}

const PEARL = {
  tierId: 'pearl',
  name: 'Pearl',
  price: 150,
  description: 'Our highest membership with maximum store-card credit and recognition.',
  perks:
    'Everything in Supreme\nHighest recognition in PTO annual report\n$50 school store card credit',
  giftCardCredit: 50,
  productId: '',
  variantId: '',
  popular: false,
  highlighted: false,
  sortOrder: 3,
  active: true,
}

async function upsertPearl() {
  const items = await queryCollection('MembershipTiers', { tierId: { $eq: 'pearl' } })
  if (items[0]) {
    const id = items[0].id
    const prev = items[0].data ?? {}
    await updateItem('MembershipTiers', id, {
      ...prev,
      ...PEARL,
      productId: prev.productId || PEARL.productId,
      variantId: prev.variantId || PEARL.variantId,
    })
    console.log('Updated MembershipTiers pearl:', id)
  } else {
    const created = await insertItem('MembershipTiers', PEARL)
    console.log('Created MembershipTiers pearl:', created.dataItem?.id ?? created)
  }

  for (const [tierId, credit] of [
    ['ruby', 10],
    ['supreme', 25],
  ]) {
    const rows = await queryCollection('MembershipTiers', { tierId: { $eq: tierId } })
    const row = rows[0]
    if (!row) continue
    const data = row.data ?? {}
    if (data.giftCardCredit == null || data.giftCardCredit === '') {
      await updateItem('MembershipTiers', row.id, { ...data, giftCardCredit: credit })
      console.log(`Set ${tierId} giftCardCredit=${credit}`)
    } else {
      console.log(`${tierId} giftCardCredit already ${data.giftCardCredit}`)
    }
  }
}

async function upsertSiteSetting(key, value) {
  const items = await queryCollection('SiteSettings', { key: { $eq: key } })
  if (items[0]) {
    const data = items[0].data ?? {}
    if (String(data.value ?? '') === value) {
      console.log(`SiteSettings ${key} already set`)
      return
    }
    await updateItem('SiteSettings', items[0].id, { ...data, key, value })
    console.log(`Updated SiteSettings ${key}`)
  } else {
    await insertItem('SiteSettings', { key, value })
    console.log(`Created SiteSettings ${key}`)
  }
}

await upsertPearl()
await upsertSiteSetting('membershipPearlGiftCardCredit', '50')
await upsertSiteSetting('membershipRubyGiftCardCredit', '10')
await upsertSiteSetting('membershipSupremeGiftCardCredit', '25')
await upsertSiteSetting('membershipPearlSlug', 'pto-membership-pearl-1')

console.log(`
Next steps in Wix:
1. Stores → Products → create "PTO Membership — Pearl" ($150) → Publish → copy Product ID
2. Membership Tiers → Pearl → set productId (and giftCardCredit if you want a different amount)
3. Optionally set giftCardCredit on ruby (default 10) and supreme (default 25)
4. Hard-refresh staging /membership and test Join as a free logged-in parent
`)
