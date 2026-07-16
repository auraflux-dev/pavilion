/**
 * Publish via Wix Social Publisher — full Facebook POST / REEL / STORY surface.
 * Instagram remains gated until a second Wix social slot is connected.
 */
import { getSocialConfig } from './config'
import { ensureWixMediaUrl } from './wix-media'
import type {
  SocialCreativeInput,
  SocialMediaItem,
  SocialPostDraft,
  SocialPublishResult,
} from './types'

export type { SocialPostDraft, SocialPublishResult } from './types'

function wixHeaders(apiKey: string, siteId: string) {
  return {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }
}

async function resolveMediaList(items: SocialMediaItem[]): Promise<SocialMediaItem[]> {
  const out: SocialMediaItem[] = []
  for (const item of items) {
    const mime = item.type === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
    const url = await ensureWixMediaUrl(item.url, mime)
    out.push({ ...item, url })
  }
  return out
}

async function buildFacebookContent(
  draft: SocialPostDraft
): Promise<{ type: 'POST' | 'REEL' | 'STORY'; payloadKey: string; payload: Record<string, unknown> }> {
  const creative = draft.creative

  if (draft.format === 'REEL') {
    const videoUrl = creative.videoUrl || creative.media?.find((m) => m.type === 'VIDEO')?.url
    if (!videoUrl) throw new Error('Facebook Reels require a video.')
    const resolved = await ensureWixMediaUrl(videoUrl, 'video/mp4')
    return {
      type: 'REEL',
      payloadKey: 'facebookReel',
      payload: {
        videoUrl: resolved,
        description: draft.message,
      },
    }
  }

  if (draft.format === 'STORY') {
    const media =
      creative.media && creative.media.length
        ? await resolveMediaList(creative.media)
        : creative.imageUrl
          ? [{ type: 'IMAGE' as const, url: await ensureWixMediaUrl(creative.imageUrl, 'image/jpeg') }]
          : creative.videoUrl
            ? [{ type: 'VIDEO' as const, url: await ensureWixMediaUrl(creative.videoUrl, 'video/mp4') }]
            : []
    if (!media.length) throw new Error('Facebook Stories require an image or video.')
    return {
      type: 'STORY',
      payloadKey: 'facebookStory',
      payload: {
        mediaWrapper: { media },
      },
    }
  }

  // POST
  const facebookPost: Record<string, unknown> = {
    caption: draft.message,
  }

  const kind = creative.kind
  if (kind === 'gallery' || (creative.media && creative.media.length > 1)) {
    const media = await resolveMediaList(creative.media ?? [])
    if (!media.length) throw new Error('Gallery posts need at least one media item.')
    facebookPost.mediaWrapper = { media }
  } else if (kind === 'video' || creative.videoUrl) {
    if (!creative.videoUrl) throw new Error('Video post is missing a video URL.')
    facebookPost.videoUrl = await ensureWixMediaUrl(creative.videoUrl, 'video/mp4')
  } else if (kind === 'image' || creative.imageUrl) {
    if (!creative.imageUrl) throw new Error('Image post is missing an image URL.')
    facebookPost.imageUrl = await ensureWixMediaUrl(creative.imageUrl, 'image/jpeg')
  } else if (kind === 'link' || creative.linkUrl) {
    if (!creative.linkUrl) throw new Error('Link post is missing a URL.')
    facebookPost.link = creative.linkUrl
    if (creative.linkMetadata) {
      const meta: Record<string, string> = {}
      if (creative.linkMetadata.thumbnailUrl) {
        meta.thumbnailUrl = await ensureWixMediaUrl(creative.linkMetadata.thumbnailUrl, 'image/jpeg')
      }
      if (creative.linkMetadata.title) meta.title = creative.linkMetadata.title
      if (creative.linkMetadata.description) meta.description = creative.linkMetadata.description
      if (Object.keys(meta).length) facebookPost.linkMetadata = meta
    }
  } else if (creative.media?.length === 1) {
    const [only] = await resolveMediaList(creative.media)
    if (only.type === 'VIDEO') facebookPost.videoUrl = only.url
    else facebookPost.imageUrl = only.url
  }
  // kind === 'text' → caption only
  return { type: 'POST', payloadKey: 'facebookPost', payload: facebookPost }
}

function normalizeCreative(input?: Partial<SocialCreativeInput>): SocialCreativeInput {
  return {
    kind: input?.kind ?? 'text',
    imageUrl: input?.imageUrl?.trim() || undefined,
    videoUrl: input?.videoUrl?.trim() || undefined,
    linkUrl: input?.linkUrl?.trim() || undefined,
    media: input?.media?.filter((m) => m.url?.trim()) ?? undefined,
    linkMetadata: input?.linkMetadata,
  }
}

