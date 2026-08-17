import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { PageHero } from '@/components/page-hero'
import { Mail, ArrowRight, Users } from 'lucide-react'
import Image from 'next/image'
import { getBoardMembers, type BoardMember } from '@/lib/api/board'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { BoardSectionNav } from '@/components/jump-nav/public-section-navs'
import { ParentVideoSection } from '@/components/videos/parent-video-section'

export const revalidate = 300 // refresh from Wix CMS every 5 minutes

export const metadata = {
  title: 'Board Members | SHMS PTO',
  description: 'Meet the 2025-26 Stone Hill Middle School PTO Board, the parent volunteers who make it all happen.',
}

export default async function BoardPage() {
  const [members, settings, page] = await Promise.all([
    getBoardMembers(),
    getSiteSettings(),
    getPageContent('board'),
  ])
  const presidentEmail = settings.get('presidentEmail', 'president@shmspto.org')

  const execMembers      = members.filter((m) => m.isExec)
  const committeeMembers = members.filter((m) => !m.isExec)

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content" className="flex-1">
        <PageHero content={page} />
        <BoardSectionNav />
        <ParentVideoSection
          videoId="board-recruit"
          id="board-video"
          eyebrow="Watch"
          title="Thinking about joining the board?"
          body="A short look at why parents volunteer and how to get involved."
          background="#FFFFFF"
        />

        {/* Executive Board */}
        {execMembers.length > 0 && (
          <section id="leadership" className="scroll-mt-28 py-14 md:py-20" style={{ backgroundColor: '#F5F0E8' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div
                  className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: '#085508', color: 'white' }}
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
                  style={{ backgroundColor: '#EEF6EE', color: '#085508' }}
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
        <section id="join" className="scroll-mt-28 py-16" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className="rounded-2xl p-8 md:p-12 text-center border border-[#E8E4DC]"
              style={{ backgroundColor: 'white' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: '#EEF6EE' }}
              >
                <Users className="w-7 h-7" style={{ color: '#085508' }} aria-hidden="true" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
                Interested in joining the board?
              </h2>
              <p className="text-[#5A6070] mb-8 max-w-xl mx-auto leading-relaxed">
                Board positions are open to any SHMS PTO parent or guardian. Time commitments
                vary by role. Most require 2 to 5 hours per month. No prior PTO experience needed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/volunteer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#085508' }}
                >
                  Volunteer with the PTO
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href={`mailto:${presidentEmail}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-colors hover:bg-[#EEF6EE]"
                  style={{ borderColor: '#085508', color: '#085508' }}
                >
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  Email the President
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
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

function isSecretaryPhoto(member: BoardMember) {
  return (
    member.role.trim().toLowerCase() === 'secretary' ||
    member.name.toLowerCase().includes('madhusudhan')
  )
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
  const secretaryPhoto = isSecretaryPhoto(member)

  return (
    <article className={`bg-white rounded-2xl overflow-hidden shadow-sm border flex flex-col ${featured ? 'border-[#085508]/20' : 'border-[#E8E4DC]'}`}>
      {/* Top accent */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: featured ? '#085508' : '#E8E4DC' }}
        aria-hidden="true"
      />

      {/* Avatar */}
      <div
        className="w-full aspect-square flex items-start justify-center overflow-hidden"
        style={{ backgroundColor: secretaryPhoto ? '#E1DBC5' : '#EEF6EE' }}
      >
        {member.photo && !isOpen ? (
          <Image
            src={member.photo}
            alt={member.name}
            width={200}
            height={200}
            className={
              secretaryPhoto
                ? 'w-[80%] h-[80%] object-cover object-top mt-[16%]'
                : 'w-full h-full object-cover'
            }
          />
        ) : (
          <div className="relative flex flex-col items-center justify-center p-6 w-full h-full">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#085508' }}
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
              style={{ backgroundColor: '#FFD700', color: '#1A1A1A' }}
              aria-hidden={!isOpen}
            >
              Position Open
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p
          className="text-xs font-bold tracking-widest uppercase mb-1"
          style={{ color: '#085508' }}
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
              style={{ color: '#085508' }}
            >
              View position description (PDF)
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          ) : null}
          {member.email && !isOpen ? (
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
              style={{ color: '#085508' }}
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
              style={{ color: '#085508' }}
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
