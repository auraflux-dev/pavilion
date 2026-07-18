/**
 * Restore top-nav links, reset fundraising SiteSettings, clean PageContent eyebrows.
 * Usage: node --env-file=frontend/.env.local scripts/nav-fundraising-reset.js
 */
const API_KEY = process.env.WIX_API_KEY
const SITE_ID = process.env.WIX_SITE_ID
if (!API_KEY || !SITE_ID) {
  console.error('Need WIX_API_KEY and WIX_SITE_ID')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: API_KEY,
  'wix-site-id': SITE_ID,
}

async function queryCollection(dataCollectionId, limit = 200) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({ dataCollectionId, query: { paging: { limit } } }),
  })
  if (!res.ok) throw new Error(`${dataCollectionId} ${res.status}: ${await res.text()}`)
  return (await res.json()).dataItems ?? []
}

async function updateItem(dataCollectionId, id, data) {
  const res = await fetch(`https://www.wixapis.com/wix-data/v2/items/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ dataCollectionId, dataItem: { id, data } }),
  })
  if (!res.ok) throw new Error(`update ${dataCollectionId} ${res.status}: ${await res.text()}`)
}

async function insertItem(dataCollectionId, data) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items', {
    method: 'POST',
    headers,
    body: JSON.stringify({ dataCollectionId, dataItem: { data } }),
  })
  if (!res.ok) throw new Error(`insert ${dataCollectionId} ${res.status}: ${await res.text()}`)
}

async function upsertSetting(key, value) {
  const items = await queryCollection('SiteSettings')
  const existing = items.find((i) => i.data?.key === key)
  if (existing) {
    await updateItem('SiteSettings', existing.id, { ...existing.data, key, value })
    console.log(`setting ${key} = ${value}`)
  } else {
    await insertItem('SiteSettings', { key, value })
    console.log(`setting ${key} = ${value} (created)`)
  }
}

const NAV_PLAN = [
  { href: '/programs', label: 'Programs', sortOrder: 1, showInNav: true, showInFooter: true },
  { href: '/events', label: 'Events', sortOrder: 2, showInNav: true, showInFooter: true },
  { href: '/membership', label: 'Membership', sortOrder: 3, showInNav: true, showInFooter: true },
  { href: '/cove', label: 'The Cove', sortOrder: 4, showInNav: true, showInFooter: true },
  { href: '/volunteer', label: 'Volunteer', sortOrder: 5, showInNav: true, showInFooter: true },
  { href: '/fundraising', label: 'Fundraising', sortOrder: 6, showInNav: true, showInFooter: true },
  { href: '/board', label: 'Board', sortOrder: 7, showInNav: true, showInFooter: true },
  { href: '/meetings', label: 'Meetings', sortOrder: 8, showInNav: true, showInFooter: true },
  { href: '/auth/login', label: 'Parent Login', sortOrder: 9, showInNav: false, showInFooter: true },
]

async function syncNav() {
  const items = await queryCollection('NavLinks')
  const byHref = new Map()
  for (const item of items) {
    const href = item.data?.href
    if (href) byHref.set(href, item)
  }

  for (const plan of NAV_PLAN) {
    const existing = byHref.get(plan.href)
    if (existing) {
      await updateItem('NavLinks', existing.id, {
        ...existing.data,
        label: plan.label,
        href: plan.href,
        sortOrder: plan.sortOrder,
        showInNav: plan.showInNav,
        showInFooter: plan.showInFooter,
        active: true,
      })
      console.log(`nav updated ${plan.label} → ${plan.href} (nav=${plan.showInNav})`)
      byHref.delete(plan.href)
    } else {
      await insertItem('NavLinks', {
        label: plan.label,
        href: plan.href,
        sortOrder: plan.sortOrder,
        showInNav: plan.showInNav,
        showInFooter: plan.showInFooter,
        active: true,
      })
      console.log(`nav created ${plan.label}`)
    }
  }

  // Deactivate leftovers (old Store / Spirit Wear, etc.)
  for (const [, item] of byHref) {
    const href = item.data?.href
    if (href === '/store' || href === '/spirit-wear') {
      await updateItem('NavLinks', item.id, {
        ...item.data,
        active: false,
        showInNav: false,
        showInFooter: false,
      })
      console.log(`nav deactivated ${item.data?.label} (${href})`)
    }
  }
}

async function resetFundraising() {
  // Goals ready for a fresh year; raised volunteer hours cleared.
  // Dollar "raised" still comes from paid Wix orders (already ~$0 if no sales).
  const resets = {
    volunteerHoursRaised: '0',
    volunteerHoursGoal: '500',
    fundraisingAnnualGoal: '21667',
    goalMembership: '8000',
    goalStore: '6000',
    goalSpiritWear: '3000',
    goalDanceNight: '2500',
    goalNovaMath: '1500',
  }
  for (const [k, v] of Object.entries(resets)) {
    await upsertSetting(k, v)
  }
}

async function cleanPageContent() {
  const pages = await queryCollection('PageContent')
  for (const item of pages) {
    const page = item.data?.page
    if (page === 'fundraising') {
      await updateItem('PageContent', item.id, {
        ...item.data,
        eyebrow: 'Goals · Live',
        body: 'Membership, The Cove, and event purchases count here automatically.',
      })
      console.log('PageContent fundraising cleaned')
    }
    if (page === 'board' && /2025|school year/i.test(item.data?.eyebrow || '')) {
      await updateItem('PageContent', item.id, {
        ...item.data,
        eyebrow: 'SHMS PTO Board',
      })
      console.log('PageContent board eyebrow cleaned')
    }
    if (page === 'spirit-wear') {
      await updateItem('PageContent', item.id, {
        ...item.data,
        eyebrow: 'The Cove · Shop',
        title: item.data?.title || 'Spirit wear & merchandise',
      })
      console.log('PageContent spirit-wear → Cove')
    }
    if (page === 'contact' && /school store/i.test(item.data?.body || '')) {
      await updateItem('PageContent', item.id, {
        ...item.data,
        body: (item.data.body || '').replace(/school store/gi, 'The Cove'),
      })
      console.log('PageContent contact cleaned')
    }
  }
}

async function main() {
  await syncNav()
  await resetFundraising()
  await cleanPageContent()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
