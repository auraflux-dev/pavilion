/**
 * Publish via Wix Social Publisher — Facebook POST / REEL / STORY and Instagram POST / STORY.
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

async function buildInstagramContent(
  draft: SocialPostDraft
): Promise<{ type: 'POST' | 'STORY'; payloadKey: string; payload: Record<string, unknown> }> {
  const creative = draft.creative

  const media =
    creative.media && creative.media.length
      ? await resolveMediaList(creative.media)
      : creative.imageUrl
        ? [{ type: 'IMAGE' as const, url: await ensureWixMediaUrl(creative.imageUrl, 'image/jpeg') }]
        : creative.videoUrl
          ? [{ type: 'VIDEO' as const, url: await ensureWixMediaUrl(creative.videoUrl, 'video/mp4') }]
          : []

  if (draft.format === 'STORY') {
    if (!media.length) throw new Error('Instagram Stories require an image or video.')
    return {
      type: 'STORY',
      payloadKey: 'instagramStory',
      payload: { mediaWrapper: { media } },
    }
  }

  if (draft.format === 'REEL') {
    throw new Error('Instagram Reels are not supported yet — use Post or Story.')
  }

  // Instagram POST requires media
  if (!media.length) {
    throw new Error('Instagram posts need an image or video (caption-only is not supported).')
  }

  const instagramPost: Record<string, unknown> = {
    caption: draft.message,
  }
  if (media.length === 1) {
    if (media[0].type === 'VIDEO') instagramPost.videoUrl = media[0].url
    else instagramPost.imageUrl = media[0].url
  } else {
    instagramPost.mediaWrapper = { media }
  }

  return { type: 'POST', payloadKey: 'instagramPost', payload: instagramPost }
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
  const config = await getSocialConfig({ syncAccounts: true })

  if (!['facebook', 'instagram'].includes(draft.platform)) {
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
        'Social publishing is disabled. Set socialPublishEnabled=true in Site Settings after connecting accounts in Wix Social.',
    }
  }

  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) {
    return { ok: false, platform: draft.platform, error: 'WIX_API_KEY / WIX_SITE_ID not configured.' }
  }

  try {
    const creative = normalizeCreative(draft.creative)
    const normalizedDraft = { ...draft, creative, message: draft.message.trim() }

    let item: Record<string, unknown>

    if (draft.platform === 'instagram') {
      if (!config.instagramAccountId) {
        return {
          ok: false,
          platform: draft.platform,
          error:
            'Instagram is not connected. Connect it in Wix Dashboard → Marketing & SEO → Social, then reopen Staff → Social.',
        }
      }
      const resolved = await buildInstagramContent(normalizedDraft)
      item = {
        channel: {
          name: 'INSTAGRAM',
          accountId: config.instagramAccountId,
        },
        type: resolved.type,
        [resolved.payloadKey]: resolved.payload,
      }
    } else {
      if (!config.facebookAccountId || !config.facebookPageId) {
        return {
          ok: false,
          platform: draft.platform,
          error:
            'Facebook account/page IDs missing. Connect Facebook in Wix Dashboard → Marketing & SEO → Social.',
        }
      }
      const resolved = await buildFacebookContent(normalizedDraft)
      resolved.payload.pageId = config.facebookPageId
      item = {
        channel: {
          name: 'FACEBOOK',
          accountId: config.facebookAccountId,
          publishingTarget: { id: config.facebookPageId },
        },
        type: resolved.type,
        [resolved.payloadKey]: resolved.payload,
      }
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
        instagramPost?: { postUrl?: string }
        instagramStory?: { storyUrl?: string }
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
      publishJson.item?.instagramPost?.postUrl ||
      publishJson.item?.instagramStory?.storyUrl ||
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
      error: err instanceof Error ? err.message : `${draft.platform} publish failed`,
    }
  }
}

export function buildShareText(message: string, linkUrl: string): string {
  return linkUrl ? `${message}\n\n${linkUrl}` : message
}
