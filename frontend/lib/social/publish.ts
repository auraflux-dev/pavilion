/**
 * Stub for Wix-native social publishing. Wire to Wix Marketing API when accounts exist.
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
  if (!config.publishEnabled) {
    return {
      ok: false,
      platform: draft.platform,
      error:
        'Social publishing is disabled. Connect Facebook/Instagram in Wix Dashboard → Marketing & SEO → Social, then set socialPublishEnabled=true in Site Settings.',
    }
  }
  if (draft.platform === 'facebook' && !config.facebookPageId && !config.links.facebook) {
    return {
      ok: false,
      platform: draft.platform,
      error: 'Facebook Page is not connected yet.',
    }
  }
  if (draft.platform === 'instagram' && !config.instagramAccountId && !config.links.instagram) {
    return {
      ok: false,
      platform: draft.platform,
      error: 'Instagram account is not connected yet.',
    }
  }
  // Native Wix Marketing publish API wiring lands after Meta accounts are connected.
  return {
    ok: false,
    platform: draft.platform,
    error:
      'Publish API bridge not live yet. Draft was saved in SocialPosts — post from Wix Social or reconnect after API enablement.',
  }
}

export function buildShareText(message: string, linkUrl: string): string {
  return linkUrl ? `${message}\n\n${linkUrl}` : message
}
