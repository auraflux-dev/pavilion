import { getSiteSettings } from '@/lib/api/site-settings'
import { getFooterLinks } from '@/lib/api/nav'
import { FooterClient } from './footer-client'

export async function Footer() {
  const [settings, footerLinks] = await Promise.all([
    getSiteSettings(),
    getFooterLinks(),
  ])

  return (
    <FooterClient
      storeHours={settings.get('storeHours', 'Mon–Fri · 8:15 AM – 9:00 AM')}
      presidentEmail={settings.get('presidentEmail', 'president@shmspto.org')}
      link6={settings.get('announcement6thLink', '')}
      link7={settings.get('announcement7thLink', '')}
      link8={settings.get('announcement8thLink', '')}
      socialFacebook={settings.get('socialFacebook', '')}
      socialInstagram={settings.get('socialInstagram', '')}
      socialTwitter={settings.get('socialTwitter', '')}
      socialYoutube={settings.get('socialYoutube', '')}
      footerLinks={footerLinks}
    />
  )
}
