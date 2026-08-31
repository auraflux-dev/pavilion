import { getSiteSettings } from '@/lib/api/site-settings'
import { getFooterLinks } from '@/lib/api/nav'
import { isMemberRequest } from '@/lib/is-member-request'
import {
  DEFAULT_SOCIAL_FACEBOOK,
  DEFAULT_SOCIAL_INSTAGRAM,
  resolveSocialLink,
} from '@/lib/social/public-links'
import { FooterClient } from './footer-client'
import { publicBrandFace } from '@/lib/demo/brand'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { isDemoInstance } from '@/lib/demo/instance'

export async function Footer() {
  const [settings, footerLinks, member] = await Promise.all([
    getSiteSettings(),
    getFooterLinks(),
    isMemberRequest(),
  ])
  const { getActiveBrandPack } = await import('@/lib/crm/active-trial-server')
  const { brandFaceFromTrial } = await import('@/lib/demo/brand')
  const pack = await getActiveBrandPack()
  const brand = pack ? brandFaceFromTrial(pack.brand) : publicBrandFace()
  const { isDemoRequestSurface } = await import('@/lib/crm/product-surface-server')
  const demoSurface = await isDemoRequestSurface()
  const mode = demoSurface ? 'demo' : isCommonsPlatform() ? 'commons' : 'stone-hill'
  const demo = mode === 'demo'

  return (
    <FooterClient
      presidentEmail={settings.get('presidentEmail', `president@${brand.host}`)}
      link6={member ? settings.get('announcement6thLink', '') : ''}
      link7={member ? settings.get('announcement7thLink', '') : ''}
      link8={member ? settings.get('announcement8thLink', '') : ''}
      socialFacebook={demo || mode === 'commons' ? '' : resolveSocialLink(settings.get('socialFacebook', ''), DEFAULT_SOCIAL_FACEBOOK)}
      socialInstagram={demo || mode === 'commons' ? '' : resolveSocialLink(settings.get('socialInstagram', ''), DEFAULT_SOCIAL_INSTAGRAM)}
      socialTwitter={settings.get('socialTwitter', '')}
      socialYoutube={settings.get('socialYoutube', '')}
      footerLinks={footerLinks}
      address={settings.get(
        'contactAddress',
        mode === 'stone-hill'
          ? '23415 Evergreen Ridge Drive, Ashburn, VA 20148'
          : `${brand.town}`
      )}
      brand={{
        school: brand.school,
        short: brand.short,
        pto: brand.pto,
        cheer: brand.cheer,
        town: brand.town,
        store: brand.store,
        logoPath: brand.logoPath,
      }}
      mode={mode}
    />
  )
}
