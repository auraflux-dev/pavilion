import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HELP_ARTICLES } from '@/lib/help-articles'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = HELP_ARTICLES.find((a) => a.slug === slug)
  return { title: article?.title || 'Help' }
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params
  const article = HELP_ARTICLES.find((a) => a.slug === slug)
  if (!article) notFound()

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/help" className="text-sm text-[var(--accent)] hover:underline">
        All help
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl">{article.title}</h1>
      <p className="mt-8 whitespace-pre-line text-[var(--ink-muted)]">{article.body}</p>
    </div>
  )
}
