import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getSocialConfig } from '@/lib/social/config'
import { publishSocialPost } from '@/lib/social/publish'
import type { SocialPlatform } from '@/lib/social/config'

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
    const text = String(body.text ?? '').trim()
    const imageUrl = String(body.imageUrl ?? '').trim()
    const linkUrl = String(body.linkUrl ?? '').trim()
    const saveOnly = Boolean(body.saveOnly)

    if (!['facebook', 'instagram'].includes(platform)) {
      return NextResponse.json({ error: 'platform must be facebook or instagram' }, { status: 400 })
    }
    if (!text) {
      return NextResponse.json({ error: 'Post text is required' }, { status: 400 })
    }

    const client = getWixClient()
    const draftRow = {
      platform,
      text,
      imageUrl: imageUrl || null,
      linkUrl: linkUrl || null,
      createdByEmail: session!.email,
      createdByName: session!.staff.name || session!.email,
      status: saveOnly ? 'draft' : 'queued',
      resultMessage: '',
      createdAt: new Date().toISOString(),
    }

    const inserted = await client.items.insert('SocialPosts', draftRow)
    const postId = (inserted as { _id?: string })._id ?? ''

    if (saveOnly) {
      return NextResponse.json({ ok: true, status: 'draft', postId })
    }

    const result = await publishSocialPost({
      platform,
      message: text,
      imageUrl: imageUrl || undefined,
      linkUrl: linkUrl || undefined,
    })

    if (postId) {
      await client.items.update('SocialPosts', {
        ...draftRow,
        _id: postId,
        status: result.ok ? 'published' : 'failed',
        resultMessage: result.error ?? result.externalId ?? '',
      } as any)
    }

    return NextResponse.json({
      ok: result.ok,
      status: result.ok ? 'published' : 'failed',
      error: result.error,
      postId,
    })
  } catch (err) {
    console.error('/api/staff/social POST error:', err)
    return NextResponse.json({ error: 'Could not save or publish post' }, { status: 500 })
  }
}
