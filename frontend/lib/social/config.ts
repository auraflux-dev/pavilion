/**
 * Social publishing config. Facebook + Instagram via Wix Social Publisher.
 */
import { getSiteSettings } from '@/lib/api/site-settings'
import { listWixSocialAccounts, pickDefaultAccount } from '@/lib/social/accounts'
import {
  DEFAULT_SOCIAL_FACEBOOK,
  DEFAULT_SOCIAL_INSTAGRAM,
  resolveSocialLink,
} from '@/lib/social/public-links'
import { upsertSiteSetting } from '@/lib/staff/cms-catalog'

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
  /** True when Instagram is connected in Wix and we have an account id */
  instagramAvailable: boolean
  instagramUsername?: string
}

export async function getSocialConfig(opts?: {
  /** When true, pull live Wix accounts and persist Instagram id if newly found */
  syncAccounts?: boolean
}): Promise<SocialPublishConfig> {
  const settings = await getSiteSettings()
  let instagramAccountId = settings.get('socialInstagramAccountId', '')
  let facebookAccountId = settings.get('socialFacebookAccountId', '')
  let facebookPageId = settings.get('socialFacebookPageId', '')
  let instagramUsername: string | undefined

  if (opts?.syncAccounts) {
    try {
      const [igAccounts, fbAccounts] = await Promise.all([
        listWixSocialAccounts('INSTAGRAM'),
        listWixSocialAccounts('FACEBOOK'),
      ])
      const ig = pickDefaultAccount(igAccounts)
      const fb = pickDefaultAccount(fbAccounts)
      if (ig?.accountId) {
        instagramUsername = ig.username || ig.displayName
        if (ig.accountId !== instagramAccountId) {
          instagramAccountId = ig.accountId
          await upsertSiteSetting('socialInstagramAccountId', ig.accountId).catch((err) => {
            console.warn('persist socialInstagramAccountId', err)
          })
        }
      }
      if (fb?.accountId && fb.accountId !== facebookAccountId) {
        facebookAccountId = fb.accountId
        await upsertSiteSetting('socialFacebookAccountId', fb.accountId).catch(() => {})
      }
      if (fb?.pageId && fb.pageId !== facebookPageId) {
        facebookPageId = fb.pageId
        await upsertSiteSetting('socialFacebookPageId', fb.pageId).catch(() => {})
      }
    } catch (err) {
      console.warn('getSocialConfig syncAccounts', err)
    }
  }

  return {
    links: {
      facebook: resolveSocialLink(settings.get('socialFacebook', ''), DEFAULT_SOCIAL_FACEBOOK),
      instagram: resolveSocialLink(settings.get('socialInstagram', ''), DEFAULT_SOCIAL_INSTAGRAM),
      twitter: settings.get('socialTwitter', ''),
      youtube: settings.get('socialYoutube', ''),
    },
    facebookAccountId,
    facebookPageId,
    instagramAccountId,
    publishEnabled: settings.get('socialPublishEnabled', 'false') === 'true',
    instagramAvailable: Boolean(instagramAccountId),
    instagramUsername,
  }
}
