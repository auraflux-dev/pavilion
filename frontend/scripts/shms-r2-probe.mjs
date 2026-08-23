#!/usr/bin/env node
/**
 * Probe SHMS R2 credentials (read ~/.shmspto/prod.env or current env).
 *
 *   cd frontend && ../scripts/with-prod-env.sh node scripts/shms-r2-probe.mjs
 *
 * Exits 0 when HeadBucket, ListObjects, and PutObject all succeed.
 */
import { DeleteObjectCommand, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BACKUP_BUCKET']

function requireEnv() {
  const missing = KEYS.filter((k) => !String(process.env[k] ?? '').trim())
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}. Use ./scripts/with-prod-env.sh`)
  }
}

function makeClient() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
    },
    forcePathStyle: true,
  })
}

async function main() {
  requireEnv()
  const bucket = process.env.R2_BACKUP_BUCKET.trim()
  const client = makeClient()
  const probeKey = 'newsletter-heroes/_r2-probe.png'
  const tinyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const report = { bucket, checks: {} }

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
    report.checks.headBucket = 'ok'
  } catch (err) {
    report.checks.headBucket = err instanceof Error ? err.message : String(err)
  }

  try {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 3, Prefix: 'cms/' }),
    )
    report.checks.listCms = {
      ok: true,
      count: res.KeyCount ?? 0,
      sample: (res.Contents ?? []).map((o) => o.Key),
    }
  } catch (err) {
    report.checks.listCms = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: probeKey,
        Body: tinyPng,
        ContentType: 'image/png',
      }),
    )
    report.checks.putNewsletterHero = 'ok'
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey })).catch(() => {})
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    report.checks.putNewsletterHero = msg
    if (/access denied/i.test(msg)) {
      report.fix =
        'R2 token is read-only. Cloudflare Dashboard → R2 → Manage API tokens → create Object Read & Write on bucket "' +
        bucket +
        '". Update ~/.shmspto/prod.env, then run: ./scripts/with-prod-env.sh node scripts/ops/shms-r2-vercel-env.mjs --redeploy'
    }
  }

  console.log(JSON.stringify(report, null, 2))

  const ok =
    report.checks.headBucket === 'ok' &&
    report.checks.putNewsletterHero === 'ok'
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
