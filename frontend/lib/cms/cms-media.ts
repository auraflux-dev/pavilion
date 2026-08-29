/**
 * Pavilion CMS media (R2) for demo/trial page builder uploads.
 * Served via /api/cms-media/[key].
 */
import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { newsletterAssetsConfigured } from '@/lib/staff/newsletter-assets'
import { newsletterSiteOrigin } from '@/lib/staff/newsletter-site'

const PREFIX = 'cms-media/'

export function cmsMediaConfigured(): boolean {
  return newsletterAssetsConfigured()
}

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

export function normalizeCmsMediaKey(raw: string): string | null {
  const key = String(raw ?? '')
    .trim()
    .replace(/^\/+/, '')
  if (!key.startsWith(PREFIX)) return null
  if (!/^cms-media\/[a-zA-Z0-9._-]+$/.test(key)) return null
  return key
}

export function publicCmsMediaUrl(key: string): string {
  return `${newsletterSiteOrigin()}/api/cms-media/${encodeURIComponent(key)}`
}

export async function putCmsMedia(
  buf: Buffer,
  opts: { filename: string; mimeType: string },
): Promise<{ key: string; url: string }> {
  if (!cmsMediaConfigured()) {
    throw new Error('CMS media storage is not configured (R2).')
  }
  const ext =
    opts.mimeType === 'image/png'
      ? 'png'
      : opts.mimeType === 'image/webp'
        ? 'webp'
        : opts.mimeType === 'image/gif'
          ? 'gif'
          : 'jpg'
  const base = opts.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40) || 'image'
  const key = `${PREFIX}${base}-${randomUUID().slice(0, 8)}.${ext}`
  const client = makeR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: buf,
      ContentType: opts.mimeType || 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: { kind: 'cms-media' },
    }),
  )
  return { key, url: publicCmsMediaUrl(key) }
}

export async function getCmsMedia(key: string): Promise<{ buf: Buffer; contentType: string } | null> {
  const safe = normalizeCmsMediaKey(key)
  if (!safe || !cmsMediaConfigured()) return null
  const client = makeR2Client()
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: safe,
      }),
    )
    const bytes = await res.Body?.transformToByteArray()
    if (!bytes) return null
    return {
      buf: Buffer.from(bytes),
      contentType: res.ContentType || 'application/octet-stream',
    }
  } catch {
    return null
  }
}
