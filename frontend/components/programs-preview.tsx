import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { getFeaturedPrograms } from '@/lib/api/programs'
import { getPageContent } from '@/lib/api/page-content'
import { displayProgramName } from '@/lib/programs/display-name'
import { programPublicPath } from '@/lib/programs/public-path'
import { programDateBadge } from '@/lib/programs/schedule'

import { BrandImageWash } from '@/components/brand/brand-image-wash'

export async function ProgramsPreview() {
  const [programs, page] = await Promise.all([
    getFeaturedPrograms(),
    getPageContent('programs').catch(() => null),
  ])

  // Fallback if CMS is empty. show placeholder cards
  const display = programs.length > 0 ? programs : []
  const sectionBlurb =
    String(page?.sectionBody || page?.body || '').trim() ||
    'After-school enrichment for students.'

  return (
    <section
      id="programs"
      className="scroll-mt-28 relative overflow-hidden py-20 md:py-28"
      style={{ backgroundColor: 'var(--brand-warm)' }}
      aria-labelledby="programs-heading"
    >
      <BrandImageWash src="/home/hero-a.jpg" side="left" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: 'var(--brand-green)', color: 'white' }}
          >
            Student enrichment
          </div>
          <h2
            id="programs-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance"
            style={{ color: '#1A1A1A' }}
          >
            Enrichment programs
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5A6070] max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
            {sectionBlurb}
            {'\n'}
            <a href="/programs/fall-2026" className="font-semibold underline" style={{ color: 'var(--brand-green)' }}>
              Full schedule
            </a>
          </p>
        </div>

        {/* Program cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {display.map((program) => {
            const summary = String(program.description ?? '')
              .split(/<br\s*\/?>/i)[0]
              .replace(/<[^>]+>/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/\s+/g, ' ')
              .trim()
            const badge = programDateBadge(program.startDate)
            const whenShort = [program.dayOfWeek, program.classTime]
              .map((s) => String(s ?? '').trim())
              .filter(Boolean)
              .join(' · ')
            const fee = Number(program.fee ?? 0)
            const detailPills = [
              program.grades ? `Grades ${program.grades}` : null,
              whenShort || null,
              fee > 0 ? `$${fee}` : null,
            ].filter(Boolean) as string[]

            return (
              <article
                key={program._id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col border border-[var(--border)]"
              >
                <div className="p-5 lg:p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {badge ? (
                      <div
                        className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0"
                        style={{ backgroundColor: 'var(--brand-green)' }}
                        aria-label={`${badge.month} ${badge.day}`}
                      >
                        <span className="text-white/80 text-xs font-bold uppercase tracking-wider leading-none">
                          {badge.month}
                        </span>
                        <span className="text-white text-2xl font-bold leading-tight">{badge.day}</span>
                      </div>
                    ) : null}
                    {program.category ? (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
                      >
                        {program.category}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-lg font-bold text-[#1A1A1A] leading-snug mb-2">
                    <a href={programPublicPath(program)} className="hover:opacity-80">
                      {displayProgramName(program.name)}
                    </a>
                  </h3>

                  {summary ? (
                    <p className="text-sm text-[#5A6070] leading-snug mb-4 flex-1 line-clamp-2">
                      {summary}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {detailPills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {detailPills.map((d) => (
                        <span
                          key={d}
                          className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--brand-soft)] text-[#5A6070]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full font-semibold text-white group"
                    style={{ backgroundColor: 'var(--brand-green)' }}
                    asChild
                  >
                    <a href={programPublicPath(program)}>
                      Learn more
                      <ArrowRight
                        className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </a>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>

        {/* View all link */}
        <div className="text-center mt-10">
          <a
            href="/programs"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:underline underline-offset-4 transition-colors"
            style={{ color: 'var(--brand-green)' }}
          >
            View all programs
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
