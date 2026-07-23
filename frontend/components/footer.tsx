import { getSiteSettings } from '@/lib/api/site-settings'
import { getFooterLinks } from '@/lib/api/nav'
import { isMemberRequest } from '@/lib/is-member-request'
import {
  DEFAULT_SOCIAL_FACEBOOK,
  DEFAULT_SOCIAL_INSTAGRAM,
  resolveSocialLink,
} from '@/lib/social/public-links'
import { FooterClient } from './footer-client'

export async function Footer() {
  const [settings, footerLinks, member] = await Promise.all([
    getSiteSettings(),
    getFooterLinks(),
    isMemberRequest(),
  ])

  return (
    <FooterClient
      storeHours={settings.get('storeHours', 'Mon. Fri · 8:15 to 9:00 AM (when school is in session)')}
      presidentEmail={settings.get('presidentEmail', 'president@shmspto.org')}
      link6={member ? settings.get('announcement6thLink', '') : ''}
      link7={member ? settings.get('announcement7thLink', '') : ''}
      link8={member ? settings.get('announcement8thLink', '') : ''}
      socialFacebook={resolveSocialLink(settings.get('socialFacebook', ''), DEFAULT_SOCIAL_FACEBOOK)}
      socialInstagram={resolveSocialLink(settings.get('socialInstagram', ''), DEFAULT_SOCIAL_INSTAGRAM)}
      socialTwitter={settings.get('socialTwitter', '')}
      socialYoutube={settings.get('socialYoutube', '')}
      footerLinks={footerLinks}
    />
  )
}
