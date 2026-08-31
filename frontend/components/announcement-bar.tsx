import { getSiteSettings } from '@/lib/api/site-settings'
import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { humanizePublicCopy } from '@/lib/copy/humanize-public-copy'
import { AnnouncementBarClient } from './announcement-bar-client'

/**
 * Optional site-wide banner from SiteSettings.
 * WhatsApp grade-group promo is intentionally never shown here. those links live
 * in the footer / member portal only.
 */
export async function AnnouncementBar() {
  const settings = await getSiteSettings()

  if (!settings.getBool('announcementEnabled', false)) return null

  const text = humanizePublicCopy(settings.get('announcementText', '').trim())
  if (!text) return null
  if (isCmsQaItem(text)) return null

  // WhatsApp / grade-group invites stay out of the top bar
  if (/whatsapp/i.test(text)) return null

  return <AnnouncementBarClient text={text} link6="" link7="" link8="" />
}
