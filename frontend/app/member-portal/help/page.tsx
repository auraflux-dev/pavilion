import { MemberShell } from '@/components/shells/member-shell'
import { KnowledgeBase } from '@/components/kb/knowledge-base'
import { articlesByCategory } from '@/lib/kb'

export const metadata = {
  title: 'Member Help | SHMS PTO',
  description: 'Guides for your account, students, membership, The Cove, and programs.',
}

export const dynamic = 'force-dynamic'

export default function MemberHelpIndexPage() {
  const groups = articlesByCategory('member')

  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <KnowledgeBase
            title="Member Help"
            subtitle="Logged-in guides for parents. Full articles stay on this site — no outside knowledge base."
            groups={groups}
            indexHref="/member-portal/help"
            articleHref={(slug) => `/member-portal/help/${slug}`}
          />
        </div>
      </main>
    </MemberShell>
  )
}
