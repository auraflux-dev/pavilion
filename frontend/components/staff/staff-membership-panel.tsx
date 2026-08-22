'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { displayMembershipTier } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { useLiveCommerceGate } from '@/lib/demo/commons-surface-context'
import { HelpTip } from '@/components/ui/help-tip'

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
  membershipTier: string
  accountType: 'free' | 'paid'
  students: StudentRow[]
}

type Summary = {
  parents: number
  byTier?: { reef: number; lagoon: number; tide: number; free: number; other?: number }
  paid: number
  free: number
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
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const [emailConfigured, setEmailConfigured] = useState(false)
  const [waLinks, setWaLinks] = useState({ grade6: '', grade7: '', grade8: '' })

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [alsoPortal, setAlsoPortal] = useState(true)
  const [waGrade, setWaGrade] = useState<'6' | '7' | '8' | 'all'>('all')

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
      const params = new URLSearchParams({ mode: 'list', tier })
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
  }, [q, tier, grade])

  useEffect(() => {
    void loadChannels().catch((err) =>
      setStatus(err instanceof Error ? err.message : 'Channels failed'),
    )
  }, [loadChannels])

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  async function previewEmail() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          subject,
          body,
          tier,
          grade,
          dryRun: true,
          alsoPortal: false,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Preview failed')
      setStatus(
        `Preview: ${d.recipientCount} recipients` +
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

  async function confirmAudience(channel: 'portal' | 'email') {
    const r = await fetch('/api/staff/membership/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channel === 'email' ? 'email' : 'portal',
        subject,
        body,
        tier,
        grade,
        dryRun: true,
        alsoPortal: false,
      }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not count recipients')
    const count = Number(d.recipientCount ?? 0)
    const label =
      channel === 'email'
        ? `Send real email to ${count} matching parent${count === 1 ? '' : 's'}?\nThere is no undo.`
        : `Post to portal inbox for ${count} matching parent${count === 1 ? '' : 's'}?`
    return window.confirm(label)
  }

  async function sendPortal() {
    setBusy(true)
    setStatus('')
    try {
      if (!(await confirmAudience('portal'))) {
        setStatus('Send cancelled.')
        return
      }
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'portal', subject, body, tier, grade }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setStatus(`Sent to portal inbox (${d.recipientCount ?? 0} matched parents).`)
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
      if (!(await confirmAudience('email'))) {
        setStatus('Send cancelled.')
        return
      }
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          subject,
          body,
          tier,
          grade,
          dryRun: false,
          alsoPortal,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Email failed')

      if (d.send?.mode === 'gmail') {
        setStatus(
          `Gmail: sent ${d.send.sent}, failed ${d.send.failed}` +
            (d.portalInserted ? ' · also posted to portal inbox' : ''),
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
          message: body || subject,
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
      ['email', 'first', 'last', 'phone', 'tier', 'account', 'students'].join(','),
      ...members.map((m) =>
        [
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
    const csvFilename = isPublicDemoInstance() ? `members-${tier}.csv` : `shmspto-members-${tier}.csv`
    a.download = csvFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  const publicJoinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join`
      : 'https://www.shmspto.org/join'
  const joinQrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&ecc=M&margin=6&data=${encodeURIComponent(publicJoinUrl)}`

  return (
    <div className="space-y-5">
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

      <section
        id="membership-roster"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Membership roster</h1>
            <p className="text-xs text-[#5A6070] mt-1">
              Parents from Students + Memberships. Email, phone, and paid tier ({displayMembershipTier('reef')} / {displayMembershipTier('lagoon')} /
              {' '}{displayMembershipTier('tide')}). Paid count follows Memberships after checkout.
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

        <div className="grid sm:grid-cols-4 gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone"
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All parents</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
            <option value="reef">{displayMembershipTier('reef')}</option>
            <option value="lagoon">{displayMembershipTier('lagoon')}</option>
            <option value="tide">{displayMembershipTier('tide')}</option>
          </select>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Any grade</option>
            <option value="6">6th</option>
            <option value="7">7th</option>
            <option value="8">8th</option>
          </select>
        </div>

        {summary ? (
          <div className="text-xs text-[#5A6070] space-y-1">
            <p>
              {summary.parents} parents · {summary.paid} paid · {summary.free} free ·{' '}
              {summary.withPhone} with phone
              {busy ? ' · Loading…' : ''}
            </p>
            {summary.byTier ? (
              <p className="whitespace-pre-line">
                By type: {displayMembershipTier('reef')} {summary.byTier.reef}
                {' · '}
                {displayMembershipTier('lagoon')} {summary.byTier.lagoon}
                {' · '}
                {displayMembershipTier('tide')} {summary.byTier.tide}
                {' · '}Free {summary.byTier.free}
                {summary.byTier.other ? ` · Other ${summary.byTier.other}` : ''}
              </p>
            ) : null}
            <p>
              Daily activity report (6am Eastern) includes these totals.
              {' '}
              <a
                href="/staff?view=site"
                className="font-semibold underline"
                style={{ color: 'var(--brand-green)' }}
              >
                Site settings → Contact
              </a>
              {' '}for extra report emails.
            </p>
          </div>
        ) : null}

        <div className="max-h-[420px] overflow-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg">
          {members.length === 0 ? (
            <p className="p-4 text-sm text-[#5A6070]">No parents match these filters.</p>
          ) : (
            members.map((m) => (
              <div key={m.parentEmail} className="p-3 flex flex-wrap gap-3 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {[m.parentFirstName, m.parentLastName].filter(Boolean).join(' ') ||
                      m.parentEmail}
                  </p>
                  <p className="text-xs text-[#5A6070] break-all">
                    {m.parentEmail}
                    {m.parentPhone ? ` · ${m.parentPhone}` : ''}
                  </p>
                  <p className="text-[11px] mt-1 text-[var(--brand-green)] font-semibold uppercase tracking-wide">
                    {m.accountType === 'paid' ? displayMembershipTier(m.membershipTier) : 'free'}
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
                  <a
                    href={`mailto:${encodeURIComponent(m.parentEmail)}`}
                    className="text-xs font-bold underline text-[var(--brand-green)]"
                  >
                    Email
                  </a>
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

      <section
        id="membership-outreach"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold">Outreach</h2>
          <p className="text-xs text-[#5A6070] mt-1">
            Audience follows the roster filters above. Portal inbox always works.
            {emailConfigured
              ? ' Mass email sends from your Google Workspace mailbox via Gmail API.'
              : ' Mass email opens your mail app with BCC until you Connect Google as membership@ (Staff → Inbox) or set GMAIL_* on Vercel.'}
          </p>
        </div>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Message body"
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-xs text-[#5A6070]">
          <input
            type="checkbox"
            checked={alsoPortal}
            onChange={(e) => setAlsoPortal(e.target.checked)}
          />
          Also post to parent portal inbox when sending email
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy || !subject || !body}
            onClick={() => void previewEmail()}
          >
            Preview audience
          </Button>
          <HelpTip tipKey="staff.send.preview" label="About preview audience" />
          <Button
            type="button"
            disabled={busy || !subject || !body}
            onClick={() => void sendPortal()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Send to portal inbox
          </Button>
          <Button
            type="button"
            disabled={busy || !subject || !body}
            onClick={() => void sendEmail()}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-dark)' }}
          >
            {emailConfigured ? 'Send via Gmail' : 'Email via mail app (BCC)'}
          </Button>
          {emailConfigured ? (
            <HelpTip tipKey="staff.send.gmail" label="About Gmail send" />
          ) : null}
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
              disabled={busy || !(body || subject)}
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
    </div>
  )
}
