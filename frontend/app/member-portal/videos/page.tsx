import { redirect } from 'next/navigation'
import { MemberShell } from '@/components/shells/member-shell'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { MemberInlineEdit } from '@/components/site/member-inline-edit'

export const metadata = {
  title: 'Parent Videos',
  description: 'Watch short guides for the website, Member Portal, membership tiers, and board volunteering.',
}

export default function MemberPortalVideosPage() {
  if (isCommonsPlatform()) redirect('/member-portal')

  return (
    <MemberInlineEdit pageSlug="member-portal">
      <MemberShell>
        <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <ParentVideoSection
            placement="portal"
            id="parent-videos"
            eyebrow="Parent videos"
            title="Watch these short guides"
            body={vanillaizeIfDemo(
              'Made for school families (not staff training). Start with the website tour, then dig into the portal, membership tiers, or board volunteering.',
            )}
            background="transparent"
            className="!py-8 md:!py-10"
          />
        </main>
      </MemberShell>
    </MemberInlineEdit>
  )
}
