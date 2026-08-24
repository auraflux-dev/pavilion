import Link from 'next/link'
import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import {
  curriculumShareEntries,
  curriculumSharePath,
  type CurriculumShareSeason,
} from '@/lib/programs/curriculum-share'
import { getPageContent } from '@/lib/api/page-content'
import { PageThemeRoot, PageThemeStyles } from '@/components/site/page-theme'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Program curricula | SHMS PTO',
  description: 'Curriculum-only outlines for Fall 2026 and Spring 2027 enrichment. Print or share by email.',
}

const SEASON_ORDER: CurriculumShareSeason[] = ['fall-2026', 'spring-2027']

export default async function ProgramsCurriculumIndexPage() {
  const [entries, theme] = await Promise.all([
    Promise.resolve(curriculumShareEntries()),
    getPageContent('programs'),
  ])
  const bySeason = SEASON_ORDER.map((season) => ({
    season,
    label: season === 'fall-2026' ? 'Fall 2026' : 'Spring 2027',
    rows: entries.filter((e) => e.season === season),
  }))

  return (
    <PageThemeRoot pageKey="programs" className="min-h-screen flex flex-col">
      <PageThemeStyles pageKey="programs" css={theme.customCss ?? ''} />
      <div className="print:hidden">
        <AnnouncementBar />
        <Navbar />
      </div>
      <main id="main-content" className="flex-1 bg-[var(--brand-warm)] py-10 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-green)' }}>
              Share by email
            </p>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Program curricula</h1>
            <p className="mt-2 text-sm text-[#5A6070] whitespace-pre-line">
              {`Curriculum only. No registration copy.\nOpen a program, then Print / save PDF, or paste the link in your email.`}
            </p>
          </div>

          {bySeason.map(({ season, label, rows }) => (
            <section key={season}>
              <h2 className="mb-3 text-lg font-bold text-[#1A1A1A]">{label}</h2>
              <ul className="space-y-2">
                {rows.map((row) => {
                  const href = curriculumSharePath(season, row.slug)
                  return (
                    <li key={`${season}-${row.slug}`}>
                      <Link
                        href={href}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm hover:border-[var(--brand-green)]"
                      >
                        <span className="font-semibold text-[#1A1A1A]">{row.programName}</span>
                        <span className="text-[#5A6070]">
                          {row.dayOfWeek} · {row.classTime}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </PageThemeRoot>
  )
}
