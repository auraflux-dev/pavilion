/**
 * Probe Wix Events v3 create/patch payloads (Staff form parity).
 *   node --env-file=frontend/.env.local frontend/scripts/probe-staff-event-create.mjs
 */
const siteId = process.env.WIX_SITE_ID?.trim()
const apiKey = process.env.WIX_API_KEY?.trim()
if (!siteId || !apiKey) {
  console.error('Need WIX_SITE_ID and WIX_API_KEY')
  process.exit(1)
}

const H = {
  Authorization: apiKey,
  'wix-site-id': siteId,
  'Content-Type': 'application/json',
}

async function wix(path, body, method = 'POST') {
  const res = await fetch(`https://www.wixapis.com${path}`, {
    method,
    headers: H,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 500) }
}

const start = '2026-12-01T23:00:00.000Z'
const end = '2026-12-02T01:00:00.000Z'

const cases = [
  {
    name: 'charity-minimal',
    body: {
      event: {
        title: 'PROBE charity minimal',
        location: { type: 'VENUE', name: 'SHMS PTO' },
        dateAndTimeSettings: { startDate: start, endDate: end, timeZoneId: 'America/New_York' },
        registration: { initialType: 'RSVP' },
      },
      draft: true,
    },
  },
  {
    name: 'with-registration-type',
    body: {
      event: {
        title: 'PROBE registration type',
        location: { type: 'VENUE', name: 'SHMS PTO' },
        dateAndTimeSettings: { startDate: start, endDate: end, timeZoneId: 'America/New_York' },
        registration: { type: 'RSVP', initialType: 'RSVP' },
      },
      draft: true,
    },
  },
  {
    name: 'with-shortDescription',
    body: {
      event: {
        title: 'PROBE shortDescription',
        location: { type: 'VENUE', name: 'SHMS PTO' },
        dateAndTimeSettings: { startDate: start, endDate: end, timeZoneId: 'America/New_York' },
        registration: { initialType: 'RSVP' },
        shortDescription: 'Test description',
      },
      draft: true,
    },
  },
  {
    name: 'with-rich-description',
    body: {
      event: {
        title: 'PROBE rich description',
        location: { type: 'VENUE', name: 'SHMS PTO' },
        dateAndTimeSettings: { startDate: start, endDate: end, timeZoneId: 'America/New_York' },
        registration: { initialType: 'RSVP' },
        description: {
          nodes: [
            {
              type: 'PARAGRAPH',
              nodes: [{ type: 'TEXT', textData: { text: 'Hello' } }],
            },
          ],
        },
      },
      draft: true,
    },
  },
]

const created = []
for (const c of cases) {
  const r = await wix('/events/v3/events', c.body)
  const id = r.json?.event?.id
  console.log(c.name, r.ok ? `OK id=${id}` : `FAIL ${r.status}: ${r.text}`)
  if (id) created.push(id)
}

if (created[0]) {
  const patchCases = [
    {
      name: 'patch-title-only',
      body: { event: { title: 'PROBE patched title' } },
    },
    {
      name: 'patch-with-id',
      body: { event: { id: created[0], title: 'PROBE patched with id' } },
    },
    {
      name: 'patch-description-string',
      body: { event: { description: 'plain string bad' } },
    },
    {
      name: 'patch-shortDescription',
      body: { event: { shortDescription: 'Short text ok' } },
    },
    {
      name: 'patch-rich-description',
      body: {
        event: {
          description: {
            nodes: [
              {
                type: 'PARAGRAPH',
                nodes: [{ type: 'TEXT', textData: { text: 'Rich ok' } }],
              },
            ],
          },
        },
      },
    },
    {
      name: 'patch-mainImage-url',
      body: { event: { mainImage: { url: 'https://static.wixstatic.com/media/test' } } },
    },
  ]
  for (const p of patchCases) {
    const r = await wix(`/events/v3/events/${created[0]}`, p.body, 'PATCH')
    console.log(p.name, r.ok ? 'OK' : `FAIL ${r.status}: ${r.text}`)
  }
}

for (const id of created) {
  await wix(`/events/v3/events/${id}`, { event: { id, status: 'CANCELED' } }, 'PATCH').catch(() => {})
  console.log('cleanup', id)
}
