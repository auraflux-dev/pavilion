'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { displayMembershipTier } from '@/lib/demo/brand'
import { defaultUtmCampaign } from '@/lib/staff/newsletter-utm'
import { useLiveCommerceGate } from '@/lib/demo/commons-surface-context'
import {
  STAFF_FILTER_CARD,
  STAFF_FILTER_CARD_TITLE,
  STAFF_FILTER_INPUT,
  STAFF_FILTER_LABEL,
  STAFF_FILTER_SELECT,
} from '@/lib/staff/staff-filter-ui'
import {
  StaffSectionTab,
  useStaffExclusiveSection,
} from '@/components/staff/staff-exclusive-section'
import { StaffRichEmailComposer } from '@/components/staff/staff-rich-email-composer'
import { htmlToPlainText } from '@/lib/staff/email-html'
import { staffInboxComposeHref } from '@/lib/staff/inbox-compose-link'

const MEMBERSHIP_SECTIONS = [
  'membership-invite',
  'membership-roster',
  'membership-outreach',
] as const

type StudentRow = {
  id: string
  firstName: string
  lastName: string
  grade: string
  membershipTier: string
  membershipStatus: string
  archived: boolean
}

type ParentRow = {
  parentEmail: string
  parentFirstName: string
  parentLastName: string
  parentPhone: string
  accountNumber?: string
  membershipTier: string
  accountType: 'free' | 'paid'
  students: StudentRow[]
}

type Summary = {
  parents: number
  paid: number
  /** Joined the new site as free (Memberships row). */
  free: number
  /** Directory/Jumbula-only free — no Memberships join. */
  freeLegacy?: number
  withPhone: number
}

/**
 * VP Memberships workspace: roster + contact info, portal/email blast, WhatsApp group compose.
 */
