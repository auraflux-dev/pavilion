import { Button } from '@/components/ui/button'
import { Trophy, Brain, Palette, ArrowRight } from 'lucide-react'

const programs = [
  {
    icon: Trophy,
    iconColor: '#8B1A1A',
    iconBg: '#FDF0F0',
    title: 'NOVA Math Tournament',
    tag: 'Competition',
    tagColor: '#8B1A1A',
    tagBg: '#FDF0F0',
    description:
      'Students compete in the Northern Virginia Math Tournament, sharpening problem-solving skills and representing SHMS with pride. Open to all grade levels — no prior competition experience required.',
    details: ['Grades 6–8', 'Fall & Spring', 'Weekly Practice'],
  },
  {
    icon: Brain,
    iconColor: '#085508',
    iconBg: '#EEF6EE',
    title: 'Chess Club',
    tag: 'Strategy',
    tagColor: '#085508',
    tagBg: '#EEF6EE',
    description:
      'Develop critical thinking and strategic planning through the timeless game of chess. Students of all skill levels welcome — from beginners to experienced players looking to improve their game.',
    details: ['All Skill Levels', 'After School', 'Tues & Thurs'],
  },
  {
    icon: Palette,
    iconColor: '#2A8B7A',
    iconBg: '#EAF5F3',
    title: 'Art Club',
    tag: 'Creative Arts',
    tagColor: '#2A8B7A',
    tagBg: '#EAF5F3',
    description:
      'Explore painting, drawing, sculpture, and mixed media in a fun, supportive environment. Student work is displayed throughout the school and featured at our annual Spring Art Show.',
    details: ['Grades 6–8', 'Wednesday', 'Supplies Provided'],
  },
]

export function ProgramsPreview() {
  return (
    <section
      id="programs"
      className="py-20 md:py-28"
      style={{ backgroundColor: '#F5F0E8' }}
      aria-labelledby="programs-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <div
            className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: '#085508', color: 'white' }}
          >
            Student Enrichment
          </div>
          <h2
            id="programs-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance"
            style={{ color: '#1A1A1A' }}
          >
            Enrichment Programs
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#5A6070] max-w-2xl mx-auto leading-relaxed text-pretty">
            PTO-funded programs designed to challenge, inspire, and connect students
            beyond the standard curriculum.
          </p>
        </div>

        {/* Program cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {programs.map((program) => {
            const Icon = program.icon
            return (
              <article
                key={program.title}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col"
              >
                {/* Card top accent */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: program.iconColor }}
                  aria-hidden="true"
                />
                <div className="p-6 lg:p-7 flex flex-col flex-1">
                  {/* Icon + tag row */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: program.iconBg }}
                      aria-hidden="true"
                    >
                      <Icon className="w-6 h-6" style={{ color: program.iconColor }} />
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: program.tagBg, color: program.tagColor }}
                    >
                      {program.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">
                    {program.title}
                  </h3>

                  <p className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1">
                    {program.description}
                  </p>

                  {/* Details pills */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {program.details.map((detail) => (
                      <span
                        key={detail}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#F3F6FC] text-[#5A6070]"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>

                  <Button
                    className="w-full font-semibold text-white group"
                    style={{ backgroundColor: program.iconColor }}
                    asChild
                  >
                    <a href="/programs">
                      Register Now
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
