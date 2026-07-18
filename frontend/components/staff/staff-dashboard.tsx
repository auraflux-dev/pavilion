'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SurveyResultsPanel } from '@/components/staff/survey-results-panel'
import { StaffRoleManager } from '@/components/staff/staff-role-manager'
import { SocialComposePanel } from '@/components/staff/social-compose-panel'
import { StaffTasksPanel } from '@/components/staff/staff-tasks-panel'
import { StaffMinutesPanel } from '@/components/staff/staff-minutes-panel'
import { StaffProgramsPanel } from '@/components/staff/staff-programs-panel'
import { StaffPaymentsPanel } from '@/components/staff/staff-payments-panel'
import { StaffEventsPanel } from '@/components/staff/staff-events-panel'
import { StaffRetailPanel } from '@/components/staff/staff-retail-panel'
import { StaffDiscountsPanel } from '@/components/staff/staff-discounts-panel'
import { StaffMembershipPanel } from '@/components/staff/staff-membership-panel'
import { StaffWorkspaceHub } from '@/components/staff/staff-workspace-hub'
import { StaffPageContentPanel } from '@/components/staff/staff-page-content-panel'
import { StaffSiteSettingsPanel } from '@/components/staff/staff-site-settings-panel'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'
import { StaffNewsletterPanel } from '@/components/staff/staff-newsletter-panel'
import { StaffShell } from '@/components/shells/staff-shell'
import { STAFF_WORKSPACE_LABEL, type StaffWorkspace } from '@/lib/audience'

type StaffHome = {
  role: string
  title: string
  owns: string
  thisWeek: string[]
}

type StaffMe = {
  email: string
  name: string
  boardTitle: string
  roles: string[]
  isAdmin: boolean
  homes: StaffHome[]
}

type MemberHit = {
  parentEmail: string
  students: {
    id: string
    firstName: string
    lastName: string
    grade: string
    membershipTier: string
    archived: boolean
  }[]
}

const WORKSPACE_IDS: StaffWorkspace[] = [
  'home',
  'projects',
  'members',
  'access',
  'social',
  'surveys',
  'messages',
  'minutes',
  'programs',
  'payments',
  'events',
  'retail',
  'discounts',
  'membership',
  'tiers',
  'inbox',
  'calendar',
  'docs',
  'content',
  'site',
  'board',
  'nav',
  'faq',
  'volunteers',
  'fundraising',
  'wellness',
  'newsletter',
  'help',
]

function parseWorkspace(raw: string | null): StaffWorkspace | null {
  if (!raw) return null
  return (WORKSPACE_IDS as string[]).includes(raw) ? (raw as StaffWorkspace) : null
}

