/**
 * Off-season + The Cove CMS sync.
 * Sets schoolInSession=false, updates NavLinks (hide Programs/Events, merge Store/Spirit → Cove).
 *
 * Usage: node --env-file=frontend/.env.local scripts/off-season-cove-cms.js
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

async function queryCollection(dataCollectionId, limit = 100) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dataCollectionId,
      query: { paging: { limit } },
    }),
  })
  if (!res.ok) throw new Error(`${dataCollectionId} query ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.dataItems ?? []
}

async function updateItem(dataCollectionId, item) {
  const id = item.id
  const res = await fetch(`https://www.wixapis.com/wix-data/v2/items/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      dataCollectionId,
      dataItem: { id, data: item.data },
    }),
  })
  if (!res.ok) throw new Error(`update ${dataCollectionId} ${res.status}: ${await res.text()}`)
  return res.json()
}

async function insertItem(dataCollectionId, data) {
  const res = await fetch('https://www.wixapis.com/wix-data/v2/items', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      dataCollectionId,
      dataItem: { data },
    }),
  })
  if (!res.ok) throw new Error(`insert ${dataCollectionId} ${res.status}: ${await res.text()}`)
  return res.json()
}

async function upsertSetting(key, value) {
  const items = await queryCollection('SiteSettings')
  const existing = items.find((i) => i.data?.key === key)
  if (existing) {
    await updateItem('SiteSettings', {
      id: existing.id,
      data: { ...existing.data, key, value },
    })
    console.log(`SiteSettings ${key} = ${value} (updated)`)
  } else {
    await insertItem('SiteSettings', { key, value })
    console.log(`SiteSettings ${key} = ${value} (created)`)
  }
}

async function syncNav() {
  const items = await queryCollection('NavLinks')
  let coveKept = null

  for (const item of items) {
    const href = item.data?.href ?? ''
    const label = item.data?.label ?? ''

    if (href === '/programs' || href === '/events') {
      await updateItem('NavLinks', {
        id: item.id,
        data: { ...item.data, active: false, showInNav: false, showInFooter: false },
      })
      console.log(`NavLinks deactivated: ${label} (${href})`)
      continue
    }

    if (href === '/store' || href === '/spirit-wear' || href === '/cove' || /store|spirit/i.test(label)) {
      if (!coveKept) {
        coveKept = item
        await updateItem('NavLinks', {
          id: item.id,
          data: {
            ...item.data,
            label: 'The Cove',
            href: '/cove',
            active: true,
            showInNav: true,
            showInFooter: true,
            sortOrder: item.data?.sortOrder ?? 4,
          },
        })
        console.log(`NavLinks → The Cove (/cove) from ${label}`)
      } else {
        await updateItem('NavLinks', {
          id: item.id,
          data: { ...item.data, active: false, showInNav: false, showInFooter: false },
        })
        console.log(`NavLinks deactivated duplicate: ${label} (${href})`)
      }
    }
  }

  if (!coveKept) {
    await insertItem('NavLinks', {
      label: 'The Cove',
      href: '/cove',
      sortOrder: 4,
      showInNav: true,
      showInFooter: true,
      active: true,
    })
    console.log('NavLinks inserted The Cove')
  }
}

async function main() {
  await upsertSetting('schoolInSession', 'false')
  await upsertSetting(
    'announcementText',
    'School is out of session — Programs & Events return in the fall. Shop The Cove and join Membership anytime.'
  )
  await upsertSetting('announcementEnabled', 'true')
  await syncNav()

  // Soft-update page copy for store hero if present
  const pages = await queryCollection('PageContent')
  for (const item of pages) {
    const page = item.data?.page
    if (page === 'store' && item.data?.eyebrow && !/cove/i.test(item.data.eyebrow)) {
      await updateItem('PageContent', {
        id: item.id,
        data: { ...item.data, eyebrow: 'The Cove' },
      })
      console.log('PageContent store eyebrow → The Cove')
    }
    if (page === 'home' && item.data?.eyebrow && /2025|school year/i.test(item.data.eyebrow)) {
      await updateItem('PageContent', {
        id: item.id,
        data: { ...item.data, eyebrow: 'SHMS PTO · Summer' },
      })
      console.log('PageContent home eyebrow → Summer')
    }
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
