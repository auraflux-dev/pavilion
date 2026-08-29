import { PageHero } from '@/components/page-hero'
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { getMeetingsByCommittee } from '@/lib/api/meetings'
import { getPageContent } from '@/lib/api/page-content'
import { MeetingMonthFilter } from '@/components/meetings/meeting-month-filter'
import { MeetingsSectionNav } from '@/components/jump-nav/public-section-navs'
import { Users } from 'lucide-react'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { MEMBERSHIP_CHOOSE_PATH } from '@/lib/membership-links'
import { getPageSections } from '@/lib/api/page-sections'
import { PageSectionsRenderer } from '@/components/cms/page-sections-renderer'

export const revalidate = 300

const COMMITTEES = [
  {
    key: 'SEAC' as const,
    label: 'SEAC',
    full: 'Special Education Advisory Council',
    description: 'Advisory body ensuring students with disabilities receive a free, appropriate public education.',
  },
  {
    key: 'MSAAC' as const,
    label: 'MSAAC',
    full: 'Minority Student Achievement Advisory Council',
    description: 'Advancing equity and closing achievement gaps for all students.',
  },
  {
    key: 'LEAF' as const,
    label: 'LEAF',
    full: 'Learning Enrichment Activities Fund',
    description: 'Supporting student enrichment, field experiences, and extracurricular learning opportunities.',
  },
]

export default async function MeetingsPage() {
  const composed = await getPageSections('meetings')
  if (composed?.length) {
    return (
      <VisitorChrome pageKey="meetings">
        <PageSectionsRenderer sections={composed} />
      </VisitorChrome>
    )
  }

  const [page, ptoMeetings, seacMeetings, msaacMeetings, leafMeetings] = await Promise.all([
    getPageContent('meetings'),
    getMeetingsByCommittee('PTO').catch(() => []),
    getMeetingsByCommittee('SEAC').catch(() => []),
    getMeetingsByCommittee('MSAAC').catch(() => []),
    getMeetingsByCommittee('LEAF').catch(() => []),
  ])

  const pto = ptoMeetings
  const committeeData = {
    SEAC: seacMeetings,
    MSAAC: msaacMeetings,
    LEAF: leafMeetings,
  }

  return (
    <VisitorChrome pageKey="meetings">
        <PageHero content={page} />
        <MeetingsSectionNav />

        {/* PTO Section */}
        <section id="pto" className="scroll-mt-28 py-16 md:py-20" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A]">PTO Meetings</h2>
                <p className="text-sm text-[#5A6070]">Parent Teacher Organization</p>
              </div>
            </div>
            <p className="text-sm text-[#5A6070] mb-8 ml-[52px]">
              {vanillaizeIfDemo(
                'Open to all SHMS PTO families. Upcoming meetings include a join link. All minutes are published after each meeting.',
              )}
            </p>
            <MeetingMonthFilter meetings={pto} showJoinLink />
          </div>
        </section>

        {/* Committee sections. Loudoun SEAC/MSAAC/LEAF stay off the elementary demo. */}
        {!isDemoInstance() ? (
        <section id="committees" className="scroll-mt-28 py-16 md:py-20 bg-white border-t border-[var(--border)]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">Advisory Committees</h2>
              <p className="text-[#5A6070] max-w-xl mx-auto">
                Committee representatives publish summaries and key takeaways after each meeting.
              </p>
            </div>

            {COMMITTEES.map((c) => (
              <div key={c.key}>
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: 'var(--brand-soft)' }}
                  >
                    <span className="text-xs font-bold" style={{ color: 'var(--brand-green)' }}>
                      {c.key.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A1A]">{c.label}</h3>
                    <p className="text-sm font-medium text-[var(--brand-green)]">{c.full}</p>
                  </div>
                </div>
                <p className="text-sm text-[#5A6070] mb-6 ml-[52px]">{c.description}</p>
                <MeetingMonthFilter meetings={committeeData[c.key]} />
              </div>
            ))}
          </div>
        </section>
        ) : null}

        {/* Stay updated CTA */}
        <section id="join" className="scroll-mt-28 py-14 border-t border-[var(--border)]" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
              Get notified when minutes are published
            </h2>
            <p className="text-[#5A6070] mb-6 max-w-xl mx-auto text-sm">
              {vanillaizeIfDemo(
                'SHMS PTO members receive an email when new meeting minutes are posted. You can opt out anytime from your member profile.',
              )}
            </p>
            <a
              href={MEMBERSHIP_CHOOSE_PATH}
              className="inline-flex items-center gap-2 font-semibold text-white px-6 py-3 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Join the PTO
            </a>
          </div>
        </section>
    </VisitorChrome>
  )
}
