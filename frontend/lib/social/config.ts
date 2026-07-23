/**
 * Social publishing config — Facebook live via Wix Social Publisher; Instagram deferred (1 free slot).
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import {
  DEFAULT_SOCIAL_FACEBOOK,
  DEFAULT_SOCIAL_INSTAGRAM,
  resolveSocialLink,
} from '@/lib/social/public-links'

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'youtube'

export interface SocialLinks {
  facebook: string
  instagram: string
  twitter: string
  youtube: string
}

export interface SocialPublishConfig {
  links: SocialLinks
  /** Wix Social Publisher Facebook account GUID */
  facebookAccountId: string
  /** Facebook Page id used as publishingTarget */
  facebookPageId: string
  instagramAccountId: string
  publishEnabled: boolean
  /** Instagram blocked until Wix social slot / upgrade */
  instagramAvailable: boolean
}

export async function getSocialConfig(): Promise<SocialPublishConfig> {
  const settings = await getSiteSettings()
  const instagramAccountId = settings.get('socialInstagramAccountId', '')
  return {
    links: {
      facebook: resolveSocialLink(settings.get('socialFacebook', ''), DEFAULT_SOCIAL_FACEBOOK),
      instagram: resolveSocialLink(settings.get('socialInstagram', ''), DEFAULT_SOCIAL_INSTAGRAM),
      twitter: settings.get('socialTwitter', ''),
      youtube: settings.get('socialYoutube', ''),
    },
    facebookAccountId: settings.get('socialFacebookAccountId', ''),
    facebookPageId: settings.get('socialFacebookPageId', ''),
    instagramAccountId,
    publishEnabled: settings.get('socialPublishEnabled', 'false') === 'true',
    instagramAvailable: Boolean(instagramAccountId),
  }
}
