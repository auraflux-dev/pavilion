'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookOpen, ChevronRight } from 'lucide-react'
import { KbArticleBody } from '@/components/kb/kb-article-body'
import { ParentVideoEmbed } from '@/components/videos/parent-video-embed'
import type { KbArticle, KbCategory } from '@/lib/kb'
import type { StaffVideo } from '@/lib/videos/staff-videos'

export type KbGroup = { category: KbCategory; articles: KbArticle[] }

type Props = {
  title: string
  subtitle: string
  groups: KbGroup[]
  indexHref: string
  /** Use `{slug}` placeholder, e.g. `/member-portal/help/{slug}` or `/staff?view=help&article={slug}` */
  articleHrefTemplate: string
  active?: KbArticle | null
  activeCategory?: KbCategory | null
  /** Optional staff training video for the active article */
  staffVideo?: StaffVideo | null
}

function hrefForArticle(template: string, slug: string) {
  return template.replaceAll('{slug}', encodeURIComponent(slug))
}

export function KnowledgeBase({
  title,
  subtitle,
  groups,
  indexHref,
  articleHrefTemplate,
  active,
  activeCategory,
  staffVideo,
}: Props) {
  const [categoryId, setCategoryId] = useState<string | 'all'>(active?.categoryId ?? 'all')

  const visibleGroups = useMemo(() => {
    if (categoryId === 'all') return groups
    return groups.filter((g) => g.category.id === categoryId)
  }, [groups, categoryId])

  if (active) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] space-y-2">
          <Link
            href={indexHref}
            className="text-xs font-semibold text-[var(--brand-green)] hover:underline inline-flex items-center gap-1"
          >
            ← All help
          </Link>
          {activeCategory ? (
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#5A6070]">
              {activeCategory.title}
            </p>
          ) : null}
          <h1 className="text-xl font-bold text-[#1A1A1A]">{active.title}</h1>
          {active.summary ? <p className="text-sm text-[#5A6070]">{active.summary}</p> : null}
        </div>
        <article className="px-5 py-5 space-y-5">
          {staffVideo ? <ParentVideoEmbed video={staffVideo} /> : null}
          <KbArticleBody body={active.body} />
        </article>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
      <header className="px-5 py-4 border-b border-[var(--border)]">
        <h1 className="text-xl font-bold text-[#1A1A1A]">{title}</h1>
        <p className="text-sm text-[#5A6070] mt-1 leading-relaxed">{subtitle}</p>
      </header>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,14rem)_1fr]">
        <nav
          aria-label="Help categories"
          className="border-b lg:border-b-0 lg:border-r border-[var(--border)] p-3 space-y-1"
        >
          <button
            type="button"
            onClick={() => setCategoryId('all')}
            className={`w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors ${
              categoryId === 'all'
                ? 'bg-[#E8F3E8] text-[var(--brand-green)] font-semibold'
                : 'hover:bg-[#F7F5F0] text-[#1A1A1A]'
            }`}
          >
            All categories
          </button>
          {groups.map(({ category }) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={`w-full text-left rounded-lg px-2.5 py-2 text-sm transition-colors ${
                categoryId === category.id
                  ? 'bg-[#E8F3E8] text-[var(--brand-green)] font-semibold'
                  : 'hover:bg-[#F7F5F0] text-[#1A1A1A]'
              }`}
            >
              <span className="font-semibold block">{category.title}</span>
              <span className="text-[11px] text-[#5A6070] leading-snug block mt-0.5">
                {category.summary}
              </span>
            </button>
          ))}
        </nav>

        <div className="p-4 sm:p-5 space-y-6">
          {visibleGroups.map(({ category, articles }) => (
            <div key={category.id} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">
                {category.title}
              </h2>
              <ul className="divide-y border border-[var(--border)] rounded-lg overflow-hidden">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={hrefForArticle(articleHrefTemplate, article.slug)}
                      className="flex items-start gap-3 px-3 py-3 hover:bg-[#F7F5F0] transition-colors"
                    >
                      <BookOpen
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: 'var(--brand-green)' }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-sm font-semibold text-[#1A1A1A] block">
                          {article.title}
                        </span>
                        <span className="text-xs text-[#5A6070] block mt-0.5">{article.summary}</span>
                      </span>
                      <ChevronRight
                        className="w-4 h-4 mt-0.5 shrink-0 text-[#5A6070]"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
