'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { staffCanWorkspace } from '@/lib/staff/permissions'
import { SurveyResultsPanel } from '@/components/staff/survey-results-panel'
import { StaffRoleManager } from '@/components/staff/staff-role-manager'
import { SocialComposePanel } from '@/components/staff/social-compose-panel'
import { StaffTasksPanel } from '@/components/staff/staff-tasks-panel'
import { StaffMinutesPanel } from '@/components/staff/staff-minutes-panel'
import { StaffProgramsPanel } from '@/components/staff/staff-programs-panel'
import { StaffReportsPanel } from '@/components/staff/staff-reports-panel'
import { StaffPaymentsPanel } from '@/components/staff/staff-payments-panel'
import { StaffCommonsConnectorsPanel } from '@/components/staff/staff-commons-connectors-panel'
import { isPavilionProductPlatformPublic } from '@/lib/crm/platform-env'
import { StaffBudgetPanel } from '@/components/staff/staff-budget-panel'
import {
  STAFF_FILTER_CARD,
  STAFF_FILTER_CARD_TITLE,
  STAFF_FILTER_INPUT,
  STAFF_FILTER_LABEL,
  STAFF_FILTER_SELECT,
} from '@/lib/staff/staff-filter-ui'
import { StaffEventsPanel } from '@/components/staff/staff-events-panel'
import { StaffSignupsPanel } from '@/components/staff/staff-signups-panel'
import { StaffCoveStockAdmin, StaffRetailPanel } from '@/components/staff/staff-retail-panel'
import { StaffDiscountsPanel } from '@/components/staff/staff-discounts-panel'
import { StaffMembershipPanel } from '@/components/staff/staff-membership-panel'
import { StaffFulfillmentsPanel } from '@/components/staff/staff-fulfillments-panel'
import { StaffStorePickupsPanel } from '@/components/staff/staff-store-pickups-panel'
import { StaffSpiritWearDemandPanel } from '@/components/staff/staff-spirit-wear-demand-panel'
import {
  StaffDiscountsSectionNav,
  StaffEventsSectionNav,
  StaffExpensesSectionNav,
  StaffFundraisingSectionNav,
  StaffMembershipSectionNav,
  StaffRetailSectionNav,
} from '@/components/staff/staff-section-navs'
import { StaffWorkspaceHub } from '@/components/staff/staff-workspace-hub'
import { StaffPageContentPanel } from '@/components/staff/staff-page-content-panel'
import { StaffPageSectionsPanel } from '@/components/staff/staff-page-sections-panel'
import { StaffSiteBrandPanel } from '@/components/staff/staff-site-brand-panel'
import { StaffPageThemePanel } from '@/components/staff/staff-page-theme-panel'
import { StaffSiteSettingsPanel } from '@/components/staff/staff-site-settings-panel'
import { StaffMembershipShirtDesignsPanel } from '@/components/staff/staff-membership-shirt-designs-panel'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'
import { StaffVolunteerSubmissionsPanel } from '@/components/staff/staff-volunteer-submissions-panel'
import { StaffReveal } from '@/components/staff/staff-reveal'
import { StaffNewsletterPanel } from '@/components/staff/staff-newsletter-panel'
import { StaffNewsletterSendReportPanel } from '@/components/staff/staff-newsletter-send-report'
import { StaffCommsCalendarPanel } from '@/components/staff/staff-comms-calendar-panel'
import { StaffOnboardingPanel } from '@/components/staff/staff-onboarding-panel'
import { StaffWalkthroughNotice } from '@/components/staff/staff-walkthrough-notice'
import { StaffCanvaPanel } from '@/components/staff/staff-canva-panel'
import { displayMembershipTier, vanillaizeIfDemo } from '@/lib/demo/brand'
import { StaffWhatsAppQueuePanel } from '@/components/staff/staff-whatsapp-queue-panel'
import { StaffExpensesPanel } from '@/components/staff/staff-expenses-panel'
import { StaffTimesheetsPanel } from '@/components/staff/staff-timesheets-panel'
import { StaffHelpPanel } from '@/components/staff/staff-help-panel'
import { StaffSyncFreshnessChip } from '@/components/staff/staff-sync-freshness-chip'
import { StaffPersonalEmailPanel } from '@/components/staff/staff-personal-email-panel'
import { StaffShell } from '@/components/shells/staff-shell'
import { StaffTrialBanner } from '@/components/staff/staff-trial-banner'
import { StaffCustomDomainPanel } from '@/components/staff/staff-custom-domain-panel'
import { filterCommonsDemoWorkspaces, filterHiddenStaffWorkspaces } from '@/lib/demo/commons-surface'
import { useLiveCommerceGate } from '@/lib/demo/commons-surface-context'
import { type StaffWorkspace } from '@/lib/audience'
import {
  resolveStaffWorkspaceGroups,
  staffCopy as staffStr,
  staffWorkspaceLabel,
} from '@/lib/api/staff-portal-copy-shared'
import { STAFF_PORTAL_DEFAULTS } from '@/lib/defaults/staff-portal-defaults'
import {
  STAFF_WORKSPACE_BLURB,
  STAFF_WORKSPACE_GROUPS,
  groupStaffNavItems,
} from '@/lib/staff/workspace-groups'
import { trackLogin } from '@/lib/ga'

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
  extraWorkspaces?: string[]
  personalEmail?: string
  isAdmin: boolean
  /** Pavilion platform owner: can switch customer CMS orgs */
  platformOwner?: boolean
  homes: StaffHome[]
}

