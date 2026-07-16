import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getSocialConfig } from '@/lib/social/config'
import { publishSocialPost } from '@/lib/social/publish'
import type { CreativeKind, FacebookFormat, SiteAssetType, SocialMediaItem } from '@/lib/social/types'
import type { SocialPlatform } from '@/lib/social/config'

const FORMATS: FacebookFormat[] = ['POST', 'REEL', 'STORY']
const KINDS: CreativeKind[] = ['text', 'image', 'video', 'link', 'gallery']
const ASSET_TYPES: SiteAssetType[] = [
  'BLOG_POST',
  'EVENT',
  'STORES_PRODUCT',
  'BOOKINGS_SERVICE',
  'STORES_COUPON',
  'STORES_CATEGORY',
]

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const config = await getSocialConfig()
  return NextResponse.json({
    publishEnabled: config.publishEnabled,
    links: config.links,
    facebookAccountId: config.facebookAccountId,
    facebookPageId: config.facebookPageId,
    instagramAccountId: config.instagramAccountId,
    instagramAvailable: config.instagramAvailable,
    facebookReady: Boolean(config.publishEnabled && config.facebookAccountId && config.facebookPageId),
    formats: FORMATS,
    creativeKinds: KINDS,
    siteAssetTypes: ASSET_TYPES,
  })
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['marketing', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const platform = String(body.platform ?? '') as SocialPlatform
    const format = (String(body.format ?? 'POST').toUpperCase() || 'POST') as FacebookFormat
    const text = String(body.text ?? '').trim()
    const saveOnly = Boolean(body.saveOnly)
    const scheduledAt = String(body.scheduledAt ?? '').trim() || undefined
    const creativeIn = body.creative ?? {}
    const kind = (String(creativeIn.kind ?? 'text') as CreativeKind) || 'text'
    const imageUrl = String(creativeIn.imageUrl ?? body.imageUrl ?? '').trim()
    const videoUrl = String(creativeIn.videoUrl ?? '').trim()
    const linkUrl = String(creativeIn.linkUrl ?? body.linkUrl ?? '').trim()
    const media = Array.isArray(creativeIn.media)
      ? (creativeIn.media as SocialMediaItem[])
          .map((m) => ({
            type: (String(m.type).toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE') as 'IMAGE' | 'VIDEO',
            url: String(m.url ?? '').trim(),
            fileId: m.fileId ? String(m.fileId) : undefined,
          }))
          .filter((m) => m.url)
      : undefined
    const linkMetadata = creativeIn.linkMetadata
      ? {
          thumbnailUrl: String(creativeIn.linkMetadata.thumbnailUrl ?? '').trim() || undefined,
          title: String(creativeIn.linkMetadata.title ?? '').trim() || undefined,
          description: String(creativeIn.linkMetadata.description ?? '').trim() || undefined,
        }
      : undefined
    const siteAsset =
      body.siteAsset?.id && body.siteAsset?.type
        ? {
            type: String(body.siteAsset.type) as SiteAssetType,
            id: String(body.siteAsset.id).trim(),
            name: body.siteAsset.name ? String(body.siteAsset.name).trim() : undefined,
          }
        : undefined

    if (!['facebook', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'platform must be facebook or instagram' }, { status: 400 })
    }
    if (!FORMATS.includes(format)) {
      return NextResponse.json({ error: 'format must be POST, REEL, or STORY' }, { status: 400 })
    }
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: 'Invalid creative kind' }, { status: 400 })
    }
    if (!text && format !== 'STORY') {
      return NextResponse.json({ error: 'Post text is required' }, { status: 400 })
    }
    if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
      return NextResponse.json({ error: 'scheduledAt must be a valid ISO date' }, { status: 400 })
    }
    if (siteAsset && !ASSET_TYPES.includes(siteAsset.type)) {
      return NextResponse.json({ error: 'Invalid siteAsset.type' }, { status: 400 })
    }

    const client = getWixClient()
    const draftRow = {
      platform,
      text: text || `[${format}]`,
      imageUrl: imageUrl || media?.[0]?.url || null,
      linkUrl: linkUrl || null,
      createdByEmail: session!.email,
      createdByName: session!.staff.name || session!.email,
      status: saveOnly ? 'draft' : 'queued',
      resultMessage: JSON.stringify({
        format,
        kind,
        scheduledAt: scheduledAt || null,
        videoUrl: videoUrl || null,
        mediaCount: media?.length ?? 0,
        siteAsset: siteAsset || null,
      }),
      createdAt: new Date().toISOString(),
    }

    const inserted = await client.items.insert('SocialPosts', draftRow)
    const postId = (inserted as { _id?: string })._id ?? ''

    if (saveOnly) {
      return NextResponse.json({ ok: true, status: 'draft', postId })
    }

    const result = await publishSocialPost({
      platform,
      format,
      message: text,
      scheduledAt,
      siteAsset,
      creative: {
        kind,
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        linkUrl: linkUrl || undefined,
        media,
        linkMetadata,
      },
    })

    if (postId) {
      await client.items.update('SocialPosts', {
        ...draftRow,
        _id: postId,
        status: result.ok ? result.status || 'published' : 'failed',
        resultMessage: result.error ?? result.externalId ?? '',
      } as any)
    }

    return NextResponse.json({
      ok: result.ok,
      status: result.ok ? result.status || 'published' : 'failed',
      error: result.error,
      externalId: result.externalId,
      postId,
    })
  } catch (err) {
    console.error('/api/staff/social POST error:', err)
    return NextResponse.json({ error: 'Could not save or publish post' }, { status: 500 })
  }
}
