'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Member newsletter: free and/or paid parents via Gmail + WhatsApp grade groups + optional portal.
 * Reuses /api/staff/membership/outreach (same roster + Gmail send as Memberships).
 */
export function StaffNewsletterPanel() {
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [waLinks, setWaLinks] = useState({ grade6: '', grade7: '', grade8: '' })
  const [tier, setTier] = useState('all') // all | free | paid
  const [grade, setGrade] = useState('')
  const [waGrade, setWaGrade] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [alsoPortal, setAlsoPortal] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/membership/outreach')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setEmailConfigured(Boolean(d.emailConfigured))
    setWaLinks(d.whatsapp ?? { grade6: '', grade7: '', grade8: '' })
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function preview() {
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
        `Preview: ${d.recipientCount} member parents` +
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
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      if (d.send?.mode === 'gmail') {
        setStatus(
          `Sent via Gmail: ${d.send.sent} delivered, ${d.send.failed} failed` +
            (d.portalInserted ? ' · portal inbox updated' : '') +
            (d.newsletterArchived
              ? ' · newsletter archived for Messages'
              : alsoPortal
                ? ' · newsletter archive skipped or failed. Check Newsletters CMS'
                : ''),
        )
      } else if (d.mailto) {
        window.location.href = d.mailto
        setStatus(
          `Opened mail app BCC to ${d.recipientCount} parents.` +
            (d.newsletterArchived ? ' · newsletter archived for Messages' : ''),
        )
      } else {
        setStatus(d.send?.errors?.[0] ?? 'Email prepared')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Send failed')
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
          message: [subject, body].filter(Boolean).join('\n\n'),
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
      setStatus(`${plan.instructions} Message copied when clipboard allowed.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'WhatsApp failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="member-newsletter"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
    >
      <div>
        <h2 className="text-lg font-bold">Member newsletter</h2>
        <p className="text-xs text-[#5A6070] mt-1">
          Send to free and/or paid member parents (Students roster). Email uses Gmail API
          {emailConfigured ? '' : ' (or mailto BCC until Gmail env is set)'}. WhatsApp opens
          grade group invite links from Site Settings. Paste the copied message in-app (Meta has
          no simple group-post API).
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">All members (free + paid)</option>
          <option value="free">Free only</option>
          <option value="paid">Paid only</option>
          <option value="reef">Reef</option>
          <option value="lagoon">Lagoon</option>
          <option value="tide">Tide</option>
        </select>
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Any grade (email)</option>
          <option value="6">6th</option>
          <option value="7">7th</option>
          <option value="8">8th</option>
        </select>
        <select
          value={waGrade}
          onChange={(e) => setWaGrade(e.target.value)}
          className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">WhatsApp: all grade groups</option>
          <option value="6">WhatsApp: 6th</option>
          <option value="7">WhatsApp: 7th</option>
          <option value="8">WhatsApp: 8th</option>
        </select>
      </div>

      <p className="text-[11px] text-[#5A6070]">
        Grade WhatsApp links configured:{' '}
        {[
          waLinks.grade6 && '6th',
          waLinks.grade7 && '7th',
          waLinks.grade8 && '8th',
        ]
          .filter(Boolean)
          .join(', ') || 'none. Add in Site settings'}
      </p>

      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject / headline"
        className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        placeholder="Newsletter body"
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !subject || !body}
          onClick={() => void preview()}
        >
          Preview recipients
        </Button>
        <Button
          type="button"
          disabled={busy || !subject || !body}
          className="text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
          onClick={() => void sendEmail()}
        >
          Send email
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || (!subject && !body)}
          onClick={() => void openWhatsApp()}
        >
          Copy + open WhatsApp
        </Button>
      </div>
      {status ? <p className="text-sm text-[#1A1A1A]">{status}</p> : null}
    </section>
  )
}
