import { MemberShell } from '@/components/shells/member-shell'
import { KnowledgeBase } from '@/components/kb/knowledge-base'
import { getMergedKbArticles } from '@/lib/api/kb-articles'
import { articlesByCategoryWithExtras } from '@/lib/kb'

export const metadata = {
  title: 'Member Help | SHMS PTO',
  description: 'Guides for your account, students, membership, The Cove, and programs.',
}

export const dynamic = 'force-dynamic'

export default async function MemberHelpIndexPage() {
  const articles = await getMergedKbArticles('member')
  const groups = articlesByCategoryWithExtras('member', articles)

  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <KnowledgeBase
            title="Member Help"
            subtitle="Logged-in guides for parents. Full articles stay on this site. No outside knowledge base."
            groups={groups}
            indexHref="/member-portal/help"
            articleHrefTemplate="/member-portal/help/{slug}"
          />
        </div>
      </main>
    </MemberShell>
  )
}
