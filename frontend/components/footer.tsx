import { getSiteSettings } from '@/lib/api/site-settings'
import { getFooterLinks } from '@/lib/api/nav'
import { isMemberRequest } from '@/lib/is-member-request'
import { FooterClient } from './footer-client'

export async function Footer() {
  const [settings, footerLinks, member] = await Promise.all([
    getSiteSettings(),
    getFooterLinks(),
    isMemberRequest(),
  ])

  return (
    <FooterClient
      storeHours={settings.get('storeHours', 'Mon–Fri · 8:15–9:00 AM (when school is in session)')}
      presidentEmail={settings.get('presidentEmail', 'president@shmspto.org')}
      link6={member ? settings.get('announcement6thLink', '') : ''}
      link7={member ? settings.get('announcement7thLink', '') : ''}
      link8={member ? settings.get('announcement8thLink', '') : ''}
      socialFacebook={settings.get('socialFacebook', '')}
      socialInstagram={settings.get('socialInstagram', '')}
      socialTwitter={settings.get('socialTwitter', '')}
      socialYoutube={settings.get('socialYoutube', '')}
      footerLinks={footerLinks}
    />
  )
}
