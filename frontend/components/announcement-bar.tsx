import { getSiteSettings } from '@/lib/api/site-settings'
import { AnnouncementBarClient } from './announcement-bar-client'

export async function AnnouncementBar() {
  const settings = await getSiteSettings()

  if (!settings.getBool('announcementEnabled', true)) return null

  const text   = settings.get('announcementText', 'Join your grade WhatsApp group to stay connected!')
  const link6  = settings.get('announcement6thLink', '')
  const link7  = settings.get('announcement7thLink', '')
  const link8  = settings.get('announcement8thLink', '')

  return (
    <AnnouncementBarClient
      text={text}
      link6={link6}
      link7={link7}
      link8={link8}
    />
  )
}
