import { Button } from '@/components/ui/button'
import { Trophy, Brain, Palette, Star, BookOpen, ArrowRight } from 'lucide-react'
import { getFeaturedPrograms, type Program } from '@/lib/api/programs'
import { formatProgramSchedule } from '@/lib/programs/schedule'
import { BrandImageWash } from '@/components/brand/brand-image-wash'

// Map icon names stored in CMS category → Lucide icon
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Academic':    Trophy,
  'Arts':        Palette,
  'Strategy':    Brain,
  'STEM':        Star,
  'default':     BookOpen,
}

function iconForProgram(program: Program) {
  return CATEGORY_ICONS[program.category ?? ''] ?? CATEGORY_ICONS['default']
}

export async function ProgramsPreview() {
  const programs = await getFeaturedPrograms()

  // Fallback if CMS is empty. show placeholder cards
  const display = programs.length > 0 ? programs : []

  return (
    <section
      id="programs"
      className="scroll-mt-28 relative overflow-hidden py-20 md:py-28"
      style={{ backgroundColor: '#F5F0E8' }}
      aria-labelledby="programs-heading"
    >
      <BrandImageWash src="/home/hero-a.jpg" side="left" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: '#085508', color: 'white' }}
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
          <p className="mt-4 text-base sm:text-lg text-[#5A6070] max-w-2xl mx-auto leading-relaxed text-pretty">
            PTO-funded programs designed to challenge, inspire, and connect students
            beyond the standard curriculum.
          </p>
        </div>

        {/* Program cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {display.map((program) => {
            const Icon = iconForProgram(program)
            const tagList = program.tags
              ? program.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
              : []
            const detailPills = [
              program.grades,
              formatProgramSchedule(program) || program.schedule,
              program.detail,
            ].filter(Boolean) as string[]

            return (
              <article
                key={program._id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col"
              >
                {/* Card top accent */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: '#085508' }}
                  aria-hidden="true"
                />
                <div className="p-6 lg:p-7 flex flex-col flex-1">
                  {/* Icon + tag row */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#EEF6EE' }}
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6" style={{ color: '#085508' }} />
                    </div>
                    {(tagList[0] || program.category) && (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
                      >
                        {tagList[0] ?? program.category}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
                    {program.name}
                  </h3>

                  <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                    {program.description}
                  </p>

                  {/* Details pills */}
                  {detailPills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {detailPills.map((d) => (
                        <span
                          key={d}
                          className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#EEF6EE] text-[#5A6070]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full font-semibold text-white group"
                    style={{ backgroundColor: '#085508' }}
                    asChild
                  >
                    <a href="/programs">
                      {program.registrationOpen ? 'Register Now' : 'Learn More'}
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
            style={{ color: '#085508' }}
          >
            View all programs
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}
