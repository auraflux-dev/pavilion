import { MemberShell } from '@/components/shells/member-shell'
import { ParentVideoSection } from '@/components/videos/parent-video-section'

export const metadata = {
  title: 'Parent Videos',
  description: 'Watch short guides for the website, Member Portal, membership tiers, and board volunteering.',
}

import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { redirect } from 'next/navigation'

export default function MemberPortalVideosPage() {
  if (isCommonsPlatform()) redirect('/member-portal')

  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <ParentVideoSection
          placement="portal"
          id="parent-videos"
          eyebrow="Parent videos"
          title="Watch these short guides"
          body="Made for SHMS families (not staff training). Start with the website tour, then dig into the portal, membership tiers, or board volunteering."
          background="transparent"
          className="!py-8 md:!py-10"
        />
      </main>
    </MemberShell>
  )
}
