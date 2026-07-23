import { notFound } from 'next/navigation'
import { MemberShell } from '@/components/shells/member-shell'
import { KnowledgeBase } from '@/components/kb/knowledge-base'
import { articlesByCategory, getArticle, getCategory, listArticles } from '@/lib/kb'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const article = getArticle('member', slug)
  if (!article) return { title: 'Help | SHMS PTO' }
  return {
    title: `${article.title} | Member Help`,
    description: article.summary,
  }
}

export default async function MemberHelpArticlePage({ params }: Props) {
  const { slug } = await params
  const article = getArticle('member', slug)
  if (!article) notFound()

  const category = getCategory('member', article.categoryId)
  const groups = articlesByCategory('member')

  return (
    <MemberShell>
      <main id="main-content" className="flex-1" style={{ backgroundColor: '#F5F0E8' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <KnowledgeBase
            title="Member Help"
            subtitle=""
            groups={groups}
            indexHref="/member-portal/help"
            articleHref={(s) => `/member-portal/help/${s}`}
            active={article}
            activeCategory={category}
          />
        </div>
      </main>
    </MemberShell>
  )
}
