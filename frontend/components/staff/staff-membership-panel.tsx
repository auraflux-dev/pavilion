'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

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
  paid: number
  free: number
  withPhone: number
}

/**
 * VP Memberships workspace: roster + contact info, portal/email blast, WhatsApp group compose.
 */
export function StaffMembershipPanel() {
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

  async function sendPortal() {
    setBusy(true)
    setStatus('')
    try {
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
    a.download = `shmspto-members-${tier}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Membership roster</h1>
            <p className="text-xs text-[#5A6070] mt-1">
              Parents from Students CMS. Email, phone, and paid tier (Reef / Lagoon / Tide).
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
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All parents</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
            <option value="reef">Reef</option>
            <option value="lagoon">Lagoon</option>
            <option value="tide">Tide</option>
          </select>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Any grade</option>
            <option value="6">6th</option>
            <option value="7">7th</option>
            <option value="8">8th</option>
          </select>
        </div>

        {summary ? (
          <p className="text-xs text-[#5A6070]">
            {summary.parents} parents · {summary.paid} paid · {summary.free} free ·{' '}
            {summary.withPhone} with phone
            {busy ? ' · Loading…' : ''}
          </p>
        ) : null}

        <div className="max-h-[420px] overflow-auto divide-y divide-[#E8E4DC] border border-[#E8E4DC] rounded-lg">
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
                  <p className="text-[11px] mt-1 text-[#085508] font-semibold uppercase tracking-wide">
                    {m.accountType === 'paid' ? m.membershipTier : 'free'}
                  </p>
                  <ul className="mt-1 text-xs text-[#5A6070] space-y-0.5">
                    {m.students.map((s) => (
                      <li key={s.id}>
                        {s.firstName} {s.lastName} · G{s.grade} · {s.membershipTier}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <a
                    href={`mailto:${encodeURIComponent(m.parentEmail)}`}
                    className="text-xs font-bold underline text-[#085508]"
                  >
                    Email
                  </a>
                  {m.parentPhone ? (
                    <a
                      href={`https://wa.me/${m.parentPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold underline text-[#085508]"
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

      <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
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
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Message body"
          className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
        />
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
            disabled={busy || !subject || !body}
            onClick={() => void previewEmail()}
          >
            Preview audience
          </Button>
          <Button
            type="button"
            disabled={busy || !subject || !body}
            onClick={() => void sendPortal()}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            Send to portal inbox
          </Button>
          <Button
            type="button"
            disabled={busy || !subject || !body}
            onClick={() => void sendEmail()}
            className="text-white"
            style={{ backgroundColor: '#0B3D0B' }}
          >
            {emailConfigured ? 'Send via Gmail' : 'Email via mail app (BCC)'}
          </Button>
        </div>

        <div className="border-t border-[#E8E4DC] pt-4 space-y-3">
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
              className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
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
