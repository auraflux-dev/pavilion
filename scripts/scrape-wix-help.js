/**
 * scrape-wix-help.js
 *
 * Fetches public Wix Help Center articles we already cite in PTO how-tos,
 * extracts a short digest (title + steps), and writes markdown files for
 * review / optional insert into Google Docs.
 *
 * Does NOT republish Wix articles wholesale — keeps a short attributed
 * summary + canonical link. Re-run anytime Wix UI changes.
 *
 * Usage:
 *   node scripts/scrape-wix-help.js
 *   node scripts/scrape-wix-help.js --insert   # append digests into matching Drive docs
 */

const { google } = require('googleapis')
const fs = require('fs')
const os = require('os')
const path = require('path')

const OUT_DIR = path.join(__dirname, 'wix-help-digests')
const OAUTH_PATH = path.join(os.homedir(), '.gdrive-oauth.json')
const CREDS_PATH = path.join(os.homedir(), '.gdrive-credentials.json')

/** Articles we cite (or should cite) mapped to our how-to docs */
const ARTICLES = [
  {
    slug: 'stores-add-physical-product',
    url: 'https://support.wix.com/en/article/wix-stores-adding-a-physical-product',
    ourDocs: [
      '08 - How to Manage Spirit Wear v2',
      '08b - How to Manage the School Store Inventory v2',
      '21 - How to Show a New Store or Spirit Product',
    ],
    focus: 'Creating a product in Catalog (name, price, media, inventory, publish)',
  },
  {
    slug: 'stores-inventory',
    url: 'https://support.wix.com/en/article/wix-stores-about-inventory-management',
    ourDocs: [
      '08 - How to Manage Spirit Wear v2',
      '08b - How to Manage the School Store Inventory v2',
    ],
    focus: 'Marking in stock / out of stock / tracked quantity',
  },
  {
    slug: 'stores-ribbons',
    url: 'https://support.wix.com/en/article/wix-stores-managing-ribbons',
    ourDocs: ['08b - How to Manage the School Store Inventory v2'],
    focus: 'Ribbons used as Deal of the Week on /store',
  },
  {
    slug: 'cms-collections',
    url: 'https://support.wix.com/en/article/cms-formerly-content-manager-managing-your-collections',
    ourDocs: [
      '01 - How to Manage Board Members v2',
      '13 - How to Edit Page Heroes and Marketing Copy (PageContent)',
      '19 - How to Manage Volunteer Opportunities and Meeting Minutes',
      '21 - How to Show a New Store or Spirit Product',
    ],
    focus: 'Opening CMS, editing collection items, views/layouts',
  },
  {
    slug: 'media-upload',
    url: 'https://support.wix.com/en/article/wix-media-uploading-media-to-the-media-manager',
    ourDocs: [
      '01 - How to Manage Board Members v2',
      '08 - How to Manage Spirit Wear v2',
      '08b - How to Manage the School Store Inventory v2',
    ],
    focus: 'Uploading images for products / board photos',
  },
  {
    slug: 'events-manage',
    url: 'https://support.wix.com/en/article/wix-events-managing-your-events',
    ourDocs: ['07 - How to Manage Events v2'],
    focus: 'Creating and editing Wix Events',
  },
]

