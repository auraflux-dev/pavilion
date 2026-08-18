import { MemberShell } from '@/components/shells/member-shell'
import { KnowledgeBase } from '@/components/kb/knowledge-base'
import { PortalHelpForm } from '@/components/member-portal/portal-help-form'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { getMergedKbArticles } from '@/lib/api/kb-articles'
import { articlesByCategoryWithExtras } from '@/lib/kb'

export const metadata = {
  title: 'Member Help',
  description: 'Guides for your account, students, membership, store card, and programs.',
}

export const dynamic = 'force-dynamic'

export default async function MemberHelpIndexPage() {
  const articles = await getMergedKbArticles('member')
  const groups = articlesByCategoryWithExtras('member', articles)

  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: 'var(--brand-warm)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="mb-8">
            <PortalHelpForm />
          </div>
          <div className="mb-10">
            <ParentVideoSection
              placement="help"
              id="help-videos"
              eyebrow="Parent videos"
              title="Watch a guide"
              body="Short explainers for the website, portal, membership, and board. Full library also lives under Videos in the portal menu."
              background="transparent"
              className="!py-0"
            />
          </div>
          <KnowledgeBase
            title="Member Help"
            subtitle="Logged-in guides for parents. Full articles stay on this site. No outside knowledge base. Still stuck? Use Ask the PTO above."
            groups={groups}
            indexHref="/member-portal/help"
            articleHrefTemplate="/member-portal/help/{slug}"
          />
        </div>
      </main>
    </MemberShell>
  )
}
