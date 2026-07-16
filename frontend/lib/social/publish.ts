/**
 * Publish via Wix Social Publisher (Facebook live; Instagram gated until a free slot / upgrade).
 */
import { getSocialConfig, type SocialPlatform } from './config'

export interface SocialPostDraft {
  platform: SocialPlatform
  message: string
  linkUrl?: string
  imageUrl?: string
}

export interface SocialPublishResult {
  ok: boolean
  platform: SocialPlatform
  externalId?: string
  error?: string
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

  const caption = buildShareText(draft.message, draft.linkUrl ?? '')
  const facebookPost: Record<string, string> = {
    pageId: config.facebookPageId,
    caption,
  }
  if (draft.imageUrl) facebookPost.imageUrl = draft.imageUrl
  if (draft.linkUrl) facebookPost.link = draft.linkUrl

  const headers = {
    Authorization: apiKey,
    'wix-site-id': siteId,
    'Content-Type': 'application/json',
  }

  try {
    const createRes = await fetch('https://www.wixapis.com/social-publisher/v1/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        item: {
          channel: {
            name: 'FACEBOOK',
            accountId: config.facebookAccountId,
            publishingTarget: { id: config.facebookPageId },
          },
          type: 'POST',
          facebookPost,
        },
      }),
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
    const publishRes = await fetch('https://www.wixapis.com/social-publisher/v1/publish-by-id', {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: itemId }),
    })
    const publishBody = (await publishRes.json().catch(() => ({}))) as {
      item?: { id?: string; facebookPost?: { postUrl?: string }; status?: string }
      message?: string
    }
    if (!publishRes.ok) {
      return {
        ok: false,
        platform: draft.platform,
        externalId: itemId,
        error: publishBody.message || `Wix publish failed (${publishRes.status}). Draft id ${itemId} is in Wix Social.`,
      }
    }

    return {
      ok: true,
      platform: draft.platform,
      externalId: publishBody.item?.facebookPost?.postUrl || publishBody.item?.id || itemId,
    }
  } catch (err) {
    return {
      ok: false,
      platform: draft.platform,
      error: err instanceof Error ? err.message : 'Facebook publish failed',
    }
  }
}

export function buildShareText(message: string, linkUrl: string): string {
  return linkUrl ? `${message}\n\n${linkUrl}` : message
}
