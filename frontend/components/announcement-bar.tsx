import { getSiteSettings } from '@/lib/api/site-settings'
import { isMemberRequest } from '@/lib/is-member-request'
import { AnnouncementBarClient } from './announcement-bar-client'

/**
 * Optional site-wide banner from SiteSettings.
 * WhatsApp grade-group promo is intentionally never shown here — those links live
 * in the footer / member portal only.
 */
export async function AnnouncementBar() {
  const settings = await getSiteSettings()

  if (!settings.getBool('announcementEnabled', false)) return null

  const text = settings.get('announcementText', '').trim()
  if (!text) return null

  // WhatsApp / grade-group invites stay out of the top bar
  if (/whatsapp/i.test(text)) return null

  const member = await isMemberRequest()
  const link6 = member ? settings.get('announcement6thLink', '') : ''
  const link7 = member ? settings.get('announcement7thLink', '') : ''
  const link8 = member ? settings.get('announcement8thLink', '') : ''
  if (link6 || link7 || link8) return null

  return (
    <AnnouncementBarClient text={text} link6="" link7="" link8="" />
  )
}