export function StaffDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [me, setMe] = useState<StaffMe | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberHit[]>([])
  const [lookupBusy, setLookupBusy] = useState(false)
  const [actAsStatus, setActAsStatus] = useState('')

  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgEmail, setMsgEmail] = useState('')
  const [msgGrade, setMsgGrade] = useState('')
  const [msgProgram, setMsgProgram] = useState('')
  const [msgStatus, setMsgStatus] = useState('')
  const [msgBusy, setMsgBusy] = useState(false)

  useEffect(() => {
    fetch('/api/staff/me')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Not authorized')
        setMe(data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Not authorized'))
  }, [])

  const canMarketing = Boolean(me && (me.roles.includes('marketing') || me.isAdmin))
  const canSurveys = Boolean(
    me && (me.roles.includes('marketing') || me.roles.includes('secretary') || me.isAdmin),
  )
  const canMessage = Boolean(
    me &&
      (me.roles.includes('programs') ||
        me.roles.includes('instructor') ||
        me.roles.includes('secretary') ||
        me.roles.includes('membership') ||
        me.isAdmin),
  )
  const canMembership = Boolean(
    me && (me.roles.includes('membership') || me.roles.includes('secretary') || me.isAdmin),
  )
  const canMinutes = Boolean(me && (me.roles.includes('secretary') || me.isAdmin))
  const canPrograms = Boolean(
    me && (me.roles.includes('programs') || me.roles.includes('instructor') || me.isAdmin),
  )
  const canPayments = Boolean(me && (me.roles.includes('treasurer') || me.isAdmin))
  const canEvents = Boolean(
    me &&
      (me.roles.includes('events') ||
        me.roles.includes('secretary') ||
        me.roles.includes('marketing') ||
        me.isAdmin),
  )
  const canRetail = Boolean(me && (me.roles.includes('retail') || me.isAdmin))
  const canDiscounts = Boolean(
    me && (me.roles.includes('retail') || me.roles.includes('membership') || me.isAdmin),
  )
  const canContent = Boolean(
    me && (me.roles.includes('marketing') || me.roles.includes('secretary') || me.isAdmin),
  )
  const canSite = Boolean(
    me &&
      (me.isAdmin ||
        me.roles.some((r) =>
          ['marketing', 'secretary', 'membership', 'programs', 'treasurer', 'events', 'retail', 'wellness'].includes(
            r,
          ),
        )),
  )
  const canBoard = Boolean(me && (me.roles.includes('secretary') || me.isAdmin))
  const canNav = Boolean(
    me && (me.roles.includes('marketing') || me.roles.includes('secretary') || me.isAdmin),
  )
  const canFaq = Boolean(
    me &&
      (me.roles.includes('marketing') ||
        me.roles.includes('membership') ||
        me.roles.includes('secretary') ||
        me.isAdmin),
  )
  const canVolunteers = Boolean(
    me && (me.roles.includes('events') || me.roles.includes('secretary') || me.isAdmin),
  )
  const canFundraising = Boolean(
    me &&
      (me.roles.includes('programs') ||
        me.roles.includes('treasurer') ||
        me.roles.includes('marketing') ||
        me.isAdmin),
  )
  const canTiers = Boolean(
    me && (me.roles.includes('membership') || me.roles.includes('secretary') || me.isAdmin),
  )
  const canWellness = Boolean(me && (me.roles.includes('wellness') || me.roles.includes('events') || me.isAdmin))
  const canNewsletter = Boolean(
    me &&
      (me.roles.includes('marketing') ||
        me.roles.includes('secretary') ||
        me.roles.includes('membership') ||
        me.isAdmin),
  )

  const navItems = useMemo(() => {
    if (!me) return []
    const items: { id: StaffWorkspace; label: string }[] = [
      { id: 'home', label: STAFF_WORKSPACE_LABEL.home },
      { id: 'inbox', label: STAFF_WORKSPACE_LABEL.inbox },
      { id: 'calendar', label: STAFF_WORKSPACE_LABEL.calendar },
      { id: 'docs', label: STAFF_WORKSPACE_LABEL.docs },
      { id: 'projects', label: STAFF_WORKSPACE_LABEL.projects },
    ]
    if (me.isAdmin) {
      items.push(
        { id: 'members', label: STAFF_WORKSPACE_LABEL.members },
        { id: 'access', label: STAFF_WORKSPACE_LABEL.access },
      )
    }
    if (canMarketing) items.push({ id: 'social', label: STAFF_WORKSPACE_LABEL.social })
    if (canSurveys) items.push({ id: 'surveys', label: STAFF_WORKSPACE_LABEL.surveys })
    if (canMessage) items.push({ id: 'messages', label: STAFF_WORKSPACE_LABEL.messages })
    if (canMinutes) items.push({ id: 'minutes', label: STAFF_WORKSPACE_LABEL.minutes })
    if (canPrograms) items.push({ id: 'programs', label: STAFF_WORKSPACE_LABEL.programs })
    if (canPayments) items.push({ id: 'payments', label: STAFF_WORKSPACE_LABEL.payments })
    if (canEvents) items.push({ id: 'events', label: STAFF_WORKSPACE_LABEL.events })
    if (canRetail) items.push({ id: 'retail', label: STAFF_WORKSPACE_LABEL.retail })
    if (canDiscounts) items.push({ id: 'discounts', label: STAFF_WORKSPACE_LABEL.discounts })
    if (canMembership) items.push({ id: 'membership', label: STAFF_WORKSPACE_LABEL.membership })
    if (canTiers) items.push({ id: 'tiers', label: STAFF_WORKSPACE_LABEL.tiers })
    if (canContent) items.push({ id: 'content', label: STAFF_WORKSPACE_LABEL.content })
    if (canSite) items.push({ id: 'site', label: STAFF_WORKSPACE_LABEL.site })
    if (canBoard) items.push({ id: 'board', label: STAFF_WORKSPACE_LABEL.board })
    if (canNav) items.push({ id: 'nav', label: STAFF_WORKSPACE_LABEL.nav })
    if (canFaq) items.push({ id: 'faq', label: STAFF_WORKSPACE_LABEL.faq })
    if (canVolunteers) items.push({ id: 'volunteers', label: STAFF_WORKSPACE_LABEL.volunteers })
    if (canFundraising) items.push({ id: 'fundraising', label: STAFF_WORKSPACE_LABEL.fundraising })
    if (canWellness) items.push({ id: 'wellness', label: STAFF_WORKSPACE_LABEL.wellness })
    if (canNewsletter) items.push({ id: 'newsletter', label: STAFF_WORKSPACE_LABEL.newsletter })
    items.push({ id: 'help', label: STAFF_WORKSPACE_LABEL.help })
    return items
  }, [
    me,
    canMarketing,
    canSurveys,
    canMessage,
    canMinutes,
    canPrograms,
    canPayments,
    canEvents,
    canRetail,
    canDiscounts,
    canMembership,
    canTiers,
    canContent,
    canSite,
    canBoard,
    canNav,
    canFaq,
    canVolunteers,
    canFundraising,
    canWellness,
    canNewsletter,
  ])

  const active: StaffWorkspace = useMemo(() => {
    const fromUrl = parseWorkspace(searchParams.get('view'))
    if (fromUrl && navItems.some((i) => i.id === fromUrl)) return fromUrl
    return 'home'
  }, [searchParams, navItems])

  function go(id: StaffWorkspace) {
    const params = new URLSearchParams(searchParams.toString())
    if (id === 'home') params.delete('view')
    else params.set('view', id)
    const q = params.toString()
    router.replace(q ? `/staff?${q}` : '/staff', { scroll: false })
  }

  async function lookup() {
    setLookupBusy(true)
    setActAsStatus('')
    try {
      const r = await fetch(`/api/staff/members?q=${encodeURIComponent(query)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Lookup failed')
      setMembers(d.members ?? [])
    } catch (err) {
      setActAsStatus(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLookupBusy(false)
    }
  }

  async function actAs(parentEmail: string) {
    setActAsStatus('')
    const r = await fetch('/api/staff/act-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentEmail }),
    })
    const d = await r.json()
    if (!r.ok) {
      setActAsStatus(d.error ?? 'Could not act as member')
      return
    }
    window.location.href = '/member-portal'
  }

  async function setStudentArchived(studentId: string, archived: boolean) {
    if (
      archived &&
      !window.confirm(
        'Archive this student? They will be hidden from the parent portal, but all history will be preserved.',
      )
    ) {
      return
    }
    setActAsStatus('')
    try {
      const response = await fetch(`/api/staff/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Could not update student')
      setMembers((current) =>
        current.map((member) => ({
          ...member,
          students: member.students.map((student) =>
            student.id === studentId ? { ...student, archived } : student,
          ),
        })),
      )
      setActAsStatus(archived ? 'Student archived; history preserved.' : 'Student restored to the parent portal.')
    } catch (err) {
      setActAsStatus(err instanceof Error ? err.message : 'Could not update student')
    }
  }

  async function sendMessage() {
    setMsgBusy(true)
    setMsgStatus('')
    try {
      const r = await fetch('/api/staff/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: msgSubject,
          body: msgBody,
          parentEmail: msgEmail,
          grade: msgGrade,
          programName: msgProgram,
          audience: msgEmail ? 'parent' : msgGrade ? 'grade' : msgProgram ? 'program' : 'all',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setMsgStatus('Message sent to parent inbox.')
      setMsgSubject('')
      setMsgBody('')
    } catch (err) {
      setMsgStatus(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setMsgBusy(false)
    }
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Staff access required</h1>
        <p className="text-sm text-[#5A6070] mb-6">{error}</p>
        <Link href="/member-portal" className="text-sm font-bold" style={{ color: '#085508' }}>
          Back to member portal
        </Link>
      </div>
    )
  }

  if (!me) {
    return <p className="text-center py-16 text-sm text-[#5A6070]">Loading staff workspace…</p>
  }

  return (
    <StaffShell
      name={me.name}
      boardTitle={me.boardTitle}
      email={me.email}
      items={navItems}
      active={active}
      onNavigate={go}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {active === 'home' ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Home</h1>
              <p className="text-sm text-[#5A6070] mt-1">
                Roles: {me.roles.join(', ')}. Open a workspace from the top nav — only what you need for
                that job.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {navItems
                .filter((i) => i.id !== 'home')
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    className="text-left rounded-xl border border-[#E8E4DC] bg-white p-4 hover:border-[#085508] transition-colors"
                  >
                    <p className="text-sm font-bold text-[#1A1A1A]">{item.label}</p>
                    <p className="text-xs text-[#5A6070] mt-1">
                      {(
                        {
                          inbox: 'Workspace mail + reply',
                          calendar: 'Your Google Calendar',
                          docs: 'Drive Docs to read/edit',
                          projects: 'Year board, assign tasks',
                          members: 'Lookup, act-as, archive',
                          access: 'Assign @shmspto.org roles',
                          social: 'Facebook from Staff',
                          surveys: 'Create, share, review, CSV',
                          messages: 'Parent portal inbox',
                          minutes: 'Publish meeting minutes',
                          programs: 'Registration & sessions',
                          payments: 'Needs Reconciliation',
                          events: 'Upcoming + manage in Wix',
                          retail: 'Store & spirit product lists',
                          discounts: 'Named & member discount codes',
                          membership: 'Roster, email, WhatsApp groups',
                          content: 'Page heroes & marketing copy',
                          help: 'Drive how-tos',
                        } as Partial<Record<StaffWorkspace, string>>
                      )[item.id] ?? 'Open workspace'}
                    </p>
                  </button>
                ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {me.homes.map((home) => (
                <div key={home.role} className="rounded-xl border border-[#E8E4DC] bg-white p-4">
                  <h2 className="text-base font-bold text-[#1A1A1A]">{home.title}</h2>
                  <p className="text-xs text-[#5A6070] mt-1 mb-2">{home.owns}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#085508] mb-1.5">
                    This week
                  </p>
                  <ul className="space-y-1">
                    {home.thisWeek.map((item) => (
                      <li key={item} className="text-sm text-[#1A1A1A]">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {active === 'projects' ? (
          <StaffTasksPanel myRoles={me.roles} isAdmin={me.isAdmin} myEmail={me.email} />
        ) : null}

        {active === 'members' && me.isAdmin ? (
          <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
            <div>
              <h1 className="text-xl font-bold">Members</h1>
              <p className="text-xs text-[#5A6070] mt-1">
                Search parents, open their portal view, or archive / restore a student.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void lookup()
                }}
                placeholder="email or student name"
                className="flex-1 border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <Button
                onClick={() => void lookup()}
                disabled={lookupBusy}
                className="text-white"
                style={{ backgroundColor: '#085508' }}
              >
                {lookupBusy ? '…' : 'Search'}
              </Button>
            </div>
            {actAsStatus ? <p className="text-xs text-[#5A6070]">{actAsStatus}</p> : null}
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.parentEmail}
                  className="flex items-start justify-between gap-3 border-t border-[#F0EBE3] pt-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{m.parentEmail}</p>
                    <div className="mt-1 space-y-1">
                      {m.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex flex-wrap items-center gap-2 text-xs text-[#5A6070]"
                        >
                          <span className={student.archived ? 'line-through opacity-60' : ''}>
                            {student.firstName} {student.lastName} (G{student.grade})
                            {student.archived ? ' · Archived' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => void setStudentArchived(student.id, !student.archived)}
                            className="font-bold underline text-[#085508]"
                          >
                            {student.archived ? 'Restore' : 'Archive'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void actAs(m.parentEmail)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
                    style={{ backgroundColor: '#085508' }}
                  >
                    Act as
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {active === 'access' && me.isAdmin ? <StaffRoleManager /> : null}

        {active === 'social' && canMarketing ? <SocialComposePanel enabled /> : null}

        {active === 'surveys' && canSurveys ? <SurveyResultsPanel /> : null}

        {active === 'messages' && canMessage ? (
          <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
            <div>
              <h1 className="text-xl font-bold">Messages</h1>
              <p className="text-xs text-[#5A6070] mt-1">
                Appear in the parent portal inbox. Leave email blank and set grade or program to
                broadcast.
              </p>
            </div>
            <input
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              rows={4}
              placeholder="Message body"
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={msgEmail}
                onChange={(e) => setMsgEmail(e.target.value)}
                placeholder="Parent email (optional)"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={msgGrade}
                onChange={(e) => setMsgGrade(e.target.value)}
                placeholder="Grade e.g. 6"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={msgProgram}
                onChange={(e) => setMsgProgram(e.target.value)}
                placeholder="Program name"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <Button
              disabled={msgBusy || !msgSubject || !msgBody}
              onClick={() => void sendMessage()}
              className="text-white"
              style={{ backgroundColor: '#085508' }}
            >
              {msgBusy ? 'Sending…' : 'Send to inbox'}
            </Button>
            {msgStatus ? <p className="text-xs text-[#5A6070]">{msgStatus}</p> : null}
          </section>
        ) : null}

        {active === 'minutes' && canMinutes ? <StaffMinutesPanel /> : null}
        {active === 'programs' && canPrograms ? <StaffProgramsPanel /> : null}
        {active === 'payments' && canPayments ? <StaffPaymentsPanel /> : null}
        {active === 'events' && canEvents ? <StaffEventsPanel /> : null}
        {active === 'retail' && canRetail ? <StaffRetailPanel /> : null}
        {active === 'discounts' && canDiscounts ? <StaffDiscountsPanel /> : null}
        {active === 'membership' && canMembership ? <StaffMembershipPanel /> : null}
        {active === 'inbox' ? <StaffWorkspaceHub tab="inbox" /> : null}
        {active === 'calendar' ? <StaffWorkspaceHub tab="calendar" /> : null}
        {active === 'docs' ? <StaffWorkspaceHub tab="docs" /> : null}
        {active === 'content' && canContent ? <StaffPageContentPanel /> : null}
        {active === 'site' && canSite ? <StaffSiteSettingsPanel /> : null}
        {active === 'board' && canBoard ? (
          <StaffCmsCollectionPanel collection="BoardMembers" title="Board roster" />
        ) : null}
        {active === 'nav' && canNav ? (
          <StaffCmsCollectionPanel collection="NavLinks" title="Nav & footer links" />
        ) : null}
        {active === 'faq' && canFaq ? (
          <StaffCmsCollectionPanel collection="FAQItems" title="FAQs" />
        ) : null}
        {active === 'volunteers' && canVolunteers ? (
          <StaffCmsCollectionPanel collection="VolunteerOpportunities" title="Volunteer opportunities" />
        ) : null}
        {active === 'fundraising' && canFundraising ? (
          <div className="space-y-4">
            <StaffCmsCollectionPanel collection="FundraisingCTAs" title="Fundraising CTAs" />
            <StaffSiteSettingsPanel
              title="Fundraising goals (Site settings)"
              groupIds={['fundraising']}
            />
          </div>
        ) : null}
        {active === 'tiers' && canTiers ? (
          <StaffCmsCollectionPanel collection="MembershipTiers" title="Membership tiers" />
        ) : null}
        {active === 'wellness' && canWellness ? (
          <StaffSiteSettingsPanel title="Teacher & staff wellness" groupIds={['wellness']} />
        ) : null}
        {active === 'newsletter' && canNewsletter ? <StaffNewsletterPanel /> : null}
        {active === 'help' ? (
          <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-3">
            <h1 className="text-xl font-bold">Help</h1>
            <p className="text-xs text-[#5A6070]">
              Full guides: Google Drive → SHMS PTO Platform Docs. Start with{' '}
              <span className="font-semibold">30 - Staff Portal Quick Start</span>.
            </p>
            <ul className="text-sm space-y-1.5 text-[#1A1A1A]">
              <li>
                <span className="font-semibold">30</span> — Staff Portal Quick Start
              </li>
              <li>
                <span className="font-semibold">26</span> — Roles & @shmspto.org login
              </li>
              <li>
                <span className="font-semibold">29</span> — Year project board
              </li>
              {me.isAdmin ? (
                <li>
                  <span className="font-semibold">31</span> — Lookup, act-as, archive
                </li>
              ) : null}
              <li>
                <span className="font-semibold">33</span> — Inbox, Calendar & Docs (Connect Google)
              </li>
              <li>
                <span className="font-semibold">37</span> — Site capability audit & test plans
              </li>
              <li>
                <span className="font-semibold">27</span> — Helping a parent in the portal
              </li>
              <li>
                <span className="font-semibold">38</span> — Parent portal checklist (free & paid)
              </li>
              {canMessage ? (
                <li>
                  <span className="font-semibold">16</span> — Parent inbox messages
                </li>
              ) : null}
              {canMembership ? (
                <li>
                  <span className="font-semibold">34</span> — Memberships roster, mass email, WhatsApp
                </li>
              ) : null}
              {canDiscounts ? (
                <li>
                  <span className="font-semibold">36</span> — Discount codes & spirit coupons
                </li>
              ) : null}
              {canSite ? (
                <li>
                  <span className="font-semibold">Site settings / CMS lists</span> — Announcement,
                  board, nav, FAQs, volunteers, fundraising, tiers, wellness (by role)
                </li>
              ) : null}
              {canMarketing ? (
                <>
                  <li>
                    <span className="font-semibold">23–24</span> — Surveys
                  </li>
                  <li>
                    <span className="font-semibold">25</span> — Facebook from Staff
                  </li>
                </>
              ) : null}
            </ul>
          </section>
        ) : null}
      </div>
    </StaffShell>
  )
}
