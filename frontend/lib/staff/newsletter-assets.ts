/**
 * Durable newsletter hero PNGs (Canva export re-host).
 * Stored in the same R2 bucket as CMS backups; served via /api/newsletter-assets/[key].
 */

import { randomUUID } from 'node:crypto'
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { newsletterSiteOrigin } from './newsletter-site'

const PREFIX = 'newsletter-heroes/'

export function newsletterAssetsConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BACKUP_BUCKET?.trim(),
  )
}

function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID!.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
  })
}

function bucket(): string {
  return process.env.R2_BACKUP_BUCKET!.trim()
}

/** Object key only (no path traversal). */
export function normalizeNewsletterAssetKey(raw: string): string | null {
  const key = String(raw ?? '')
    .trim()
    .replace(/^\/+/, '')
  if (!key.startsWith(PREFIX)) return null
  if (!/^newsletter-heroes\/[a-zA-Z0-9._-]+\.png$/.test(key)) return null
  return key
}

export function publicNewsletterAssetUrl(key: string): string {
  return `${newsletterSiteOrigin()}/api/newsletter-assets/${encodeURIComponent(key)}`
}

export async function putNewsletterHeroPng(
  png: Buffer,
  opts?: { designId?: string },
): Promise<{ key: string; url: string }> {
  if (!newsletterAssetsConfigured()) {
    throw new Error(
      'Image storage is not configured (R2). Set R2_* on Vercel or use Canva thumbnail fallback.',
    )
  }
  const slug = opts?.designId
    ? opts.designId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)
    : 'hero'
  const key = `${PREFIX}${slug}-${randomUUID().slice(0, 8)}.png`
  const client = makeR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: png,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        site: 'shmspto',
        kind: 'newsletter-hero',
      },
    }),
  )
  return { key, url: publicNewsletterAssetUrl(key) }
}

export async function getNewsletterHeroPng(key: string): Promise<Buffer | null> {
  const safe = normalizeNewsletterAssetKey(key)
  if (!safe || !newsletterAssetsConfigured()) return null
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
    return Buffer.from(bytes)
  } catch {
    return null
  }
}
