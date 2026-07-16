/**
 * Social publishing config — URLs live now; publish API stubs until FB/IG accounts exist.
 */
import { getSiteSettings } from '@/lib/api/site-settings'

export type SocialPlatform = 'facebook' | 'instagram' | 'twitter' | 'youtube'

export interface SocialLinks {
  facebook: string
  instagram: string
  twitter: string
  youtube: string
}

export interface SocialPublishConfig {
  links: SocialLinks
  /** Wix Marketing Social page IDs — fill when accounts are connected */
  facebookPageId: string
  instagramAccountId: string
  publishEnabled: boolean
}

export async function getSocialConfig(): Promise<SocialPublishConfig> {
  const settings = await getSiteSettings()
  return {
    links: {
      facebook: settings.get('socialFacebook', ''),
      instagram: settings.get('socialInstagram', ''),
      twitter: settings.get('socialTwitter', ''),
      youtube: settings.get('socialYoutube', ''),
    },
    facebookPageId: settings.get('socialFacebookPageId', ''),
    instagramAccountId: settings.get('socialInstagramAccountId', ''),
    publishEnabled: settings.get('socialPublishEnabled', 'false') === 'true',
  }
}