async function fetchArticle(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SHMS-PTO-docs-bot/1.0 (+https://shmspto.org; internal how-to digests)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
}

/** Prefer article main; drop chrome, then flatten to lines */
function htmlToLines(html) {
  let body = html
  const main =
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html
  body = main
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  // Keep heading / list structure as markers
  body = body
    .replace(/<h([1-3])[^>]*>/gi, '\n### ')
    .replace(/<\/h[1-3]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(body)
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (m) return decodeEntities(m[1].replace(/<[^>]+>/g, '')).trim()
  return 'Wix Help Article'
}

/** Pull actionable steps; drop TOC duplicates and marketing chrome */
function buildDigest({ title, url, focus, lines }) {
  const skip =
    /^(Topics|Resources|Pricing|Log In|Get Started|Helpmate|Did this help|Hire a|Related articles|In this article|Summary of|Need more help|Wix Learn|Wix Blog|SEO Learning|Website development|Unlock personalized|Video tutorial|FAQs|Important:|Tip:|Note:|Learn more)/i

  const interesting = []
  let seenStep = false
  for (const line of lines) {
    if (line.length < 12 || line.length > 240) continue
    if (skip.test(line)) continue
    if (line === title || line.includes('| Help Center |')) continue
    // After first real Step heading, keep steps + action bullets
    if (/^###\s*Step \d+/i.test(line) || /^Step \d+\s*\|/i.test(line)) {
      seenStep = true
      interesting.push(line.replace(/^###\s*/, ''))
      continue
    }
    if (
      seenStep &&
      (/^• /.test(line) ||
        /^\d+\.\s/.test(line) ||
        /^(Go to |Click |Select |Enter |Enable |Add |Upload |Save |Open |Choose )/i.test(line))
    ) {
      interesting.push(line)
    }
    // CMS-style articles without "Step N"
    if (
      !seenStep &&
      (/^• Go to CMS|^• Click |^Go to CMS|^Click the relevant/i.test(line) ||
        /^###\s*Managing/i.test(line))
    ) {
      interesting.push(line.replace(/^###\s*/, ''))
    }
  }

  const uniq = []
  const seen = new Set()
  for (const l of interesting) {
    const key = l.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    uniq.push(l)
  }

  const body = uniq.slice(0, 22)
  return [
    `# ${title}`,
    '',
    `Source: ${url}`,
    `Fetched: ${new Date().toISOString().slice(0, 10)}`,
    `SHMS focus: ${focus}`,
    '',
    '> Short digest for PTO how-tos. Always prefer the live Wix article if UI differs.',
    '',
    ...(body.length
      ? body.map((l) => (l.startsWith('•') || /^\d+\./.test(l) || /^Step /.test(l) ? l : `- ${l}`))
      : ['- (Could not extract steps — open the full article link below.)']),
    '',
    `Full article: ${url}`,
    '',
  ].join('\n')
}

function getAuth() {
  const oauthRaw = JSON.parse(fs.readFileSync(OAUTH_PATH))
  const key = Object.keys(oauthRaw)[0]
  const { client_id, client_secret } = oauthRaw[key]
  const oAuth2 = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob')
  const token = JSON.parse(fs.readFileSync(CREDS_PATH))
  oAuth2.setCredentials(token)
  return oAuth2
}

async function findDoc(drive, title) {
  const res = await drive.files.list({
    q: `name='${title.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.document' and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive',
  })
  return res.data.files[0]?.id ?? null
}

function docText(doc) {
  return (doc.body?.content ?? [])
    .map((el) => (el.paragraph?.elements ?? []).map((e) => e.textRun?.content ?? '').join(''))
    .join('')
}

async function appendPointersForDoc(docs, docId, articles) {
  const doc = (await docs.documents.get({ documentId: docId })).data
  const text = docText(doc)
  if (text.includes('From Wix Help (auto-digest)')) {
    console.log('  skip (already has digest section)')
    return
  }
  const end = doc.body.content[doc.body.content.length - 1].endIndex - 1
  const lines = [
    '\n',
    'From Wix Help (auto-digest)\n',
    'Official Wix steps for the UI actions above. Open the live article if buttons look different.\n',
    ...articles.map((a) => `• ${a.title} — ${a.url}\n`),
    'Local digests: scripts/wix-help-digests/ (re-run node scripts/scrape-wix-help.js to refresh).\n',
  ]
  const short = lines.join('')
  const h1Len = 'From Wix Help (auto-digest)\n'.length

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        { insertText: { location: { index: end }, text: short } },
        {
          updateParagraphStyle: {
            range: { startIndex: end + 1, endIndex: end + 1 + h1Len },
            paragraphStyle: { namedStyleType: 'HEADING_1' },
            fields: 'namedStyleType',
          },
        },
      ],
    },
  })
  console.log(`  appended ${articles.length} Wix Help link(s)`)
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const doInsert = process.argv.includes('--insert')
  const index = []

  console.log('\nScraping Wix Help articles…\n')

  for (const article of ARTICLES) {
    process.stdout.write(`  ${article.slug}… `)
    try {
      const html = await fetchArticle(article.url)
      const lines = htmlToLines(html)
      const title = extractTitle(html)
      const digest = buildDigest({ title, url: article.url, focus: article.focus, lines })
      const outPath = path.join(OUT_DIR, `${article.slug}.md`)
      fs.writeFileSync(outPath, digest)
      index.push({ ...article, title, outPath })
      console.log(`ok → ${path.basename(outPath)} (${digest.split('\n').length} lines)`)
    } catch (err) {
      console.log(`FAIL: ${err.message}`)
    }
  }

  const indexMd = [
    '# Wix Help digests (SHMS PTO)',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'These are **short attributed digests** of public Wix Help articles we already link from board how-tos.',
    'Do not treat as a replacement for the official article.',
    '',
    ...index.map(
      (a) =>
        `- **${a.title}** → [\`${a.slug}.md\`](./${a.slug}.md)  \n  ${a.url}  \n  Used by: ${a.ourDocs.join('; ')}`
    ),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), indexMd)
  console.log(`\nWrote ${index.length} digests → ${OUT_DIR}`)

  if (!doInsert) {
    console.log('\nTip: re-run with --insert to append a short “From Wix Help” pointer into matching Drive docs.')
    return
  }

  console.log('\nAppending pointers into Google Docs…')
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docsApi = google.docs({ version: 'v1', auth })

  /** group articles by our doc title */
  const byDoc = new Map()
  for (const article of index) {
    for (const docTitle of article.ourDocs) {
      if (!byDoc.has(docTitle)) byDoc.set(docTitle, [])
      byDoc.get(docTitle).push(article)
    }
  }

  for (const [docTitle, articles] of byDoc) {
    const docId = await findDoc(drive, docTitle)
    if (!docId) {
      console.log(`  missing doc: ${docTitle}`)
      continue
    }
    console.log(`  ${docTitle}`)
    await appendPointersForDoc(docsApi, docId, articles)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