type MemberHit = {
  parentEmail: string
  parentFirstName?: string
  parentLastName?: string
  accountNumber?: string
  membershipTier?: string
  accountType?: 'free' | 'paid'
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
  'budget',
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
  'comms',
  'canva',
  'expenses',
  'timesheets',
  'reports',
  'help',
  'signups',
]

function parseWorkspace(raw: string | null): StaffWorkspace | null {
  if (!raw) return null
  return (WORKSPACE_IDS as string[]).includes(raw) ? (raw as StaffWorkspace) : null
}

export function StaffDashboard({ staffCopy = STAFF_PORTAL_DEFAULTS }: { staffCopy?: Record<string, string> }) {
  const wsLabel = (id: StaffWorkspace) => staffWorkspaceLabel(staffCopy, id)
  const sc = (key: string, fallback?: string) => staffStr(staffCopy, key, fallback)
  const workspaceGroups = useMemo(() => resolveStaffWorkspaceGroups(staffCopy), [staffCopy])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [me, setMe] = useState<StaffMe | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [memberSort, setMemberSort] = useState<'email' | 'name'>('email')
  const [memberTier, setMemberTier] = useState<'all' | 'paid' | 'free'>('all')
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
  const [activityItems, setActivityItems] = useState<
    { id: string; label: string; count: number; href: string; tone: 'info' | 'warn' }[]
  >([])
  const [platformOrgs, setPlatformOrgs] = useState<
    { id: string; name: string; slug: string; plan: string }[]
  >([])
  const [cmsOrgId, setCmsOrgId] = useState('')
  const [cmsOrgBusy, setCmsOrgBusy] = useState(false)

  useEffect(() => {
    fetch('/api/staff/me')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Not authorized')
        setMe(data)
        trackLogin('staff', 'staff')
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Not authorized'))
  }, [])

  useEffect(() => {
    if (!me) return
    fetch('/api/staff/activity')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) return
        setActivityItems(Array.isArray(data.items) ? data.items : [])
      })
      .catch(() => null)
  }, [me])

  useEffect(() => {
    if (!me?.platformOwner) return
    fetch('/api/staff/platform/orgs')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) return
        setPlatformOrgs(Array.isArray(data.organizations) ? data.organizations : [])
        setCmsOrgId(String(data.selectedOrganizationId ?? ''))
      })
      .catch(() => null)
  }, [me?.platformOwner])

  async function selectCmsOrg(organizationId: string) {
    setCmsOrgBusy(true)
    try {
      const r = await fetch('/api/staff/platform/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? 'Could not switch organization')
      setCmsOrgId(organizationId)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch organization')
    } finally {
      setCmsOrgBusy(false)
    }
  }

  const canMarketing = staffCanWorkspace(me, 'social')
  const canSurveys = staffCanWorkspace(me, 'surveys')
  const canMessage = staffCanWorkspace(me, 'messages')
  const canMembership = staffCanWorkspace(me, 'membership')
  const canMinutes = staffCanWorkspace(me, 'minutes')
  const canPrograms = staffCanWorkspace(me, 'programs')
  const canTimesheets = staffCanWorkspace(me, 'timesheets')
  const canPayments = staffCanWorkspace(me, 'payments')
  const canEvents = staffCanWorkspace(me, 'events')
  const canSignups = staffCanWorkspace(me, 'signups')
  const canRetail = staffCanWorkspace(me, 'retail')
  const canDiscounts = staffCanWorkspace(me, 'discounts')
  const canContent = staffCanWorkspace(me, 'content')
  const canPages = staffCanWorkspace(me, 'pages')
  const canBrand = staffCanWorkspace(me, 'brand')
  const canPageTheme = staffCanWorkspace(me, 'pagetheme')
  const canSite = staffCanWorkspace(me, 'site')
  const canBoard = staffCanWorkspace(me, 'board')
  const canNav = staffCanWorkspace(me, 'nav')
  const canFaq = staffCanWorkspace(me, 'faq')
  const canVolunteers = staffCanWorkspace(me, 'volunteers')
  const canFundraising = staffCanWorkspace(me, 'fundraising')
  const canTiers = staffCanWorkspace(me, 'tiers')
  const canWellness = staffCanWorkspace(me, 'wellness')
  const canNewsletter = staffCanWorkspace(me, 'newsletter')
  const canComms = staffCanWorkspace(me, 'comms')
  const { hiddenStaffWorkspaces } = useLiveCommerceGate()

  const navItems = useMemo(() => {
    if (!me) return []
    const items: { id: StaffWorkspace; label: string }[] = [
      { id: 'home', label: wsLabel('home') },
      { id: 'inbox', label: wsLabel('inbox') },
      { id: 'calendar', label: wsLabel('calendar') },
      { id: 'docs', label: wsLabel('docs') },
      { id: 'projects', label: wsLabel('projects') },
      { id: 'expenses', label: wsLabel('expenses') },
    ]
    if (me.isAdmin) {
      items.push({ id: 'members', label: wsLabel('members') })
    }
    if (staffCanWorkspace(me, 'access')) {
      items.push({ id: 'access', label: wsLabel('access') })
    }
    if (canMarketing) items.push({ id: 'social', label: wsLabel('social') })
    if (canSurveys) items.push({ id: 'surveys', label: wsLabel('surveys') })
    if (canMessage) items.push({ id: 'messages', label: wsLabel('messages') })
    if (canMinutes) items.push({ id: 'minutes', label: wsLabel('minutes') })
    if (canPrograms) items.push({ id: 'programs', label: wsLabel('programs') })
    if (canTimesheets) items.push({ id: 'timesheets', label: wsLabel('timesheets') })
    if (canPayments) items.push({ id: 'payments', label: wsLabel('payments') })
    if (canPayments) items.push({ id: 'budget', label: wsLabel('budget') })
    if (canEvents) items.push({ id: 'events', label: wsLabel('events') })
    if (canSignups) items.push({ id: 'signups', label: wsLabel('signups') })
    if (canRetail) items.push({ id: 'retail', label: wsLabel('retail') })
    if (canDiscounts) items.push({ id: 'discounts', label: wsLabel('discounts') })
    if (canMembership) items.push({ id: 'membership', label: wsLabel('membership') })
    if (canTiers) items.push({ id: 'tiers', label: wsLabel('tiers') })
    if (canContent) items.push({ id: 'content', label: wsLabel('content') })
    if (canPages) items.push({ id: 'pages', label: wsLabel('pages') })
    if (canBrand) items.push({ id: 'brand', label: wsLabel('brand') })
    if (canPageTheme) items.push({ id: 'pagetheme', label: wsLabel('pagetheme') })
    if (canSite) items.push({ id: 'site', label: wsLabel('site') })
    if (canBoard) items.push({ id: 'board', label: wsLabel('board') })
    if (canNav) items.push({ id: 'nav', label: wsLabel('nav') })
    if (canFaq) items.push({ id: 'faq', label: wsLabel('faq') })
    if (canVolunteers) items.push({ id: 'volunteers', label: wsLabel('volunteers') })
    if (canFundraising) items.push({ id: 'fundraising', label: wsLabel('fundraising') })
    if (canWellness) items.push({ id: 'wellness', label: wsLabel('wellness') })
    if (canComms) items.push({ id: 'comms', label: wsLabel('comms') })
    if (canMarketing) items.push({ id: 'canva', label: wsLabel('canva') })
    if (canNewsletter) items.push({ id: 'newsletter', label: wsLabel('newsletter') })
    if (staffCanWorkspace(me, 'reports')) {
      items.push({ id: 'reports', label: wsLabel('reports') })
    }
    items.push({ id: 'help', label: wsLabel('help') })
    const demoFiltered = filterCommonsDemoWorkspaces(items.map((i) => i.id))
    const allowed = new Set(filterHiddenStaffWorkspaces(demoFiltered, hiddenStaffWorkspaces))
    const filtered = items.filter((i) => allowed.has(i.id))
    const order = new Map<StaffWorkspace, number>()
    let rank = 0
    order.set('home', rank++)
    for (const group of STAFF_WORKSPACE_GROUPS) {
      for (const id of group.workspaces) {
        if (!order.has(id)) order.set(id, rank++)
      }
    }
    return filtered.sort(
      (a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999),
    )
  }, [
    me,
    hiddenStaffWorkspaces,
    canMarketing,
    canSurveys,
    canMessage,
    canMinutes,
    canPrograms,
    canTimesheets,
    canPayments,
    canEvents,
    canSignups,
    canRetail,
    canDiscounts,
    canMembership,
    canTiers,
    canContent,
    canPages,
    canBrand,
    canPageTheme,
    canSite,
    canBoard,
    canNav,
    canFaq,
    canVolunteers,
    canFundraising,
    canWellness,
    canComms,
    canNewsletter,
    staffCopy,
  ])

  const active: StaffWorkspace = useMemo(() => {
    if (searchParams.get('oauth_state_id')) return 'budget'
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

  async function loadMembers(opts?: {
    q?: string
    sort?: 'email' | 'name'
    tier?: 'all' | 'paid' | 'free'
  }) {
    setLookupBusy(true)
    setActAsStatus('')
    try {
      const params = new URLSearchParams({
        sort: opts?.sort ?? memberSort,
        tier: opts?.tier ?? memberTier,
      })
      const q = (opts?.q ?? query).trim()
      if (q) params.set('q', q)
      const r = await fetch(`/api/staff/members?${params}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load members')
      setMembers(d.members ?? [])
    } catch (err) {
      setActAsStatus(err instanceof Error ? err.message : 'Could not load members')
    } finally {
      setLookupBusy(false)
    }
  }

  useEffect(() => {
    if (!me?.isAdmin || active !== 'members') return
    void fetch('/api/staff/members/account-numbers/setup', { method: 'POST' }).catch(() => null)
    void loadMembers({ q: query, sort: memberSort, tier: memberTier })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open Members / sort·tier change; text filter is manual
  }, [me?.isAdmin, active, memberSort, memberTier])

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
      !window.confirm(staffStr(staffCopy, 'dashboard.archiveConfirm'))
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
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">{staffStr(staffCopy, 'dashboard.accessRequired')}</h1>
        <p className="text-sm text-[#5A6070] mb-6">{vanillaizeIfDemo(error)}</p>
        <Link href="/member-portal" className="text-sm font-bold" style={{ color: 'var(--brand-green)' }}>
          {staffStr(staffCopy, 'dashboard.backToPortal')}
        </Link>
      </div>
    )
  }

  if (!me) {
    return <p className="text-center py-16 text-sm text-[#5A6070]">{staffStr(staffCopy, 'dashboard.loading')}</p>
  }

  return (
    <StaffShell
      name={me.name}
      boardTitle={me.boardTitle}
      email={me.email}
      items={navItems}
      active={active}
      onNavigate={go}
      shellCopy={staffCopy}
      workspaceGroups={workspaceGroups}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StaffTrialBanner />
        {me.platformOwner && platformOrgs.length > 0 ? (
          <section className="rounded-xl border border-[var(--border)] bg-[#F7F8FA] px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A]">Pavilion platform CMS</p>
              <p className="text-xs text-[#5A6070] whitespace-pre-line">
                You own all customer CMS accounts.
                Pick a school to edit their Staff site content.
              </p>
            </div>
            <label className="text-[11px] text-[#5A6070] flex items-center gap-2">
              Customer
              <select
                value={cmsOrgId}
                disabled={cmsOrgBusy}
                onChange={(e) => void selectCmsOrg(e.target.value)}
                className="border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[#1A1A1A] bg-white min-w-[12rem]"
              >
                {platformOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.plan ? ` (${o.plan})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}
        {active === 'home' ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">{staffStr(staffCopy, 'dashboard.homeTitle')}</h1>
              <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
                {isPavilionProductPlatformPublic()
                  ? `Private trial staff for your school.\nPick an area below, or use the top nav.\nStart with Membership, Events, or Site.`
                  : `Roles: ${me.roles.join(', ')}.\nStaff login: ${me.email}.\nPick an area below, or use the top nav.\nOnly what you need for that job.}`}
              </p>
              {isPavilionProductPlatformPublic() ? null : (
                <div className="mt-3">
                  <StaffSyncFreshnessChip />
                </div>
              )}
            </div>
            {isPavilionProductPlatformPublic() ? null : (
              <>
                <StaffPersonalEmailPanel
                  initialEmail={me.personalEmail ?? ''}
                  onSaved={(email) =>
                    setMe((current) => (current ? { ...current, personalEmail: email } : current))
                  }
                />
                <StaffWalkthroughNotice roles={me.roles} email={me.email} />
                <StaffOnboardingPanel onOpenWorkspace={go} />
              </>
            )}
            {activityItems.length > 0 ? (
              <div className="rounded-xl border border-[var(--brand-green)]/25 bg-[#E8F3E8] p-4 space-y-2">
                <p className="text-sm font-bold text-[var(--brand-green)]">{sc('dashboard.needsAttention')}</p>
                <ul className="space-y-1.5">
                  {activityItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          const view = new URL(item.href, 'https://www.shmspto.org').searchParams.get(
                            'view',
                          )
                          if (view) go(view as StaffWorkspace)
                          else router.push(item.href)
                        }}
                        className="w-full text-left text-sm text-[#1A1A1A] hover:underline flex items-center justify-between gap-3"
                      >
                        <span>{item.label}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            item.tone === 'warn'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-white text-[var(--brand-green)]'
                          }`}
                        >
                          {item.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="space-y-6">
              {groupStaffNavItems(navItems).map(({ group, items }) => (
                <div key={group.id} className="space-y-2">
                  <div>
                    <h2 className="text-sm font-bold text-[#1A1A1A]">{group.label}</h2>
                    <p className="text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">{group.blurb}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(item.id)}
                        className="text-left rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 hover:border-[var(--brand-green)] transition-colors"
                      >
                        <p className="text-sm font-bold text-[#1A1A1A]">
                          {vanillaizeIfDemo(item.label)}
                        </p>
                        <p className="text-xs text-[#5A6070] mt-0.5">
                          {vanillaizeIfDemo(sc(`blurb.${item.id}`, STAFF_WORKSPACE_BLURB[item.id] ?? 'Open workspace'))}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {me.homes.map((home) => (
                <div key={home.role} className="rounded-xl border border-[var(--border)] bg-white p-4">
                  <h2 className="text-base font-bold text-[#1A1A1A]">{vanillaizeIfDemo(home.title)}</h2>
                  <p className="text-xs text-[#5A6070] mt-1 mb-2">{vanillaizeIfDemo(home.owns)}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-green)] mb-1.5">
                    {sc('dashboard.thisWeek')}
                  </p>
                  <ul className="space-y-1">
                    {home.thisWeek.map((item) => (
                      <li key={item} className="text-sm text-[#1A1A1A]">
                        • {vanillaizeIfDemo(item)}
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
          <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
            <div>
              <h1 className="text-xl font-bold">{sc('members.title')}</h1>
              <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
                {sc('members.body')}
              </p>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
              <div className={`flex-1 ${STAFF_FILTER_CARD}`}>
                <p className={STAFF_FILTER_CARD_TITLE}>{sc('members.searchTitle')}</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                  <label className={STAFF_FILTER_LABEL}>
                    {sc('members.lookupLabel')}
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void loadMembers()
                      }}
                      placeholder={sc('dashboard.searchPlaceholder')}
                      autoComplete="off"
                      name="staff-members-lookup"
                      className={STAFF_FILTER_INPUT}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void loadMembers()}
                      disabled={lookupBusy}
                      className="text-white h-10 px-5"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                    >
                      {lookupBusy ? '…' : sc('dashboard.search')}
                    </Button>
                    <Button
                      onClick={() => {
                        setQuery('')
                        setMemberTier('all')
                        void loadMembers({ q: '', sort: memberSort, tier: 'all' })
                      }}
                      disabled={lookupBusy}
                      variant="outline"
                      className="h-10"
                    >
                      {sc('dashboard.clear')}
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-[#5A6070]">
                  {lookupBusy
                    ? 'Loading…'
                    : `${members.length} parent${members.length === 1 ? '' : 's'}${
                        memberTier === 'paid'
                          ? ' · paid only'
                          : memberTier === 'free'
                            ? ' · free only'
                            : ''
                      }`}
                  {actAsStatus ? ` · ${actAsStatus}` : ''}
                </p>
              </div>
              <div className="xl:w-48 shrink-0 space-y-3">
                <div className={STAFF_FILTER_CARD}>
                  <label className={STAFF_FILTER_LABEL}>
                    Filter
                    <select
                      value={memberTier}
                      onChange={(e) => {
                        const v = e.target.value
                        setMemberTier(v === 'paid' || v === 'free' ? v : 'all')
                      }}
                      className={STAFF_FILTER_SELECT}
                      aria-label="Filter paid or free"
                    >
                      <option value="all">{sc('dashboard.filterAll')}</option>
                      <option value="paid">{sc('dashboard.filterPaid')}</option>
                      <option value="free">{sc('dashboard.filterFree')}</option>
                    </select>
                  </label>
                </div>
                <div className={STAFF_FILTER_CARD}>
                  <label className={STAFF_FILTER_LABEL}>
                    Sort
                    <select
                      value={memberSort}
                      onChange={(e) => setMemberSort(e.target.value === 'name' ? 'name' : 'email')}
                      className={STAFF_FILTER_SELECT}
                      aria-label="Sort members"
                    >
                      <option value="email">{sc('dashboard.filterByEmail')}</option>
                      <option value="name">{sc('dashboard.filterByName')}</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {members.map((m) => {
                const parentName = `${m.parentFirstName ?? ''} ${m.parentLastName ?? ''}`.trim()
                return (
                  <div
                    key={m.parentEmail}
                    className="flex items-start justify-between gap-3 border-t border-[#F0EBE3] pt-2"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {m.accountNumber ? (
                          <span className="tabular-nums">{m.accountNumber}</span>
                        ) : null}
                        {m.accountNumber ? ' · ' : ''}
                        {parentName || m.parentEmail}
                      </p>
                      <p className="text-xs text-[#5A6070]">
                        {m.parentEmail}
                        {m.accountType || m.membershipTier
                          ? ` · ${m.accountType === 'paid' ? 'Paid' : 'Free'}${m.membershipTier ? ` · ${displayMembershipTier(m.membershipTier)}` : ''}`
                          : ''}
                      </p>
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
                              className="font-bold underline text-[var(--brand-green)]"
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
                      style={{ backgroundColor: 'var(--brand-green)' }}
                    >
                      Act as
                    </button>
                  </div>
                )
              })}
              {!lookupBusy && members.length === 0 ? (
                <p className="text-sm text-[#5A6070] py-4">No members match.</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {active === 'access' && staffCanWorkspace(me, 'access') ? <StaffRoleManager /> : null}

        {active === 'social' && canMarketing ? (
          <div className="space-y-4">
            <SocialComposePanel enabled />
            <StaffReveal
              storageKey="staff-reveal-social-urls"
              id="social-urls"
              title="Public social URLs & publish flags"
              hint="Footer links and Wix account IDs — not day-to-day posting"
            >
              <StaffSiteSettingsPanel
                title="Public social URLs"
                groupIds={['social']}
                sectionId="social-urls"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}

        {active === 'surveys' && canSurveys ? <SurveyResultsPanel /> : null}

        {active === 'messages' && canMessage ? (
          <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
            <div>
              <h1 className="text-xl font-bold">{sc('messages.title')}</h1>
              <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
                {sc('messages.body')}
              </p>
            </div>
            <input
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              placeholder={sc('messages.subjectPlaceholder')}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              rows={4}
              placeholder={sc('messages.bodyPlaceholder')}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid sm:grid-cols-3 gap-2">
              <input
                value={msgEmail}
                onChange={(e) => setMsgEmail(e.target.value)}
                placeholder={sc('messages.emailPlaceholder')}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={msgGrade}
                onChange={(e) => setMsgGrade(e.target.value)}
                placeholder={sc('messages.gradePlaceholder')}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={msgProgram}
                onChange={(e) => setMsgProgram(e.target.value)}
                placeholder={sc('messages.programPlaceholder')}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <Button
              disabled={msgBusy || !msgSubject || !msgBody}
              onClick={() => void sendMessage()}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              {msgBusy ? sc('messages.sending') : sc('messages.sendInbox')}
            </Button>
            {msgStatus ? <p className="text-xs text-[#5A6070]">{msgStatus}</p> : null}
          </section>
        ) : null}

        {active === 'minutes' && canMinutes ? <StaffMinutesPanel /> : null}
        {active === 'programs' && canPrograms ? (
          <div className="space-y-4">
            <StaffProgramsPanel />
            <StaffReveal
              storageKey="staff-reveal-programs-settings"
              title="Enrichment program settings"
              hint="Publish EP meeting nights to parents — occasional"
            >
              <StaffSiteSettingsPanel
                title="Enrichment program settings"
                groupIds={['programs']}
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'timesheets' && canTimesheets ? <StaffTimesheetsPanel /> : null}
        {active === 'payments' && canPayments ? (
          <div className="space-y-4">
            {isPavilionProductPlatformPublic() ? (
              <StaffCommonsConnectorsPanel />
            ) : null}
            <StaffPaymentsPanel isAdmin={Boolean(me?.isAdmin)} />
          </div>
        ) : null}
        {active === 'budget' && canPayments ? <StaffBudgetPanel /> : null}
        {active === 'reports' ? (
          <StaffReportsPanel
            allowedFocuses={[
              ...(canPrograms || me?.isAdmin ? (['programs'] as const) : []),
              ...(canRetail || me?.isAdmin || canPayments ? (['cove'] as const) : []),
              ...(canPayments || me?.isAdmin ? (['payments'] as const) : []),
              ...(canMembership || me?.isAdmin || canPayments ? (['membership'] as const) : []),
              ...(canEvents || me?.isAdmin || canPayments ? (['events'] as const) : []),
            ]}
          />
        ) : null}
        {active === 'events' && canEvents ? (
          <div className="space-y-4">
            <StaffEventsSectionNav />
            <StaffEventsPanel />
            <StaffSpiritWearDemandPanel context="events" />
            <StaffReveal
              storageKey="staff-reveal-portal-calendar"
              id="portal-calendar-events"
              title="Portal calendar events"
              hint="Member portal calendar rows — not day-of event ops"
            >
              <StaffCmsCollectionPanel
                collection="PortalCalendarEvents"
                title="Portal calendar events (member portal)"
                sectionId="portal-calendar-events"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'signups' && canSignups ? <StaffSignupsPanel /> : null}
        {active === 'retail' && canRetail ? (
          <div className="space-y-4">
            <StaffRetailSectionNav />
            <StaffRetailPanel />
            <StaffStorePickupsPanel />
            <StaffSpiritWearDemandPanel />
            <StaffCoveStockAdmin />
            <StaffReveal
              storageKey="staff-reveal-cove-card"
              id="cove-digital-card"
              title="Cove Digital Card settings"
              hint="Bonus %, presets, min/max load — change rarely"
            >
              <StaffSiteSettingsPanel
                title="Cove Digital Card"
                groupIds={['cove-card']}
                sectionId="cove-digital-card"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'discounts' && canDiscounts ? (
          <div className="space-y-4">
            <StaffDiscountsSectionNav />
            <StaffDiscountsPanel />
          </div>
        ) : null}
        {active === 'membership' && canMembership ? (
          <div className="space-y-4">
            <StaffMembershipSectionNav />
            <StaffMembershipPanel />
            <StaffFulfillmentsPanel />
            <StaffReveal
              storageKey="staff-reveal-membership-copy"
              id="membership-shared-benefits"
              title="Shared benefits copy"
              hint="Join-page shared benefits list — edit when copy changes"
            >
              <StaffSiteSettingsPanel
                title="Membership shared benefits"
                groupIds={['membership']}
                sectionId="membership-shared-benefits"
                bare
              />
            </StaffReveal>
            <StaffReveal
              storageKey="staff-reveal-membership-shirt"
              id="membership-perk-tee"
              title="Perk tee & shirt designs"
              hint="Product ID, design×size stock — not daily fulfillments"
            >
              <div className="space-y-4">
                <StaffSiteSettingsPanel
                  title="Membership perk tee"
                  groupIds={['membership-shirt']}
                  sectionId="membership-perk-tee"
                  bare
                />
                <StaffMembershipShirtDesignsPanel />
              </div>
            </StaffReveal>
          </div>
        ) : null}
        {active === 'inbox' ? <StaffWorkspaceHub tab="inbox" /> : null}
        {active === 'calendar' ? <StaffWorkspaceHub tab="calendar" /> : null}
        {active === 'docs' ? <StaffWorkspaceHub tab="docs" /> : null}
        {active === 'pages' && canPages ? <StaffPageSectionsPanel /> : null}
        {active === 'brand' && canBrand ? <StaffSiteBrandPanel /> : null}
        {active === 'content' && canContent ? (
          <div className="space-y-4">
            <StaffPageContentPanel />
            <StaffReveal
              storageKey="staff-reveal-content-announcement"
              id="content-announcement"
              title="Announcement bar & WhatsApp links"
              hint="Site-wide banner and grade WhatsApp invites"
            >
              <StaffSiteSettingsPanel
                title="Announcement bar & WhatsApp grade links"
                groupIds={['announcement']}
                sectionId="content-announcement"
                bare
              />
            </StaffReveal>
            <StaffReveal
              storageKey="staff-reveal-content-home"
              id="content-home"
              title="Home hero stats & images"
              hint="Visitor home numbers and photos"
            >
              <StaffSiteSettingsPanel
                title="Home hero stats & images"
                groupIds={['home']}
                sectionId="content-home"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'pagetheme' && canPageTheme ? <StaffPageThemePanel /> : null}
        {active === 'site' && canSite ? (
          <div className="space-y-4">
            <StaffSiteSettingsPanel />
            <StaffReveal
              storageKey="staff-reveal-custom-domain"
              title="Custom domain / DNS"
              hint="Point pto.yourschool.org off the trial host — rare"
            >
              <StaffCustomDomainPanel />
            </StaffReveal>
          </div>
        ) : null}
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
          <div className="space-y-4">
            <StaffVolunteerSubmissionsPanel />
            <StaffCmsCollectionPanel collection="VolunteerOpportunities" title="Volunteer opportunities" />
            <StaffReveal
              storageKey="staff-reveal-volunteer-benefits"
              id="volunteer-benefits"
              title="Volunteer page benefits copy"
              hint="Bullet list on the public volunteer page"
            >
              <StaffSiteSettingsPanel
                title="Volunteer page benefits"
                groupIds={['volunteer']}
                sectionId="volunteer-benefits"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'fundraising' && canFundraising ? (
          <div className="space-y-4">
            <StaffFundraisingSectionNav />
            <StaffCmsCollectionPanel
              collection="FundraisingCTAs"
              title="Fundraising CTAs"
              sectionId="fundraising-ctas"
            />
            <StaffCmsCollectionPanel
              collection="Sponsors"
              title="Sponsors (public list)"
              sectionId="fundraising-sponsors"
            />
            <StaffReveal
              storageKey="staff-reveal-fundraising-goals"
              id="fundraising-goals"
              title="Fundraising goals & hours"
              hint="Internal dollar/hour targets — not CTAs or sponsors"
            >
              <StaffSiteSettingsPanel
                title="Fundraising goals (Site settings)"
                groupIds={['fundraising']}
                sectionId="fundraising-goals"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'tiers' && canTiers ? (
          <StaffCmsCollectionPanel collection="MembershipTiers" title="Membership tiers" />
        ) : null}
        {active === 'wellness' && canWellness ? (
          <StaffSiteSettingsPanel title="Teacher & staff wellness" groupIds={['wellness']} />
        ) : null}
        {active === 'comms' && canComms ? (
          <StaffCommsCalendarPanel onOpenWorkspace={(id) => go(id as StaffWorkspace)} />
        ) : null}
        {active === 'canva' && canMarketing ? (
          <StaffCanvaPanel onOpenWorkspace={(id) => go(id as StaffWorkspace)} />
        ) : null}
        {active === 'newsletter' && canNewsletter ? (
          <div className="space-y-4">
            <StaffWhatsAppQueuePanel />
            <StaffNewsletterPanel />
            <StaffNewsletterSendReportPanel />
            <StaffReveal
              storageKey="staff-reveal-newsletter-archive"
              id="newsletter-archive"
              title="Newsletter archive → portal Messages"
              hint="Published archive rows for the member portal"
            >
              <StaffCmsCollectionPanel
                collection="Newsletters"
                title="Newsletter archive → portal Messages"
                sectionId="newsletter-archive"
                bare
              />
            </StaffReveal>
          </div>
        ) : null}
        {active === 'expenses' ? (
          <div className="space-y-4">
            <StaffExpensesSectionNav />
            <StaffExpensesPanel />
          </div>
        ) : null}
        {active === 'help' ? (
          <StaffHelpPanel
            isAdmin={me.isAdmin}
            canMessage={canMessage}
            canMembership={canMembership}
            canDiscounts={canDiscounts}
            canSite={canSite}
            canMarketing={canMarketing}
            canRetail={canRetail}
            canEditKb={canFaq}
          />
        ) : null}
      </div>
    </StaffShell>
  )
}
