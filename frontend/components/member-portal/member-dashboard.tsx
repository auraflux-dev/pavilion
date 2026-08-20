'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LogOut,
  Loader2,
  RefreshCw,
  MessageCircle,
  User,
  Users,
  CreditCard,
  CalendarDays,
  Mail,
  ArrowRight,
  ShoppingBag,
  Star,
  HelpCircle,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createVisitorClient } from '@/lib/wix-oauth-client'
import {
  PORTAL_COPY_DEFAULTS,
  type PortalCopy,
} from '@/lib/defaults/portal-copy'
import { displayMembershipTier, vanillaizeIfDemo } from '@/lib/demo/brand'
import { hideLiveCommerceUi } from '@/lib/demo/commons-surface'
import { pickHighestTier, tierRank } from '@/lib/staff/members-roster'
import { StudentCard } from './student-card'
import { AddStudentForm } from './add-student-form'
import { EditAccountForm } from './edit-account-form'
import { PortalQuadrant } from './portal-quadrant'
import { PortalSectionNav } from './portal-section-nav'
import { PortalSurveys } from './portal-surveys'
import { StoreCardReload } from './store-card-reload'
import { CoveFamilyCodeCard } from './cove-family-code-card'
import { MembershipBenefitsCard } from './membership-benefits-card'
import {
  CoveFeatureLockBanner,
  OnboardingChecklist,
} from './onboarding-checklist'
import { ConfirmFamilyDetailsForm } from './confirm-family-details-form'
import { PortalBusinessOwnerForm } from './portal-business-owner-form'
import { PortalHelpForm } from '@/components/member-portal/portal-help-form'
import { InviteCoParentPanel } from './invite-co-parent-panel'
import {
  buildOnboardingChecklist,
  coveFeaturesUnlocked,
} from '@/lib/onboarding-checklist'

interface MemberData {
  member: {
    id: string
    name: string
    email: string
    profileImage: string | null
    memberSince: string | null
    firstName?: string
    lastName?: string
    phone?: string
  }
  accountType?: 'free' | 'paid'
}

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  discountCode: string | null
  storeCardBalance: number
  parentPhone?: string
  emergencyContact?: string
  emergencyPhone?: string
  allergies?: string
  medicalConditions?: string
  medications?: string
  pickupAuthorized?: string
  parentFirstName?: string
  parentLastName?: string
  familyProfileConfirmedAt?: string
}

interface CalendarItem {
  id: string
  kind: 'program' | 'event'
  title: string
  subtitle: string
  whenLabel: string
  href: string
  studentNames: string[]
}

interface MessageItem {
  id: string
  fromName: string
  subject: string
  body: string
  programName: string
  studentName: string
  sentAt: string | null
}

interface PurchaseItem {
  id: string
  label: string
  amount: number
  status: string
  date: string | null
  studentName: string
  detail?: string
}

interface Props {
  link6?: string
  link7?: string
  link8?: string
  grades?: string[]
  copy?: PortalCopy
}

function fmtMoney(n: number) {
  return `$${Number(n).toFixed(2)}`
}

function fmtShortDate(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

const MESSAGES_SEEN_KEY = 'shmspto.portal.messagesSeenAt'

function readMessagesSeenAt(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(MESSAGES_SEEN_KEY)
  const n = raw ? Date.parse(raw) : NaN
  return Number.isFinite(n) ? n : 0
}

function markMessagesSeen() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MESSAGES_SEEN_KEY, new Date().toISOString())
}

