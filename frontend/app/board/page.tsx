import { VisitorChrome } from '@/components/site/visitor-chrome'
import { PageHero } from '@/components/page-hero'
import { Mail, ArrowRight, Users } from 'lucide-react'
import { getBoardMembers, type BoardMember } from '@/lib/api/board'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { getVisitorVideoStrings, visitorString } from '@/lib/api/visitor-strings'
import { VISITOR_VIDEO_DEFAULTS } from '@/lib/defaults/visitor-string-defaults'
import { BoardSectionNav } from '@/components/jump-nav/public-section-navs'
import { ParentVideoSection } from '@/components/videos/parent-video-section'
import { BoardMemberPhoto } from '@/components/board/board-member-photo'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

export const revalidate = 300 // refresh from Wix CMS every 5 minutes

export async function generateMetadata() {
  return {
    title: 'Board',
    description: vanillaizeIfDemo(
      'Meet the 2026-27 Stone Hill Middle School PTO Board, the parent volunteers who make it all happen.',
    ),
  }
}

export default async function BoardPage() {
  const [members, settings, page, videoStrings] = await Promise.all([
    getBoardMembers(),
    getSiteSettings(),
    getPageContent('board'),
    getVisitorVideoStrings(),
  ])
  const presidentEmail = settings.get('presidentEmail', 'president@shmspto.org')

  const execMembers      = members.filter((m) => m.isExec)
  const committeeMembers = members.filter((m) => !m.isExec)

  return (
    <VisitorChrome pageKey="board" mainClassName="flex-1">
        <PageHero content={page} />
        <BoardSectionNav />
        <ParentVideoSection
          videoId="board-recruit"
          id="board-video"
          eyebrow={visitorString(videoStrings, 'video.board.eyebrow', VISITOR_VIDEO_DEFAULTS['video.board.eyebrow'])}
          title={visitorString(videoStrings, 'video.board.title', VISITOR_VIDEO_DEFAULTS['video.board.title'])}
          body={visitorString(videoStrings, 'video.board.body', VISITOR_VIDEO_DEFAULTS['video.board.body'])}
          background="#FFFFFF"
        />

        {/* Executive Board */}
        {execMembers.length > 0 && (
          <section id="leadership" className="scroll-mt-28 py-14 md:py-20" style={{ backgroundColor: 'var(--brand-warm)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: 'var(--brand-green)', color: 'white' }}
                >
                  Executive Officers
                </div>
                <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                  Leadership Team
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {execMembers.map((member) => (
                  <BoardCard key={member.id} member={member} featured />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Committee Chairs */}
        {committeeMembers.length > 0 && (
          <section id="committees" className="scroll-mt-28 py-14 md:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
                >
                  Committee Chairs
                </div>
                <h2 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
                  Program &amp; Committee Leads
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {committeeMembers.map((member) => (
                  <BoardCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Join the board CTA */}
        <section id="join" className="scroll-mt-28 py-16" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-2xl p-8 md:p-12 text-center border border-[var(--border)]"
              style={{ backgroundColor: 'white' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: 'var(--brand-soft)' }}
              >
                <Users className="w-7 h-7" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
                Interested in joining the board?
              </h2>
              <p className="text-[#5A6070] mb-8 max-w-xl mx-auto leading-relaxed">
                {vanillaizeIfDemo(
                  'Board positions are open to any SHMS PTO parent or guardian. Time commitments vary by role. Most require 2 to 5 hours per month. No prior PTO experience needed.',
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/volunteer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                >
                  Volunteer with the PTO
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href={`mailto:${presidentEmail}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-colors hover:bg-[var(--brand-soft)]"
                  style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Email the President
                </a>
              </div>
            </div>
          </div>
        </section>

    </VisitorChrome>
  )
}

/** Public role → volunteer position description PDF (open seats). */
const OPEN_ROLE_PDFS: Record<string, string> = {
  'Events Coordinator': '/forms/events-coordinator.pdf',
  'Initiatives Coordinator': '/forms/initiatives-coordinator.pdf',
}

function isOpenBoardSeat(name: string | undefined | null): boolean {
  const n = (name ?? '').trim().toLowerCase()
  return !n || n === 'open' || n === 'open position'
}

function BoardCard({
  member,
  featured = false,
}: {
  member: BoardMember
  featured?: boolean
}) {
  const isOpen = isOpenBoardSeat(member.name)
  const positionPdf = OPEN_ROLE_PDFS[member.role]
  const displayName = isOpen ? 'OPEN' : member.name

  return (
    <article className={`bg-white rounded-2xl overflow-hidden shadow-sm border flex flex-col ${featured ? 'border-[var(--brand-green)]/20' : 'border-[var(--border)]'}`}>
      {/* Top accent */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: featured ? 'var(--brand-green)' : 'var(--border)' }}
        aria-hidden="true"
      />

      {/* Avatar */}
      {member.photo && !isOpen ? (
        <BoardMemberPhoto src={member.photo} alt={member.name} />
      ) : (
        <div
          className="w-full aspect-square flex items-center justify-center"
          style={{ backgroundColor: 'var(--brand-soft)' }}
        >
          <div className="relative flex flex-col items-center justify-center p-6 w-full h-full">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              {isOpen ? (
                <span className="text-white text-xs font-bold tracking-wide uppercase px-1 text-center leading-tight">
                  Open
                </span>
              ) : (
                <span className="text-white text-2xl font-bold">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Always reserve badge height so OPEN circles align with initials */}
            <span
              className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${isOpen ? '' : 'invisible'}`}
              style={{ backgroundColor: 'var(--brand-gold)', color: '#1A1A1A' }}
              aria-hidden={!isOpen}
            >
              Position Open
            </span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: 'var(--brand-green)' }}
        >
          {member.role}
        </p>
        <h3 className="font-bold text-[#1A1A1A] mb-2">{displayName}</h3>
        <p className="text-xs text-[#5A6070] leading-relaxed flex-1 mb-4 whitespace-pre-line">
          {member.bio}
        </p>
        <div className="mt-auto space-y-2">
          {positionPdf && isOpen ? (
            <a
              href={positionPdf}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
              style={{ color: 'var(--brand-green)' }}
            >
              View position description (PDF)
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          ) : null}
          {member.email && !isOpen ? (
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
              style={{ color: 'var(--brand-green)' }}
              aria-label={`Email ${member.role}`}
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              {member.email}
            </a>
          ) : null}
          {isOpen ? (
            <a
              href={`mailto:president@shmspto.org?subject=${encodeURIComponent(`Board interest: ${member.role}`)}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
              style={{ color: 'var(--brand-green)' }}
            >
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              Express interest
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