export async function publishSocialPost(draft: SocialPostDraft): Promise<SocialPublishResult> {
  const config = await getSocialConfig()

  if (draft.platform === 'instagram') {
    return {
      ok: false,
      platform: draft.platform,
      error:
        'Instagram is not connected yet. Wix free plans allow one social account — Facebook is live; connect Instagram after upgrading or freeing a slot.',
    }
  }

  if (draft.platform !== 'facebook') {
    return {
      ok: false,
      platform: draft.platform,
      error: `Unsupported platform: ${draft.platform}`,
    }
  }

  if (!config.publishEnabled) {
    return {
      ok: false,
      platform: draft.platform,
      error:
        'Social publishing is disabled. Set socialPublishEnabled=true in Site Settings after connecting Facebook in Wix Social.',
    }
  }

  if (!config.facebookAccountId || !config.facebookPageId) {
    return {
      ok: false,
      platform: draft.platform,
      error:
        'Facebook account/page IDs missing. Connect Facebook in Wix Dashboard → Marketing & SEO → Social, then set socialFacebookAccountId and socialFacebookPageId in Site Settings.',
    }
  }

  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) {
    return { ok: false, platform: draft.platform, error: 'WIX_API_KEY / WIX_SITE_ID not configured.' }
  }

  try {
    const resolved = await buildFacebookContent({
      ...draft,
      creative: normalizeCreative(draft.creative),
      message: draft.message.trim(),
    })
    resolved.payload.pageId = config.facebookPageId

    const item: Record<string, unknown> = {
      channel: {
        name: 'FACEBOOK',
        accountId: config.facebookAccountId,
        publishingTarget: { id: config.facebookPageId },
      },
      type: resolved.type,
      [resolved.payloadKey]: resolved.payload,
    }

    if (draft.scheduledAt) {
      item.schedulingInfo = { scheduledDate: draft.scheduledAt }
    }

    if (draft.siteAsset?.id && draft.siteAsset?.type) {
      item.siteAssetRef = {
        siteAssetRefType: draft.siteAsset.type,
        id: draft.siteAsset.id,
        name: draft.siteAsset.name || undefined,
      }
    }

    const headers = wixHeaders(apiKey, siteId)
    const createRes = await fetch('https://www.wixapis.com/social-publisher/v1/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({ item }),
    })
    const createBody = (await createRes.json().catch(() => ({}))) as {
      item?: { id?: string }
      message?: string
    }
    if (!createRes.ok || !createBody.item?.id) {
      return {
        ok: false,
        platform: draft.platform,
        error: createBody.message || `Wix draft create failed (${createRes.status})`,
      }
    }

    const itemId = createBody.item.id
    const publishBody: Record<string, string> = { id: itemId }
    if (draft.scheduledAt) publishBody.scheduledDate = draft.scheduledAt

    const publishRes = await fetch('https://www.wixapis.com/social-publisher/v1/publish-by-id', {
      method: 'POST',
      headers,
      body: JSON.stringify(publishBody),
    })
    const publishJson = (await publishRes.json().catch(() => ({}))) as {
      item?: {
        id?: string
        status?: string
        facebookPost?: { postUrl?: string }
        facebookReel?: { videoUrl?: string }
        facebookStory?: { storyUrl?: string }
      }
      message?: string
    }
    if (!publishRes.ok) {
      return {
        ok: false,
        platform: draft.platform,
        externalId: itemId,
        status: 'failed',
        error:
          publishJson.message ||
          `Wix publish failed (${publishRes.status}). Draft id ${itemId} is in Wix Social.`,
      }
    }

    const status =
      publishJson.item?.status === 'SCHEDULED' || draft.scheduledAt ? 'scheduled' : 'published'
    const externalId =
      publishJson.item?.facebookPost?.postUrl ||
      publishJson.item?.facebookStory?.storyUrl ||
      publishJson.item?.id ||
      itemId

    return {
      ok: true,
      platform: draft.platform,
      externalId,
      status,
    }
  } catch (err) {
    return {
      ok: false,
      platform: draft.platform,
      status: 'failed',
      error: err instanceof Error ? err.message : 'Facebook publish failed',
    }
  }
}

export function buildShareText(message: string, linkUrl: string): string {
  return linkUrl ? `${message}\n\n${linkUrl}` : message
}
