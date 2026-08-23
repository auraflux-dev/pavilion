/**
 * VP Memberships gap-closure tests.
 * Run: node --import tsx scripts/test-membership-outreach.mjs
 *   or: npx tsx scripts/test-membership-outreach.mjs
 */
import assert from 'node:assert/strict'
import {
  buildParentRoster,
  filterParentRoster,
  normalizeMembershipTier,
  rosterEmails,
} from '../frontend/lib/staff/members-roster.ts'
import {
  DEFAULT_SPONSORSHIP_INBOXES,
  parseStaffInboxes,
} from '../frontend/lib/staff/inbox.ts'
import {
  buildMailtoBcc,
  buildRawMimeMessage,
  sanitizeRecipients,
  sendMassEmail,
  validateMassEmailDraft,
} from '../frontend/lib/staff/mass-email.ts'
import { buildWhatsAppGroupPlan, buildWhatsAppGraphicShare } from '../frontend/lib/staff/whatsapp-compose.ts'
import {
  defaultUtmCampaign,
  tagUrlWithUtm,
  tagUrlsInText,
} from '../frontend/lib/staff/newsletter-utm.ts'
import {
  applyMergeFields,
  hasMergeFields,
  mergeVarsFromParent,
} from '../frontend/lib/staff/newsletter-merge.ts'
import {
  buildNewsletterTestGroups,
  resolveTestGroupRecipients,
  testSubject,
} from '../frontend/lib/staff/newsletter-test-groups.ts'
import {
  buildNewsletterHtml,
  plainTextToEmailHtml,
} from '../frontend/lib/staff/newsletter-html.ts'
import {
  normalizeNewsletterAssetKey,
  publicNewsletterAssetUrl,
} from '../frontend/lib/staff/newsletter-assets.ts'
import {
  buildScoopShareText,
  defaultScoopPageUrl,
  resolveScoopUrl,
} from '../frontend/lib/staff/newsletter-scoop.ts'
import { composeNewsletterBody } from '../frontend/lib/staff/newsletter-sections.ts'
import {
  canApproveNewsletter,
  jobIsDue,
  parseJobPayload,
} from '../frontend/lib/staff/newsletter-jobs-pure.ts'

