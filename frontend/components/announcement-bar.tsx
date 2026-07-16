import { getSiteSettings } from '@/lib/api/site-settings'
import { isMemberRequest } from '@/lib/is-member-request'
import { AnnouncementBarClient } from './announcement-bar-client'

export async function AnnouncementBar() {
  const settings = await getSiteSettings()

  if (!settings.getBool('announcementEnabled', true)) return null

  const text = settings.get(
    'announcementText',
    'Join your grade WhatsApp group to stay connected!'
  )
  const member = await isMemberRequest()

  // Never put WhatsApp invite URLs in anonymous HTML — members only.
  const link6 = member ? settings.get('announcement6thLink', '') : ''
  const link7 = member ? settings.get('announcement7thLink', '') : ''
  const link8 = member ? settings.get('announcement8thLink', '') : ''

  const hasGradeLinks = Boolean(link6 || link7 || link8)
  const isWhatsAppPromo = hasGradeLinks || /whatsapp/i.test(text)
  if (isWhatsAppPromo && !member) return null

  return (
    <AnnouncementBarClient
      text={text}
      link6={link6}
      link7={link7}
      link8={link8}
    />
  )
}
