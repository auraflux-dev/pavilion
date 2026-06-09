import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar, Users, DollarSign, GraduationCap } from 'lucide-react'
import type { Program } from '@/lib/api/programs'

interface ProgramCardProps {
  program: Program
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  Competition:   { bg: '#FDF0F0', text: '#8B1A1A', accent: '#8B1A1A' },
  Strategy:      { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
  'Creative Arts': { bg: '#EAF5F3', text: '#2A8B7A', accent: '#2A8B7A' },
  STEM:          { bg: '#EEF2FF', text: '#3730A3', accent: '#3730A3' },
  Music:         { bg: '#FFF7ED', text: '#9A3412', accent: '#9A3412' },
  Sports:        { bg: '#F0FDF4', text: '#166534', accent: '#166534' },
  default:       { bg: '#F3F6FC', text: '#1A3A5C', accent: '#1A3A5C' },
}

function getColors(category?: string) {
  if (!category) return CATEGORY_COLORS.default
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default
}

export function ProgramCard({ program }: ProgramCardProps) {
  const colors = getColors(program.category)
  const isCheddarup = program.paymentType === 'cheddarup_installment' || program.paymentType === 'cheddarup_p2p'
  const isP2P = program.paymentType === 'cheddarup_p2p'

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {/* Top accent bar */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: colors.accent }}
        aria-hidden="true"
      />

      <div className="p-6 lg:p-7 flex flex-col flex-1">
        {/* Category tag */}
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {program.category ?? 'Enrichment'}
          </span>

          {/* Open/Closed badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              program.registrationOpen
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {program.registrationOpen ? 'Open' : 'Closed'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-3">{program.name}</h3>

        {/* Description — strip HTML from rich text */}
        {program.description && (
          <p
            className="text-sm text-[#5A6070] leading-relaxed mb-5 flex-1"
            dangerouslySetInnerHTML={{
              __html: program.description,
            }}
          />
        )}

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {program.grades && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#F3F6FC] text-[#5A6070]">
              <GraduationCap className="w-3 h-3" aria-hidden="true" />
              Grades {program.grades}
            </span>
          )}
          {program.fee != null && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#F3F6FC] text-[#5A6070]">
              <DollarSign className="w-3 h-3" aria-hidden="true" />
              {program.fee === 0 ? 'Free' : `$${program.fee}`}
            </span>
          )}
          {program.capacity != null && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-[#F3F6FC] text-[#5A6070]">
              <Users className="w-3 h-3" aria-hidden="true" />
              {program.capacity} spots
            </span>
          )}
          {isP2P && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-purple-50 text-purple-700">
              Peer Fundraiser
            </span>
          )}
          {program.paymentType === 'cheddarup_installment' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
              Installments available
            </span>
          )}
        </div>

        {/* CTA button */}
        {program.registrationOpen ? (
          isCheddarup && program.cheddarupUrl ? (
            <Button
              className="w-full font-semibold text-white group"
              style={{ backgroundColor: colors.accent }}
              asChild
            >
              <a href={program.cheddarupUrl} target="_blank" rel="noopener noreferrer">
                Register Now
                <ArrowRight
                  className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </Button>
          ) : (
            <Button
              className="w-full font-semibold text-white group"
              style={{ backgroundColor: colors.accent }}
            >
              Register Now
              <ArrowRight
                className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          )
        ) : (
          <Button
            className="w-full font-semibold group"
            variant="outline"
            disabled
          >
            Registration Closed
          </Button>
        )}
      </div>
    </article>
  )
}