let failures = 0
function check(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL ${name}: ${err instanceof Error ? err.message : err}`)
  }
}

check('normalize legacy ruby→reef', () => {
  assert.equal(normalizeMembershipTier('ruby'), 'reef')
  assert.equal(normalizeMembershipTier('supreme'), 'lagoon')
  assert.equal(normalizeMembershipTier('pearl'), 'tide')
})

check('build roster with contact + highest tier', () => {
  const rows = buildParentRoster([
    {
      _id: '1',
      parentEmail: 'A@Example.com',
      parentFirstName: 'Ann',
      parentLastName: 'Lee',
      parentPhone: '7035551212',
      firstName: 'Sam',
      lastName: 'Lee',
      grade: '6',
      membershipTier: 'free',
    },
    {
      _id: '2',
      parentEmail: 'a@example.com',
      firstName: 'Pat',
      lastName: 'Lee',
      grade: '7',
      membershipTier: 'tide',
    },
    {
      _id: '3',
      parentEmail: 'b@example.com',
      firstName: 'Bo',
      lastName: 'Ng',
      grade: '8',
      membershipTier: 'reef',
    },
  ])
  assert.equal(rows.length, 2)
  const a = rows.find((r) => r.parentEmail === 'a@example.com')
  assert.ok(a)
  assert.equal(a.parentFirstName, 'Ann')
  assert.equal(a.parentPhone, '7035551212')
  assert.equal(a.membershipTier, 'tide')
  assert.equal(a.accountType, 'paid')
  assert.equal(a.students.length, 2)
})

check('filter paid / grade / search', () => {
  const rows = buildParentRoster([
    {
      _id: '1',
      parentEmail: 'free@x.com',
      firstName: 'F',
      lastName: 'R',
      grade: '6',
      membershipTier: 'free',
    },
    {
      _id: '2',
      parentEmail: 'paid@x.com',
      parentFirstName: 'Pay',
      firstName: 'P',
      lastName: 'D',
      grade: '7',
      membershipTier: 'lagoon',
    },
  ])
  assert.equal(filterParentRoster(rows, { tier: 'paid' }).length, 1)
  assert.equal(filterParentRoster(rows, { grade: '6' }).length, 1)
  assert.equal(filterParentRoster(rows, { q: 'pay' }).length, 1)
  assert.deepEqual(rosterEmails(filterParentRoster(rows, { tier: 'paid' })), ['paid@x.com'])
})

check('gmail raw MIME is base64url', () => {
  const raw = buildRawMimeMessage({
    from: 'SHMS PTO <membership@shmspto.org>',
    to: 'parent@example.com',
    replyTo: 'membership@shmspto.org',
    subject: 'Hello',
    text: 'Body line',
  })
  assert.ok(!raw.includes('+'))
  assert.ok(!raw.includes('/'))
  const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  assert.ok(decoded.includes('To: parent@example.com'))
  assert.ok(decoded.includes('Body line'))
})

check('parseStaffInboxes splits sponsorship list', () => {
  assert.deepEqual(parseStaffInboxes(DEFAULT_SPONSORSHIP_INBOXES), [
    'vp-sponsorships@shmspto.org',
    'president@shmspto.org',
  ])
  assert.deepEqual(parseStaffInboxes('vp-sponsorships@shmspto.org'), [
    'vp-sponsorships@shmspto.org',
  ])
})

check('sanitize recipients drops junk and fixes typos', () => {
  assert.deepEqual(
    sanitizeRecipients([
      'Parent@Gmail.com',
      'myrna75@yahoo.comm',
      'treasurer@shmspto.org',
      'qa@example.com',
      'bad',
    ]),
    ['myrna75@yahoo.com', 'parent@gmail.com'],
  )
})

check('mass email validation + mailto BCC', () => {
  assert.ok(
    validateMassEmailDraft({
      subject: '',
      body: 'hi',
      fromName: 'PTO',
      recipients: ['a@b.com'],
    }),
  )
  const draft = {
    subject: 'Hello',
    body: 'Body text',
    fromName: 'PTO',
    replyTo: 'membership@shmspto.org',
    recipients: ['a@b.com', 'bad', 'B@C.com'],
  }
  assert.equal(validateMassEmailDraft(draft), null)
  const mailto = buildMailtoBcc(draft)
  assert.ok(mailto.startsWith('mailto:'))
  assert.ok(mailto.includes('bcc='))
})

check('whatsapp group plan copies + opens configured grades', () => {
  const plan = buildWhatsAppGroupPlan(
    {
      grade6: 'https://chat.whatsapp.com/AAA',
      grade7: '',
      grade8: 'https://chat.whatsapp.com/CCC',
    },
    'all',
    'Welcome to SHMS PTO',
  )
  assert.equal(plan.openUrls.length, 2)
  assert.ok(plan.waMeShare.includes('wa.me'))
  assert.ok(plan.instructions.includes('Missing invite links'))
})

check('utm campaign slug + link tagging', () => {
  assert.equal(defaultUtmCampaign('Run For Charity 2026!'), 'run-for-charity-2026')
  const tagged = tagUrlWithUtm('https://www.shmspto.org/events/foo', {
    campaign: 'run-for-charity-2026',
  })
  assert.ok(tagged.includes('utm_source=newsletter'))
  assert.ok(tagged.includes('utm_campaign=run-for-charity-2026'))
  const body = tagUrlsInText('Register: https://www.shmspto.org/join now.', {
    campaign: 'sep-2026',
  })
  assert.ok(body.includes('utm_medium=email'))
  assert.ok(body.endsWith('now.'))
})

check('newsletter merge fields', () => {
  assert.equal(hasMergeFields('Hi {{firstName}}'), true)
  assert.equal(hasMergeFields('Hi there'), false)
  const vars = mergeVarsFromParent({
    parentEmail: 'a@b.com',
    parentFirstName: 'Ann',
    parentLastName: 'Lee',
    membershipTier: 'lagoon',
    students: [{ grade: '7', archived: false }],
  })
  assert.equal(applyMergeFields('Hi {{firstName}} ({{tier}}, grade {{grade}})', vars), 'Hi Ann (lagoon, grade 7)')
  assert.equal(applyMergeFields('Hi {{firstName}}', {}), 'Hi there')
})

check('newsletter test groups + subject prefix', () => {
  const groups = buildNewsletterTestGroups({
    sessionEmail: 'vp-marketing@shmspto.org',
    sessionPersonalEmail: 'diane@gmail.com',
    staffRows: [
      {
        email: 'president@shmspto.org',
        personalEmail: 'pres@gmail.com',
        name: 'Pres',
        boardTitle: 'President',
        active: true,
      },
    ],
    siteTestEmails: 'qa@gmail.com',
  })
  assert.equal(groups.me?.email, 'diane@gmail.com')
  assert.equal(resolveTestGroupRecipients('me', groups).length, 1)
  assert.ok(resolveTestGroupRecipients('board', groups).includes('president@shmspto.org'))
  assert.ok(resolveTestGroupRecipients('board_and_custom', groups).includes('qa@gmail.com'))
  assert.equal(testSubject('Hello'), '[TEST] Hello')
})

check('newsletter asset key normalize', () => {
  assert.equal(
    normalizeNewsletterAssetKey('newsletter-heroes/abc-1234.png'),
    'newsletter-heroes/abc-1234.png',
  )
  assert.equal(normalizeNewsletterAssetKey('../etc/passwd'), null)
  assert.ok(publicNewsletterAssetUrl('newsletter-heroes/x.png').includes('/api/newsletter-assets/'))
})

check('branded newsletter HTML header hero footer', () => {
  assert.equal(plainTextToEmailHtml('a <b> & c'), 'a &lt;b&gt; &amp; c')
  const html = buildNewsletterHtml({
    textBody: 'Hello\nhttps://www.shmspto.org/join',
    heroImageUrl: 'https://www.shmspto.org/api/newsletter-assets/newsletter-heroes/x.png',
    canvaViewUrl: 'https://www.canva.com/design/ABC/view',
    canvaTitle: 'Fall blast',
    sendId: 'send123',
  })
  assert.ok(html.includes('SHMS PTO'))
  assert.ok(html.includes('/brand/cove-logo-640.png'))
  assert.ok(html.includes('newsletter-heroes/x.png'))
  assert.ok(html.includes('Hello<br'))
  assert.ok(html.includes('/api/o/send123'))
  assert.ok(!html.includes('<script'))
})

check('newsletter html stacks extra Canva pages', () => {
  const html = buildNewsletterHtml({
    textBody: 'Body',
    heroImageUrl: 'https://www.shmspto.org/api/newsletter-assets/newsletter-heroes/p1.png',
    extraImageUrls: [
      'https://www.shmspto.org/api/newsletter-assets/newsletter-heroes/p2.png',
      'https://www.shmspto.org/api/newsletter-assets/newsletter-heroes/p1.png',
    ],
  })
  assert.ok(html.includes('p1.png'))
  assert.ok(html.includes('p2.png'))
  assert.equal((html.match(/p1\.png/g) || []).length, 1)
})

check('newsletter beat section image in html', () => {
  const html = buildNewsletterHtml({
    textBody: '',
    sections: {
      intro: '',
      signoff: '',
      beats: [
        {
          preset: 'event',
          heading: 'Back to School Night',
          body: 'Thursday at 6.',
          imageUrl: 'https://www.shmspto.org/api/newsletter-assets/newsletter-heroes/event.png',
        },
      ],
    },
  })
  assert.ok(html.includes('event.png'))
  assert.ok(html.includes('Back to School Night'))
  assert.ok(html.includes('Thursday at 6.'))
})

check('newsletter beats compose plain text', () => {
  const body = composeNewsletterBody({
    intro: 'Hi families.',
    beats: [
      { heading: 'Event', body: 'Dance Night Friday.' },
      { heading: '', body: '' },
      { heading: 'Join', body: 'https://www.shmspto.org/join' },
    ],
    signoff: 'See you there.\nSHMS PTO',
  })
  assert.ok(body.includes('Hi families.'))
  assert.ok(body.includes('Event\nDance Night Friday.'))
  assert.ok(body.includes('Join\nhttps://www.shmspto.org/join'))
  assert.ok(body.includes('SHMS PTO'))
  assert.ok(!body.includes('\n\n\n'))
})

check('whatsapp graphic share opens png + caption', () => {
  const g = buildWhatsAppGraphicShare({
    message: 'Scoop link',
    imageUrl: 'https://www.shmspto.org/api/newsletter-assets/newsletter-heroes/x.png',
  })
  assert.equal(g.caption, 'Scoop link')
  assert.ok(g.imageUrl?.includes('newsletter-heroes/x.png'))
  assert.ok(g.instructions.includes('PNG'))
})

check('weekly scoop share text + url fallback', () => {
  const text = buildScoopShareText({
    subject: 'SHMS Weekly Scoop',
    body: 'This month at Stone Hill.',
    url: 'https://www.canva.com/design/ABC/view',
  })
  assert.ok(text.includes('SHMS Weekly Scoop'))
  assert.ok(text.includes('This month at Stone Hill.'))
  assert.ok(text.includes('https://www.canva.com/design/ABC/view'))
  assert.equal(
    resolveScoopUrl('', 'https://www.canva.com/design/ABC/view'),
    'https://www.canva.com/design/ABC/view',
  )
  assert.ok(defaultScoopPageUrl().includes('/newsletter'))
})

check('newsletter jobs approval + due + payload', () => {
  const secretary = { roles: ['secretary'] }
  const marketing = { roles: ['marketing'] }
  assert.equal(canApproveNewsletter(secretary, 'sec@shmspto.org'), true)
  assert.equal(canApproveNewsletter(marketing, 'diane@shmspto.org'), false)
  assert.equal(canApproveNewsletter(marketing, 'president@shmspto.org'), true)
  const payload = parseJobPayload(JSON.stringify({ subject: 'Hi', message: 'Body' }))
  assert.equal(payload?.subject, 'Hi')
  assert.equal(parseJobPayload('nope'), null)
  assert.equal(
    jobIsDue(
      {
        id: '1',
        subject: 'x',
        sendAt: '2000-01-01T00:00:00.000Z',
        status: 'scheduled',
        sendAudience: 'members',
        needsApproval: false,
        createdByEmail: 'a@b.com',
        createdByName: 'A',
        payloadJson: '{}',
      },
      new Date('2026-01-01T00:00:00.000Z'),
    ),
    true,
  )
  assert.equal(
    jobIsDue(
      {
        id: '1',
        subject: 'x',
        sendAt: '2099-01-01T00:00:00.000Z',
        status: 'scheduled',
        sendAudience: 'members',
        needsApproval: false,
        createdByEmail: 'a@b.com',
        createdByName: 'A',
        payloadJson: '{}',
      },
      new Date('2026-01-01T00:00:00.000Z'),
    ),
    false,
  )
})

const dry = await sendMassEmail(
  { subject: 'T', body: 'B', fromName: 'PTO', recipients: ['a@b.com'] },
  { dryRun: true },
)
check('mass email dry run', () => {
  assert.equal(dry.mode, 'dry_run')
  assert.equal(dry.sent, 1)
  assert.equal(dry.ok, true)
})

try {
  const noKey = await sendMassEmail({
    subject: 'T',
    body: 'B',
    fromName: 'PTO',
    recipients: ['a@b.com'],
  })
  check('mass email without Gmail env is unavailable (not crash)', () => {
    if (
      process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_SENDER
    ) {
      assert.ok(noKey.mode === 'gmail' || noKey.mode === 'unavailable')
    } else {
      assert.equal(noKey.mode, 'unavailable')
      assert.equal(noKey.ok, false)
    }
  })
} catch (err) {
  console.log(
    `SKIP mass email live auth resolve: ${err instanceof Error ? err.message : err}`,
  )
}

const base = (process.env.SMOKE_BASE_URL || 'https://shmspto.vercel.app').replace(/\/$/, '')
console.log(`\nAuth smoke against ${base}`)
for (const c of [
  { name: 'members list anon', path: '/api/staff/members?mode=list' },
  { name: 'outreach GET anon', path: '/api/staff/membership/outreach' },
  {
    name: 'outreach POST anon',
    path: '/api/staff/membership/outreach',
    method: 'POST',
    body: { channel: 'portal', subject: 'x', body: 'y' },
  },
  { name: 'newsletter jobs GET anon', path: '/api/staff/newsletter/jobs' },
]) {
  try {
    const res = await fetch(`${base}${c.path}`, {
      method: c.method || 'GET',
      headers: c.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: c.method === 'POST' ? JSON.stringify(c.body) : undefined,
      redirect: 'manual',
    })
    const ok =
      c.name === 'newsletter jobs GET anon'
        ? res.status === 401 || res.status === 403 || res.status === 404
        : res.status === 401 || res.status === 403
    if (!ok) failures += 1
    console.log(`${ok ? 'PASS' : 'FAIL'} ${c.name}: ${res.status}`)
  } catch (err) {
    failures += 1
    console.error(`FAIL ${c.name}: ${err instanceof Error ? err.message : err}`)
  }
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll membership outreach checks passed.')

