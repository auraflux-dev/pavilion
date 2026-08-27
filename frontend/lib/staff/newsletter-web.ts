/**
 * Public web editions of Staff newsletters (shareable link for school Scoop, etc.).
 * HTML stored in R2 alongside newsletter assets; served at /newsletters/[slug].
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { newsletterAssetsConfigured } from '@/lib/staff/newsletter-assets'
import {
  newsletterWebHtmlKey,
  newsletterWebMetaKey,
  normalizeNewsletterWebSlug,
  type NewsletterWebMeta,
} from '@/lib/staff/newsletter-web-pure'

export {
  newsletterWebHtmlKey,
  newsletterWebMetaKey,
  newsletterWebPublicPath,
  newsletterWebPublicUrl,
  normalizeNewsletterWebSlug,
  slugifyNewsletterTitle,
  type NewsletterWebMeta,
} from '@/lib/staff/newsletter-web-pure'

function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
    forcePathStyle: true,
  })
}

function bucket(): string {
  return process.env.R2_BACKUP_BUCKET!.trim()
}

export async function putNewsletterWebEdition(opts: {
  slug: string
  title: string
  html: string
  publishedByEmail: string
}): Promise<NewsletterWebMeta> {
  if (!newsletterAssetsConfigured()) {
    throw new Error(
      'Web newsletter storage (R2) is not configured. Ask an admin to set R2_* on Vercel.',
    )
  }
  const slug = normalizeNewsletterWebSlug(opts.slug)
  if (!slug) throw new Error('Invalid newsletter slug')
  const meta: NewsletterWebMeta = {
    slug,
    title: String(opts.title ?? '').trim() || 'Newsletter',
    publishedAt: new Date().toISOString(),
    publishedByEmail: String(opts.publishedByEmail ?? '')
      .trim()
      .toLowerCase(),
  }
  const client = makeR2Client()
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: newsletterWebHtmlKey(slug),
        Body: Buffer.from(opts.html, 'utf8'),
        ContentType: 'text/html; charset=utf-8',
        CacheControl: 'public, max-age=300',
        Metadata: {
          site: 'pavilion',
          kind: 'newsletter-web',
          slug,
        },
      }),
    )
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: newsletterWebMetaKey(slug),
        Body: Buffer.from(JSON.stringify(meta), 'utf8'),
        ContentType: 'application/json',
        CacheControl: 'public, max-age=300',
        Metadata: {
          site: 'pavilion',
          kind: 'newsletter-web-meta',
          slug,
        },
      }),
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/access denied/i.test(msg)) {
      throw new Error(
        'R2 token cannot write newsletter web pages (read-only). Ask an admin for Object Read & Write on the backup bucket.',
      )
    }
    throw err
  }
  return meta
}

export async function getNewsletterWebHtml(slugRaw: string): Promise<string | null> {
  const slug = normalizeNewsletterWebSlug(slugRaw)
  if (!slug || !newsletterAssetsConfigured()) return null
  const client = makeR2Client()
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: newsletterWebHtmlKey(slug),
      }),
    )
    const text = await res.Body?.transformToString('utf8')
    return text?.trim() ? text : null
  } catch {
    return null
  }
}

export async function getNewsletterWebMeta(
  slugRaw: string,
): Promise<NewsletterWebMeta | null> {
  const slug = normalizeNewsletterWebSlug(slugRaw)
  if (!slug || !newsletterAssetsConfigured()) return null
  const client = makeR2Client()
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: newsletterWebMetaKey(slug),
      }),
    )
    const text = await res.Body?.transformToString('utf8')
    if (!text?.trim()) return null
    return JSON.parse(text) as NewsletterWebMeta
  } catch {
    return null
  }
}