export function MemberDashboard({
  link6 = '',
  link7 = '',
  link8 = '',
  grades = ['6', '7', '8'],
  copy = PORTAL_COPY_DEFAULTS,
}: Props) {
  const [member, setMember] = useState<MemberData['member'] | null>(null)
  const [accountType, setAccountType] = useState<'free' | 'paid'>('free')
  const [students, setStudents] = useState<Student[]>([])
  const [calendar, setCalendar] = useState<CalendarItem[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')
  const [familyTab, setFamilyTab] = useState<'calendar' | 'messages'>('calendar')
  const [messagesSeenAt, setMessagesSeenAt] = useState(0)
  const [dismissedActivity, setDismissedActivity] = useState(false)
  const [membershipSuccessNudge, setMembershipSuccessNudge] = useState(false)

  async function load() {
    setStatus('loading')
    try {
      const [meRes, studentsRes, familyRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/students'),
        fetch('/api/portal/family'),
      ])
      if (!meRes.ok) throw new Error('auth')
      const meData = await meRes.json()
      const studentsData = studentsRes.ok ? await studentsRes.json() : { students: [] }
      const familyData = familyRes.ok
        ? await familyRes.json()
        : { calendar: [], messages: [], purchases: [] }

      setMember(meData.member)
      setAccountType(meData.accountType === 'paid' ? 'paid' : 'free')
      setStudents(studentsData.students ?? [])
      setCalendar(familyData.calendar ?? [])
      setMessages(familyData.messages ?? [])
      setPurchases(familyData.purchases ?? [])
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => {
    setMessagesSeenAt(readMessagesSeenAt())
    load()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('membership') !== 'success') return
    setMembershipSuccessNudge(true)
    params.delete('membership')
    const qs = params.toString()
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
    )
  }, [])

  // #store scrolls here; Help opens /member-portal/help.
  useEffect(() => {
    if (status !== 'ok') return
    const id = window.location.hash.replace(/^#/, '')
    if (!id || id === 'help') return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [status])

  const newMessageCount = useMemo(() => {
    // No prior visit recorded yet. Do not treat the whole inbox as "new".
    if (!messagesSeenAt) return 0
    return messages.filter((m) => {
      if (!m.sentAt) return false
      const t = Date.parse(m.sentAt)
      return Number.isFinite(t) && t > messagesSeenAt
    }).length
  }, [messages, messagesSeenAt])

  useEffect(() => {
    if (messagesSeenAt) return
    if (status !== 'ok') return
    // Baseline "seen" on first portal open after this feature ships.
    markMessagesSeen()
    setMessagesSeenAt(Date.now())
  }, [messagesSeenAt, status])

  function openMessages() {
    setFamilyTab('messages')
    markMessagesSeen()
    setMessagesSeenAt(Date.now())
    setDismissedActivity(true)
    document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (familyTab !== 'messages') return
    markMessagesSeen()
    setMessagesSeenAt(Date.now())
  }, [familyTab])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      const client = createVisitorClient()
      const { logoutUrl } = await client.auth.logout(window.location.href)
      window.location.href = logoutUrl
    } catch {
      window.location.href = '/'
    }
  }

  function handleStudentAdded(student: Student) {
    setStudents((prev) => [...prev, student])
    load()
  }

  function handleStudentUpdated(student: Student) {
    setStudents((prev) => prev.map((s) => (s.id === student.id ? student : s)))
  }

  function handleMemberUpdated(name: string) {
    setMember((prev) => (prev ? { ...prev, name } : prev))
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-green)' }} />
      </div>
    )
  }

  if (status === 'error' || !member) {
    return (
      <div className="text-center py-24">
        <p className="text-[#5A6070] mb-4">{copy.loadError}</p>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const gradeLinks = [
    { grade: '6th', href: link6 },
    { grade: '7th', href: link7 },
    { grade: '8th', href: link8 },
  ].filter((g) => g.href)

  const storeBalanceTotal = students.reduce(
    (max, s) => Math.max(max, Number(s.storeCardBalance) || 0),
    0
  )
  const paidStudents = students.filter(
    (s) => s.membershipTier && s.membershipTier !== 'free'
  ).length
  const householdTier = pickHighestTier(students.map((s) => s.membershipTier))
  const householdTierRank = tierRank(householdTier)
  const tierDisplay = displayMembershipTier(householdTier)
  const accountBannerTitle =
    accountType === 'paid' && householdTierRank > 0
      ? `${tierDisplay} membership active`
      : accountType === 'paid'
        ? copy.paidTitle
        : copy.freeTitle
  const accountBannerBody =
    accountType === 'paid' && householdTier === 'reef'
      ? `Thanks for supporting SHMS PTO.
You're on Reef. Benefits show on each student card below.
Upgrade to Lagoon or Tide anytime for more perks.`
      : accountType === 'paid' && householdTier === 'lagoon'
        ? `Thanks for supporting SHMS PTO.
You're on Lagoon. Benefits show on each student card below.
Upgrade to Tide anytime for more perks.`
        : accountType === 'paid' && householdTier === 'tide'
          ? `Thanks for supporting SHMS PTO.
You're on Tide. Benefits show on each student card below.`
          : accountType === 'paid'
            ? copy.paidBody
            : copy.freeBody
  const membershipCtaHref = '/membership'
  const membershipCtaLabel =
    accountType === 'free'
      ? copy.viewMemberships
      : householdTier === 'reef'
        ? 'Upgrade to Lagoon or Tide'
        : householdTier === 'lagoon'
          ? 'Upgrade to Tide'
          : null

  const onboarding = buildOnboardingChecklist({ students, accountType })
  const coveGate = coveFeaturesUnlocked(students)
  const highlightChecklist =
    membershipSuccessNudge || !onboarding.complete || accountType === 'paid'
  const showConfirmFamily = students.length > 0 && !coveGate.ok

  return (
    <div className="space-y-4">
      <PortalSectionNav />

      {membershipSuccessNudge ? (
        <div className="rounded-xl border border-[var(--brand-line)] bg-[#E8F3E8] px-4 py-3 flex flex-wrap items-start justify-between gap-3">
          <div>
 <p className="text-sm font-bold text-[var(--brand-green)]">Membership confirmed. Thank you!</p>
            <p className="text-xs text-[#1A1A1A]/80 mt-0.5 leading-relaxed">
              {onboarding.complete
                ? vanillaizeIfDemo('Your Cove Digital Card and perks are ready below.')
                : vanillaizeIfDemo(
                    'Finish confirming your family details so Cove Digital Card credit and your QR attach to your students.',
                  )}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-[#5A6070] underline shrink-0"
            onClick={() => setMembershipSuccessNudge(false)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <OnboardingChecklist
        items={onboarding.items}
        requiredDone={onboarding.requiredDone}
        requiredTotal={onboarding.requiredTotal}
        complete={onboarding.complete}
        coveUnlocked={onboarding.coveUnlocked}
        highlight={Boolean(highlightChecklist && !onboarding.complete)}
        onJumpStudents={() => setMembershipSuccessNudge(false)}
      />

      {showConfirmFamily ? (
        <ConfirmFamilyDetailsForm
          key={`confirm-${students.map((s) => s.id).join('-')}`}
          students={students}
          member={member}
          onConfirmed={({ students: next, member: nextMember }) => {
            setStudents(next as Student[])
            if (nextMember && member) {
              setMember({
                ...member,
                name: nextMember.name,
                firstName: nextMember.firstName,
                lastName: nextMember.lastName,
                phone: nextMember.phone,
              })
            }
          }}
        />
      ) : null}
      {!dismissedActivity && newMessageCount > 0 ? (
        <div className="rounded-xl border border-[var(--brand-green)]/30 bg-[#E8F3E8] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[var(--brand-green)]" aria-hidden />
            <div>
              <p className="text-sm font-bold text-[var(--brand-green)]">
                {newMessageCount === 1
                  ? 'You have a new message'
                  : `You have ${newMessageCount} new messages`}
              </p>
              <p className="text-xs text-[#1A1A1A]/80 mt-0.5">
                Purchase confirmations, class notes, and PTO updates land here.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
              onClick={openMessages}
            >
              View messages
            </Button>
            <button
              type="button"
              className="text-xs font-semibold text-[#5A6070] underline"
              onClick={() => setDismissedActivity(true)}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* 2×2 quadrants. D (calendar/messages) first on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* D. Calendar & Messages (priority) */}
        <PortalQuadrant
          id="calendar"
          title={copy.calendarTitle}
          icon={CalendarDays}
          className="order-1 lg:order-4 lg:col-start-2 lg:row-start-2"
          action={
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs font-bold">
              <button
                type="button"
                onClick={() => setFamilyTab('calendar')}
                className={`px-2.5 py-1.5 ${
                  familyTab === 'calendar' ? 'text-white' : 'text-[#5A6070] bg-white'
                }`}
                style={
                  familyTab === 'calendar' ? { backgroundColor: 'var(--brand-green)' } : undefined
                }
              >
                {copy.tabCalendar}
              </button>
              <button
                type="button"
                onClick={() => setFamilyTab('messages')}
                className={`px-2.5 py-1.5 border-l border-[var(--border)] ${
                  familyTab === 'messages' ? 'text-white' : 'text-[#5A6070] bg-white'
                }`}
                style={
                  familyTab === 'messages' ? { backgroundColor: 'var(--brand-green)' } : undefined
                }
              >
                {copy.tabMessages}
                {newMessageCount > 0 ? (
                  <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {newMessageCount}
                  </span>
                ) : messages.length > 0 ? (
                  <span className="ml-1 opacity-80">({messages.length})</span>
                ) : null}
              </button>
            </div>
          }
        >
          {familyTab === 'calendar' ? (
            calendar.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <CalendarDays className="w-8 h-8 mb-2 text-[#C4C0B8]" />
                <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
                  {copy.calendarEmptyTitle}
                </p>
                <p className="text-xs text-[#5A6070] max-w-xs mb-4">
                  {copy.calendarEmptyBody}
                </p>
                <a
                  href="/programs"
                  className="inline-flex items-center gap-1.5 text-sm font-bold"
                  style={{ color: 'var(--brand-green)' }}
                >
                  {copy.calendarEmptyCta} <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <ul className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                {calendar.map((item) => (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      className="block rounded-xl border border-[var(--border)] px-3.5 py-3 hover:border-[var(--brand-green)]/40 hover:bg-[#FAFCF9] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold text-[#1A1A1A] leading-snug">
                          {item.title}
                        </p>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: item.kind === 'program' ? 'var(--brand-soft)' : '#FFF8E1',
                            color: item.kind === 'program' ? 'var(--brand-green)' : '#8A6D00',
                          }}
                        >
                          {item.kind === 'program' ? 'Program' : 'Event'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--brand-green)] mb-0.5">
                        {item.whenLabel}
                      </p>
                      <p className="text-xs text-[#5A6070]">{item.subtitle}</p>
                      {(item.studentNames?.length ?? 0) > 0 && (
                        <p className="text-[11px] text-[#5A6070] mt-1.5">
                          For: {(item.studentNames ?? []).join(', ')}
                        </p>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <Mail className="w-8 h-8 mb-2 text-[#C4C0B8]" />
              <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
                {copy.messagesEmptyTitle}
              </p>
              <p className="text-xs text-[#5A6070] max-w-xs">{copy.messagesEmptyBody}</p>
            </div>
          ) : (
            <ul className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
              {messages.map((m) => {
                const isNew =
                  Boolean(m.sentAt) &&
                  Number.isFinite(Date.parse(m.sentAt!)) &&
                  (!messagesSeenAt || Date.parse(m.sentAt!) > messagesSeenAt)
                return (
                <li
                  key={m.id}
                  className={`rounded-xl border px-3.5 py-3 ${
                    isNew
                      ? 'border-[var(--brand-green)]/40 bg-[#E8F3E8]/50'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-[var(--brand-green)]">
                      {m.fromName}
                      {isNew ? (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-green)]">
                          New
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-[#5A6070]">{fmtShortDate(m.sentAt)}</p>
                  </div>
                  <p className="text-sm font-bold text-[#1A1A1A] mb-1">{m.subject}</p>
                  <p className="text-xs text-[#5A6070] leading-relaxed line-clamp-3">
                    {m.body}
                  </p>
                  {(m.programName || m.studentName) && (
                    <p className="text-[11px] text-[#8A8680] mt-2">
                      {[m.programName, m.studentName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
                )
              })}
            </ul>
          )}
        </PortalQuadrant>

        {/* A. My Account */}
        <PortalQuadrant
          id="account"
          title={copy.accountTitle}
          icon={User}
          className="order-2 lg:order-1 lg:col-start-1 lg:row-start-1"
          action={
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-[#5A6070] hover:text-red-600 inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> {copy.signOut}
            </button>
          }
        >
          <div className="flex items-center gap-3 mb-2">
            {member.profileImage ? (
              <img
                src={member.profileImage}
                alt={member.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#1A1A1A] truncate">{member.name}</p>
              <p className="text-xs text-[#5A6070] truncate">{member.email}</p>
            </div>
          </div>

          <EditAccountForm
            initialName={member.name}
            email={member.email}
            onUpdated={handleMemberUpdated}
          />

          <div
            className="rounded-xl px-4 py-3 border mb-4"
            style={{
              backgroundColor: accountType === 'paid' ? 'var(--brand-soft)' : '#FAFAF8',
              borderColor: 'var(--border)',
            }}
          >
            <p className="text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
              {accountType === 'paid' && <Star className="w-3.5 h-3.5" style={{ color: 'var(--brand-green)' }} />}
              {vanillaizeIfDemo(accountBannerTitle)}
            </p>
            <p className="text-xs text-[#5A6070] mt-1 leading-relaxed whitespace-pre-line">
              {vanillaizeIfDemo(accountBannerBody)}
            </p>
            {membershipCtaLabel ? (
              <a
                href={membershipCtaHref}
                className="inline-flex items-center gap-1 text-xs font-bold mt-2"
                style={{ color: 'var(--brand-green)' }}
              >
                {vanillaizeIfDemo(membershipCtaLabel)} <ArrowRight className="w-3 h-3" />
              </a>
            ) : null}
          </div>

          <dl className="space-y-3 text-sm mb-4">
            {member.memberSince && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#5A6070] m-0">{copy.memberSince}</dt>
                <dd className="font-semibold text-[#1A1A1A] m-0 text-right">
                  {new Date(member.memberSince).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#5A6070] m-0">{copy.studentsLabel}</dt>
              <dd className="font-semibold text-[#1A1A1A] m-0 text-right">
                {students.length}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[#5A6070] m-0">{copy.paidMembershipsLabel}</dt>
              <dd className="font-semibold text-[#1A1A1A] m-0 text-right">
                {paidStudents}
              </dd>
            </div>
          </dl>

          <div className="rounded-xl px-4 py-3 border border-[var(--border)] mb-4 bg-[#FAFCF9]">
            <p className="text-xs font-bold text-[#1A1A1A] mb-1">{copy.paymentMethodsTitle}</p>
            <p className="text-[11px] text-[#5A6070] leading-relaxed">{copy.paymentMethodsBody}</p>
          </div>

          {gradeLinks.length > 0 && (
            <div className="mt-auto pt-2 border-t border-[#F0EDE8]">
              <p className="text-[11px] font-bold text-[#1A1A1A] mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
                {copy.whatsappHeading}
              </p>
              <p className="text-[11px] text-[#5A6070] mb-2 leading-relaxed">
                Join your student’s grade group for reminders and PTO updates.
              </p>
              <div className="flex flex-wrap gap-2">
                {gradeLinks.map(({ grade, href }) => (
                  <a
                    key={grade}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:border-[#25D366] hover:bg-green-50"
                  >
                    Join {grade}
                  </a>
                ))}
              </div>
            </div>
          )}
        </PortalQuadrant>

        {/* B. My Students */}
        <PortalQuadrant
          id="portal-students"
          title={copy.studentsTitle}
          icon={Users}
          className="order-3 lg:order-2 lg:col-start-2 lg:row-start-1"
          action={
            <button
              type="button"
              onClick={load}
              className="text-xs font-semibold text-[#5A6070] hover:text-[var(--brand-green)] inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {copy.refresh}
            </button>
          }
        >
          {students.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
              <p className="font-bold text-[#1A1A1A] mb-1">{copy.emptyTitle}</p>
              <p className="text-xs text-[#5A6070] mb-4 max-w-sm">{copy.emptyBody}</p>
              <AddStudentForm
                onAdded={handleStudentAdded}
                grades={grades}
                labels={copy}
              />
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1">
              {students
                .sort((a, b) => Number(a.grade) - Number(b.grade))
                .map((s, i) => (
                  <StudentCard
                    key={s.id}
                    student={s}
                    defaultOpen={i === 0}
                    upgradeBody={copy.upgradeBody}
                    grades={grades}
                    onUpdated={handleStudentUpdated}
                  />
                ))}
              <AddStudentForm
                onAdded={handleStudentAdded}
                grades={grades}
                labels={copy}
              />
              <InviteCoParentPanel />
            </div>
          )}
        </PortalQuadrant>

        {/* C. Store & Purchases */}
        <PortalQuadrant
          id="store"
          title={copy.storeTitle}
          icon={CreditCard}
          className="order-4 lg:order-3 lg:col-start-1 lg:row-start-2"
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--brand-soft)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
                {copy.storeCardsLabel}
              </p>
              <p className="text-xl font-bold text-[#1A1A1A] mt-0.5">
                {fmtMoney(storeBalanceTotal)}
              </p>
              <p className="text-[11px] text-[#5A6070]">{copy.storeCardsHint}</p>
            </div>
            <div className="rounded-xl px-3 py-3 border border-[var(--border)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
                {copy.recentBuysLabel}
              </p>
              <p className="text-xl font-bold text-[#1A1A1A] mt-0.5">{purchases.length}</p>
              <p className="text-[11px] text-[#5A6070]">{copy.recentBuysHint}</p>
            </div>
          </div>

          <MembershipBenefitsCard />
          {coveGate.ok ? (
            <CoveFamilyCodeCard refreshKey={students.length} />
          ) : (
            <CoveFeatureLockBanner reason={coveGate.error ?? 'Complete family setup first.'} />
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {hideLiveCommerceUi() ? (
              <p className="text-xs text-[#5A6070] whitespace-pre-line">
                Sample school.
                {'\n'}
                Card loads and live shop checkout stay off here.
              </p>
            ) : coveGate.ok ? (
              <StoreCardReload
                students={students.map(({ id, firstName, lastName }) => ({ id, firstName, lastName }))}
                onLoaded={load}
              />
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-[var(--border)] text-[#8A8F9C] cursor-not-allowed"
                title={coveGate.error}
              >
                {vanillaizeIfDemo('Load Cove Digital Card (locked)')}
              </button>
            )}
            {hideLiveCommerceUi() ? null : (
            <a
              href="/cove#shop"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-[var(--border)] text-[#1A1A1A]"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> {copy.ctaSpiritWear}
            </a>
            )}
            <a
              href={onboarding.complete ? '/programs' : '#portal-onboarding'}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-[var(--border)] text-[#1A1A1A]"
              title={
                onboarding.complete
                  ? undefined
                  : 'Complete student safety profiles before program registration'
              }
            >
              {copy.ctaPrograms}
              {!onboarding.complete ? ' (setup needed)' : ''}
            </a>
          </div>

          <p className="text-[11px] text-[#5A6070] leading-relaxed mb-4 px-1">{copy.loadCardHelp}</p>

          {purchases.length === 0 ? (
            <p className="text-xs text-[#5A6070] mt-auto">{copy.purchasesEmpty}</p>
          ) : (
            <ul className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-3">
              {purchases.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 py-2 border-b border-[#F0EDE8] last:border-0"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.label}</p>
                    <p className="text-[11px] text-[#5A6070]">
                      {[p.studentName, fmtShortDate(p.date)].filter(Boolean).join(' · ')}
                    </p>
                    {p.detail ? (
                      <p className="text-[11px] text-[#5A6070] mt-0.5 leading-snug">{p.detail}</p>
                    ) : null}
                  </div>
                  <div className="text-right shrink-0 min-w-[4.5rem] pl-1">
                    <p className="text-sm font-bold text-[#1A1A1A] tabular-nums">
                      {fmtMoney(p.amount)}
                    </p>
                    {p.status ? (
                      <p className="text-[10px] font-bold text-[#5A6070] uppercase">
                        {p.status}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PortalQuadrant>
      </div>

      <div className="mt-6">
        <PortalBusinessOwnerForm memberName={member.name} memberEmail={member.email} />
      </div>

      <PortalSurveys />

      <section
        id="help"
        className="mt-8 scroll-mt-28 rounded-2xl border border-[var(--border)] bg-white overflow-hidden shadow-sm"
      >
        <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <HelpCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--brand-green)' }} />
            <div>
              <h2 className="font-bold text-[#1A1A1A] text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: 'var(--brand-green)' }} aria-hidden />
                Member Help
              </h2>
              <p className="text-sm text-[#5A6070] mt-1 leading-relaxed">
                {vanillaizeIfDemo(
                  'Full articles for account, students, membership, The Cove, and programs, organized by category. Signed in parents only.',
                )}
              </p>
            </div>
          </div>
          <Link
            href="/member-portal/help"
            className="shrink-0 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Open knowledge base
          </Link>
        </div>
        <div className="border-t border-[var(--border)] px-5 py-5">
          <PortalHelpForm memberName={member.name} compact />
        </div>
      </section>
    </div>
  )
}