export function StaffMembershipPanel() {
  const { allowed: liveCommerce } = useLiveCommerceGate()
  const [members, setMembers] = useState<ParentRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('all')
  const [grade, setGrade] = useState('')
  const [sort, setSort] = useState<'email' | 'name'>('name')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const [emailConfigured, setEmailConfigured] = useState(false)
  const [waLinks, setWaLinks] = useState({ grade6: '', grade7: '', grade8: '' })

  const [subject, setSubject] = useState('')
  /** Rich HTML body from the composer (portal/WhatsApp use plain-text strip). */
  const [body, setBody] = useState('')
  const [alsoPortal, setAlsoPortal] = useState(true)
  const [waGrade, setWaGrade] = useState<'6' | '7' | '8' | 'all'>('all')
  /** Outreach audience: large paid/free buckets (independent of roster accordion). */
  const [outreachGroup, setOutreachGroup] = useState<'all' | 'paid' | 'free' | 'free_legacy'>('paid')
  /** Second filter: specific paid tier, or all paid tiers. */
  const [outreachPaidTier, setOutreachPaidTier] = useState<
    'all' | 'reef' | 'lagoon' | 'tide'
  >('all')
  const [attachments, setAttachments] = useState<
    Array<{ key: string; filename: string; mimeType: string }>
  >([])
  const [attachmentStatus, setAttachmentStatus] = useState('')
  const attachFileRef = useRef<HTMLInputElement>(null)
  const [heroImageUrl, setHeroImageUrl] = useState('')

  const plainBody = htmlToPlainText(body)
  const hasMessage = Boolean(plainBody || subject)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirst, setInviteFirst] = useState('')
  const [inviteLast, setInviteLast] = useState('')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteStatus, setInviteStatus] = useState('')
  const [inviteJoinUrl, setInviteJoinUrl] = useState('')
  const [inviteSmsText, setInviteSmsText] = useState('')

  const loadChannels = useCallback(async () => {
    const r = await fetch('/api/staff/membership/outreach')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load channels')
    setEmailConfigured(Boolean(d.emailConfigured))
    setWaLinks(d.whatsapp ?? { grade6: '', grade7: '', grade8: '' })
  }, [])

  const loadRoster = useCallback(async () => {
    setBusy(true)
    setStatus('')
    try {
      const params = new URLSearchParams({ mode: 'list', tier, sort })
      if (q.trim()) params.set('q', q.trim())
      if (grade.trim()) params.set('grade', grade.trim())
      const r = await fetch(`/api/staff/members?${params}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load members')
      setMembers(d.members ?? [])
      setSummary(d.summary ?? null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [q, tier, grade, sort])

  useEffect(() => {
    void loadChannels().catch((err) =>
      setStatus(err instanceof Error ? err.message : 'Channels failed'),
    )
  }, [loadChannels])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  function resolveOutreachTier(): string {
    if (outreachGroup === 'free') return 'free'
    if (outreachGroup === 'free_legacy') return 'free_legacy'
    if (outreachPaidTier === 'reef' || outreachPaidTier === 'lagoon' || outreachPaidTier === 'tide') {
      return outreachPaidTier
    }
    if (outreachGroup === 'paid') return 'paid'
    return 'all'
  }

  function outreachAudienceLabel(resolvedTier: string): string {
    if (resolvedTier === 'free') return 'free members (joined site)'
    if (resolvedTier === 'free_legacy') return 'free legacy (directory only)'
    if (resolvedTier === 'paid') return 'all paid members'
    if (resolvedTier === 'reef') return 'Reef members'
    if (resolvedTier === 'lagoon') return 'Lagoon members'
    if (resolvedTier === 'tide') return 'Tide members'
    return 'all parents'
  }

  function outreachEmailPayload(extra: Record<string, unknown> = {}) {
    return {
      channel: 'email' as const,
      subject,
      body: plainBody,
      htmlBody: body.trim() || undefined,
      tier: resolveOutreachTier(),
      grade,
      heroImageUrl: heroImageUrl.trim() || undefined,
      attachmentKeys: attachments.length ? attachments : undefined,
      utmCampaign: defaultUtmCampaign(subject || 'membership-outreach'),
      trackClicks: true,
      trackOpens: true,
      ...extra,
    }
  }

  async function onAttachmentSelected(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setStatus('')
    setAttachmentStatus('')
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/staff/newsletter/upload-attachment', {
        method: 'POST',
        body: form,
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Upload failed')
      setAttachments((prev) => [
        ...prev,
        { key: d.key, filename: d.filename, mimeType: d.mimeType },
      ])
      setAttachmentStatus(`Attached ${d.filename}.`)
      setStatus(`Attached ${d.filename}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Attachment upload failed')
    } finally {
      setBusy(false)
      if (attachFileRef.current) attachFileRef.current.value = ''
    }
  }

  async function previewEmail() {
    setBusy(true)
    setStatus('')
    try {
      const audienceTier = resolveOutreachTier()
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          outreachEmailPayload({ dryRun: true, alsoPortal: false }),
        ),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Preview failed')
      setStatus(
        `Preview: ${d.recipientCount} ${outreachAudienceLabel(audienceTier)}` +
          (d.recipientsPreview?.length
            ? `. E.g. ${d.recipientsPreview.slice(0, 5).join(', ')}`
            : ''),
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendPortal() {
    setBusy(true)
    setStatus('')
    try {
      const audienceTier = resolveOutreachTier()
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'portal',
          subject,
          body: plainBody,
          tier: audienceTier,
          grade,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setStatus(
        `Sent to portal inbox (${d.recipientCount ?? 0} ${outreachAudienceLabel(audienceTier)}).`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendEmail() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          outreachEmailPayload({ dryRun: false, alsoPortal }),
        ),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Email failed')

      if (d.send?.mode === 'gmail') {
        setStatus(
          `Gmail: sent ${d.send.sent}, failed ${d.send.failed}` +
            (d.portalInserted ? ' · also posted to portal inbox' : '') +
            (attachments.length
              ? ` · ${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`
              : ''),
        )
      } else if (d.mailto) {
        window.location.href = d.mailto
        setStatus(
          `Opened your mail app with BCC to ${d.recipientCount} parents` +
            (emailConfigured ? '' : ' (Connect Google as membership@ in Staff → Inbox)') +
            (d.portalInserted ? ' · portal inbox updated' : ''),
        )
      } else {
        setStatus(d.send?.errors?.[0] ?? 'Email prepared')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Email failed')
    } finally {
      setBusy(false)
    }
  }

  async function openWhatsApp() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'whatsapp',
          message: plainBody || subject,
          whatsappGrade: waGrade,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'WhatsApp plan failed')
      const plan = d.plan as {
        message: string
        openUrls: string[]
        instructions: string
        waMeShare: string
      }
      if (plan.message) {
        try {
          await navigator.clipboard.writeText(plan.message)
        } catch {
          // clipboard may be blocked
        }
      }
      for (const url of plan.openUrls) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      if (!plan.openUrls.length && plan.waMeShare) {
        window.open(plan.waMeShare, '_blank', 'noopener,noreferrer')
      }
      setStatus(
        `${plan.instructions} Message copied to clipboard when permitted.`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'WhatsApp failed')
    } finally {
      setBusy(false)
    }
  }

  async function inviteFreeParent(sendEmail: boolean) {
    setInviteBusy(true)
    setInviteStatus('')
    try {
      const r = await fetch('/api/staff/membership/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          firstName: inviteFirst,
          lastName: inviteLast,
          phone: invitePhone,
          sendEmail,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Invite failed')
      setInviteJoinUrl(String(d.joinUrl || ''))
      setInviteSmsText(String(d.smsText || ''))
      setInviteStatus(String(d.message || 'Invite ready.'))
      if (!sendEmail && d.smsText) {
        try {
          await navigator.clipboard.writeText(String(d.smsText))
          setInviteStatus(`${d.message} SMS text copied.`)
        } catch {
          // clipboard may be blocked
        }
      }
    } catch (err) {
      setInviteStatus(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setInviteBusy(false)
    }
  }

  async function copyInviteField(value: string, label: string) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setInviteStatus(`${label} copied.`)
    } catch {
      setInviteStatus(`Copy failed. Select the ${label.toLowerCase()} manually.`)
    }
  }

  function exportCsv() {
    const lines = [
      ['accountNumber', 'email', 'first', 'last', 'phone', 'tier', 'account', 'students'].join(','),
      ...members.map((m) =>
        [
          m.accountNumber ?? '',
          m.parentEmail,
          m.parentFirstName,
          m.parentLastName,
          m.parentPhone,
          m.membershipTier,
          m.accountType,
          m.students.map((s) => `${s.firstName} ${s.lastName} (G${s.grade})`).join('; '),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shmspto-members-${tier}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const publicJoinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join`
      : 'https://www.shmspto.org/join'
  const joinQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&ecc=M&margin=6&data=${encodeURIComponent(publicJoinUrl)}`

  const { setOpenId, isOpen } = useStaffExclusiveSection(
    'staff-membership-section',
    MEMBERSHIP_SECTIONS,
    'membership-roster',
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <StaffSectionTab
          active={isOpen('membership-invite')}
          title="Invite"
          hint="Free parent at the table"
          onSelect={() => setOpenId('membership-invite')}
        />
        <StaffSectionTab
          active={isOpen('membership-roster')}
          title="Roster"
          hint="Parents · paid · free"
          badge={summary ? `${summary.parents}` : undefined}
          onSelect={() => setOpenId('membership-roster')}
        />
        <StaffSectionTab
          active={isOpen('membership-outreach')}
          title="Outreach"
          hint="Email · WhatsApp · portal"
          onSelect={() => setOpenId('membership-outreach')}
        />
      </div>

      {isOpen('membership-invite') ? (
      <section
        id="membership-invite"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Invite free parent</h2>
            <p className="text-xs text-[#5A6070] mt-1">
              At the table: create/find a free account and send a join link by email, or copy SMS
              text to paste from your phone. Parents can also scan the QR.
            </p>
          </div>
          {liveCommerce ? (
          <a
            href="/staff/in-person"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold underline shrink-0"
            style={{ color: 'var(--brand-green)' }}
          >
            Print table card
          </a>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Parent email *"
                type="email"
                autoComplete="email"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                value={inviteFirst}
                onChange={(e) => setInviteFirst(e.target.value)}
                placeholder="First name"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={inviteLast}
                onChange={(e) => setInviteLast(e.target.value)}
                placeholder="Last name"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="Phone (for your notes / SMS)"
                type="tel"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={inviteBusy || !inviteEmail.trim()}
                onClick={() => void inviteFreeParent(true)}
                className="text-white"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                Send join link
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={inviteBusy || !inviteEmail.trim()}
                onClick={() => void inviteFreeParent(false)}
              >
                Create + copy SMS text
              </Button>
              {inviteSmsText ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyInviteField(inviteSmsText, 'SMS text')}
                >
                  Copy SMS again
                </Button>
              ) : null}
              {inviteJoinUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyInviteField(inviteJoinUrl, 'Join link')}
                >
                  Copy join link
                </Button>
              ) : null}
              {invitePhone.replace(/\D/g, '').length >= 10 && inviteSmsText ? (
                <a
                  href={`sms:${invitePhone.replace(/\D/g, '')}?&body=${encodeURIComponent(inviteSmsText)}`}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold"
                  style={{ color: 'var(--brand-green)' }}
                >
                  Open Messages
                </a>
              ) : null}
            </div>
            {inviteStatus ? (
              <p className="text-xs text-[#5A6070]">{inviteStatus}</p>
            ) : null}
            {inviteJoinUrl ? (
              <p className="text-[11px] text-[#5A6070] break-all">Link: {inviteJoinUrl}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[#F7F4EE] p-4 min-w-[160px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={joinQrSrc} alt="Scan to join free" width={140} height={140} />
            <p className="text-xs font-bold text-[var(--brand-green)]">Scan to join free</p>
            <p className="text-[10px] text-[#5A6070] text-center break-all px-1">{publicJoinUrl}</p>
          </div>
        </div>
      </section>
      ) : (
        <div id="membership-invite" className="scroll-mt-28" />
      )}

      {isOpen('membership-roster') ? (
      <section
        id="membership-roster"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Membership roster</h1>
            <p className="text-xs text-[#5A6070] mt-1">
              Parents from Students + Memberships. Email, phone, and paid tier (Reef / Lagoon /
              Tide / faculty / board-seat Reef). Paid count is everyone who gets paid-tier perks
              (including board seats that need magnets).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!members.length}
            onClick={exportCsv}
            className="text-xs"
          >
            Export CSV
          </Button>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
          <div className={`flex-1 ${STAFF_FILTER_CARD}`}>
            <p className={STAFF_FILTER_CARD_TITLE}>Search</p>
            <label className={STAFF_FILTER_LABEL}>
              Lookup
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Account #, name, email, phone"
                autoComplete="off"
                name="staff-membership-lookup"
                className={STAFF_FILTER_INPUT}
              />
            </label>
            {summary ? (
              <p className="text-[11px] text-[#5A6070]">
                {summary.parents} in view · {summary.paid} paid · {summary.free} free
                joined · {summary.freeLegacy ?? 0} free legacy · {summary.withPhone} with phone
                {busy ? ' · Loading…' : ''}
              </p>
            ) : null}
          </div>
          <div className="xl:w-48 shrink-0 space-y-3">
            <div className={STAFF_FILTER_CARD}>
              <label className={STAFF_FILTER_LABEL}>
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value === 'email' ? 'email' : 'name')}
                  className={STAFF_FILTER_SELECT}
                  aria-label="Sort parents"
                >
                  <option value="name">Name A to Z</option>
                  <option value="email">Email A to Z</option>
                </select>
              </label>
            </div>
            <div className={STAFF_FILTER_CARD}>
              <label className={STAFF_FILTER_LABEL}>
                Tier
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className={STAFF_FILTER_SELECT}
                >
                  <option value="all">All parents</option>
                  <option value="free">Free joined (site)</option>
                  <option value="free_legacy">Free legacy (directory)</option>
                  <option value="paid">Paid only</option>
                  <option value="reef">Reef</option>
                  <option value="lagoon">Lagoon</option>
                  <option value="tide">Tide</option>
                </select>
              </label>
            </div>
            <div className={STAFF_FILTER_CARD}>
              <label className={STAFF_FILTER_LABEL}>
                Grade
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={STAFF_FILTER_SELECT}
                >
                  <option value="">Any grade</option>
                  <option value="6">6th</option>
                  <option value="7">7th</option>
                  <option value="8">8th</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="max-h-[420px] overflow-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg">
          {members.length === 0 ? (
            <p className="p-4 text-sm text-[#5A6070]">No parents match these filters.</p>
          ) : (
            members.map((m) => (
              <div key={m.parentEmail} className="p-3 flex flex-wrap gap-3 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {m.accountNumber ? (
                      <span className="tabular-nums">{m.accountNumber}</span>
                    ) : null}
                    {m.accountNumber ? ' · ' : ''}
                    {[m.parentFirstName, m.parentLastName].filter(Boolean).join(' ') ||
                      m.parentEmail}
                  </p>
                  <p className="text-xs text-[#5A6070] break-all">
                    {m.parentEmail}
                    {m.parentPhone ? ` · ${m.parentPhone}` : ''}
                  </p>
                  <p className="text-[11px] mt-1 text-[var(--brand-green)] font-semibold uppercase tracking-wide">
                    {m.membershipTier && m.membershipTier !== 'free'
                      ? displayMembershipTier(m.membershipTier)
                      : 'free'}
                  </p>
                  <ul className="mt-1 text-xs text-[#5A6070] space-y-0.5">
                    {m.students.map((s) => (
                      <li key={s.id}>
                        {s.firstName} {s.lastName} · G{s.grade} · {displayMembershipTier(s.membershipTier)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Link
                    href={staffInboxComposeHref(m.parentEmail)}
                    className="text-xs font-bold underline text-[var(--brand-green)]"
                  >
                    Email
                  </Link>
                  {m.parentPhone ? (
                    <a
                      href={`https://wa.me/${m.parentPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold underline text-[var(--brand-green)]"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      ) : (
        <div id="membership-roster" className="scroll-mt-28" />
      )}

      {isOpen('membership-outreach') ? (
      <section
        id="membership-outreach"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold">Outreach</h2>
          <p className="text-xs text-[#5A6070] mt-1">
            Pick who gets this message below (paid vs free, or Reef / Lagoon / Tide). Portal
            inbox always works.
            {emailConfigured
              ? ' Mass email sends from your signed-in @shmspto.org mailbox (Connect Google once in Staff → Inbox).'
              : ' Mass email needs Connect Google while signed in as your role address (Staff → Inbox), or set GMAIL_* on Vercel for the shared send mailbox only.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#5A6070] space-y-1">
            Member group
            <select
              value={outreachGroup}
              onChange={(e) => {
                const next = e.target.value as 'all' | 'paid' | 'free' | 'free_legacy'
                setOutreachGroup(next)
                if (next === 'free' || next === 'free_legacy') setOutreachPaidTier('all')
              }}
              className="block w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
            >
              <option value="paid">All paid members</option>
              <option value="free">Free members (joined site)</option>
              <option value="free_legacy">Free legacy (directory only)</option>
              <option value="all">All parents</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#5A6070] space-y-1">
            Paid tier
            <select
              value={outreachPaidTier}
              disabled={outreachGroup === 'free' || outreachGroup === 'free_legacy'}
              onChange={(e) => {
                const next = e.target.value as 'all' | 'reef' | 'lagoon' | 'tide'
                setOutreachPaidTier(next)
                if (next !== 'all' && (outreachGroup === 'free' || outreachGroup === 'free_legacy')) {
                  setOutreachGroup('paid')
                }
                if (next !== 'all' && outreachGroup === 'all') setOutreachGroup('paid')
              }}
              className="block w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A] disabled:opacity-50"
            >
              <option value="all">All paid tiers (Reef + Lagoon + Tide)</option>
              <option value="reef">Reef only</option>
              <option value="lagoon">Lagoon only</option>
              <option value="tide">Tide only</option>
            </select>
          </label>
        </div>
        <p className="text-[11px] text-[#5A6070]">
          Sending to: <strong>{outreachAudienceLabel(resolveOutreachTier())}</strong>
          {grade ? ` · grade ${grade}` : ''}. Use Preview audience to confirm the count.
        </p>

        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5A6070]">Email body</p>
          <StaffRichEmailComposer html={body} onChange={setBody} />
          <p className="text-[11px] text-[#5A6070]">
            Bold, lists, links, and headings are included in Gmail. Portal inbox and WhatsApp
            use a plain-text version.
          </p>
        </div>
        <label className="text-xs font-semibold text-[#5A6070] space-y-1 block">
          Hero image URL (optional)
          <input
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="https://… (shown above the message in email)"
            className="block w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-normal text-[#1A1A1A]"
          />
        </label>
        <div className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-3 space-y-2">
          <p className="text-xs font-semibold text-[#1A1A1A]">Attachments (optional)</p>
          <input
            ref={attachFileRef}
            type="file"
            accept=".pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => void onAttachmentSelected(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => attachFileRef.current?.click()}
          >
            Attach file (PDF or image)
          </Button>
          {attachmentStatus ? (
            <p className="text-xs text-[var(--brand-green)]">{attachmentStatus}</p>
          ) : null}
          {attachments.length ? (
            <ul className="text-xs text-[#5A6070] space-y-1">
              {attachments.map((a) => (
                <li key={a.key} className="flex items-center gap-2">
                  <span>{a.filename}</span>
                  <button
                    type="button"
                    className="underline text-[var(--brand-green)]"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((x) => x.key !== a.key))
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-xs text-[#5A6070]">
          <input
            type="checkbox"
            checked={alsoPortal}
            onChange={(e) => setAlsoPortal(e.target.checked)}
          />
          Also post to parent portal inbox when sending email
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !subject || !plainBody}
            onClick={() => void previewEmail()}
          >
            Preview audience
          </Button>
          <Button
            type="button"
            disabled={busy || !subject || !plainBody}
            onClick={() => void sendPortal()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Send to portal inbox
          </Button>
          <Button
            type="button"
            disabled={busy || !subject || !plainBody}
            onClick={() => void sendEmail()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-dark)' }}
          >
            {emailConfigured ? 'Send via Gmail' : 'Email via mail app (BCC)'}
          </Button>
        </div>

        <div className="border-t border-[var(--border)] pt-4 space-y-3">
          <p className="text-sm font-semibold">WhatsApp grade groups</p>
          <p className="text-xs text-[#5A6070]">
            Copies your message, then opens the invite link(s) so you can paste in the group.
            Links: 6th {waLinks.grade6 ? '✓' : 'n/a'} · 7th {waLinks.grade7 ? '✓' : 'n/a'} · 8th{' '}
            {waLinks.grade8 ? '✓' : 'n/a'}.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={waGrade}
              onChange={(e) => setWaGrade(e.target.value as '6' | '7' | '8' | 'all')}
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All configured grades</option>
              <option value="6">6th grade group</option>
              <option value="7">7th grade group</option>
              <option value="8">8th grade group</option>
            </select>
            <Button
              type="button"
              disabled={busy || !hasMessage}
              onClick={() => void openWhatsApp()}
              className="text-white"
              style={{ backgroundColor: '#128C7E' }}
            >
              Copy message & open WhatsApp
            </Button>
          </div>
        </div>

        {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      </section>
      ) : (
        <div id="membership-outreach" className="scroll-mt-28" />
      )}
    </div>
  )
}
