'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { defaultUtmCampaign } from '@/lib/staff/newsletter-utm'
import {
  StaffNewsletterTemplatesPanel,
  type NewsletterCanvaMeta,
} from '@/components/staff/staff-newsletter-templates-panel'

type TestGroupMember = { email: string; label: string }
type TestGroups = {
  me: TestGroupMember | null
  board: TestGroupMember[]
  custom: TestGroupMember[]
}

/**
 * Member newsletter: free and/or paid parents via Gmail + WhatsApp grade groups + optional portal.
 * Reuses /api/staff/membership/outreach (same roster + Gmail send as Memberships).
 */
export function StaffNewsletterPanel() {
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [waLinks, setWaLinks] = useState({ grade6: '', grade7: '', grade8: '' })
  const [testGroups, setTestGroups] = useState<TestGroups | null>(null)
  const [testGroup, setTestGroup] = useState<'me' | 'board' | 'board_and_custom'>('me')
  const [testEmailsExtra, setTestEmailsExtra] = useState('')
  const [tier, setTier] = useState('all')
  const [grade, setGrade] = useState('')
  const [waGrade, setWaGrade] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [trackClicks, setTrackClicks] = useState(true)
  const [trackOpens, setTrackOpens] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [canvaMeta, setCanvaMeta] = useState<NewsletterCanvaMeta>({})
  const [alsoPortal, setAlsoPortal] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/membership/outreach')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setEmailConfigured(Boolean(d.emailConfigured))
    setWaLinks(d.whatsapp ?? { grade6: '', grade7: '', grade8: '' })
    setTestGroups(d.testGroups ?? null)
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  useEffect(() => {
    if (!utmCampaign.trim() && subject.trim()) {
      setUtmCampaign(defaultUtmCampaign(subject))
    }
  }, [subject, utmCampaign])

  function outreachPayload(extra: Record<string, unknown> = {}) {
    return {
      channel: 'email',
      subject,
      body,
      tier,
      grade,
      alsoPortal,
      utmCampaign: utmCampaign.trim() || defaultUtmCampaign(subject),
      trackClicks,
      trackOpens,
      templateId: templateId || undefined,
      canvaViewUrl: canvaMeta.canvaViewUrl,
      canvaThumbnailUrl: canvaMeta.canvaThumbnailUrl,
      canvaTitle: canvaMeta.canvaTitle,
      testEmails: testEmailsExtra,
      ...extra,
    }
  }

  async function preview() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outreachPayload({ dryRun: true, alsoPortal: false })),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Preview failed')
      setStatus(
        `Preview: ${d.recipientCount} member parents` +
          (d.recipientsPreview?.length
            ? `. E.g. ${d.recipientsPreview.slice(0, 5).join(', ')}`
            : '') +
          (trackClicks ? ' · links will get UTM + click tracking on send' : ''),
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendTestEmail() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          outreachPayload({
            dryRun: false,
            alsoPortal: false,
            sendAudience: 'test',
            testGroup,
            testEmails: testEmailsExtra,
          }),
        ),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Test send failed')
      if (d.send?.mode === 'gmail') {
        setStatus(
          `[TEST] Sent via Gmail: ${d.send.sent} delivered, ${d.send.failed} failed` +
            (d.recipientsPreview?.length
              ? `\nTo: ${d.recipientsPreview.join(', ')}`
              : '') +
            (d.newsletterSendId ? `\nTracking id: ${d.newsletterSendId}` : ''),
        )
      } else if (d.mailto) {
        window.location.href = d.mailto
        setStatus(`[TEST] Opened mail app for ${d.recipientCount} recipients.`)
      } else {
        setStatus(d.send?.errors?.[0] ?? 'Test email prepared')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Test send failed')
    } finally {
      setBusy(false)
    }
  }

  async function previewTestRecipients() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          outreachPayload({
            dryRun: true,
            alsoPortal: false,
            sendAudience: 'test',
            testGroup,
            testEmails: testEmailsExtra,
          }),
        ),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Preview failed')
      setStatus(
        `[TEST preview] ${d.recipientCount} recipient(s)` +
          (d.recipientsPreview?.length ? `: ${d.recipientsPreview.join(', ')}` : ''),
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
        body: JSON.stringify(outreachPayload({ dryRun: false })),
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
                : '') +
            (d.newsletterSendId
              ? ` · tracking id ${d.newsletterSendId} (see Send stats below)`
              : ''),
        )
      } else if (d.mailto) {
        window.location.href = d.mailto
        setStatus(`Opened mail app BCC to ${d.recipientCount} parents.`)
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
    <div className="space-y-4">
      <StaffNewsletterTemplatesPanel
        subject={subject}
        body={body}
        utmCampaign={utmCampaign}
        canvaMeta={canvaMeta}
        onCanvaMetaChange={setCanvaMeta}
        onLoad={(tpl) => {
          setSubject(tpl.subject)
          setBody(tpl.body)
          setUtmCampaign(tpl.utmCampaign || defaultUtmCampaign(tpl.subject))
          setTemplateId(tpl.templateId)
          setCanvaMeta({
            canvaViewUrl: tpl.canvaViewUrl,
            canvaThumbnailUrl: tpl.canvaThumbnailUrl,
            canvaTitle: tpl.canvaTitle,
            canvaDesignId: tpl.canvaDesignId,
            canvaEditUrl: tpl.canvaEditUrl,
          })
          if (tpl.canvaThumbnailUrl) setTrackOpens(true)
        }}
      />

      <section
        id="member-newsletter"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold">Member newsletter</h2>
          <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
            No HTML coding required. Write plain text (like an email to a friend), paste links, and
            optionally attach a Canva graphic up top.
            {'\n'}
            Parent sends use the Students roster. Use Test send first so board can preview in a real
            inbox.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-3">
          <p className="text-sm font-semibold text-[#1A1A1A]">Test send (board preview)</p>
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            Subject is prefixed with [TEST]. Does not post to the parent portal or member archive.
            {'\n'}
            Add your personal Gmail under Staff → Home if “Just me” is empty.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs text-[#5A6070]">
              Test group
              <select
                value={testGroup}
                onChange={(e) =>
                  setTestGroup(e.target.value as 'me' | 'board' | 'board_and_custom')
                }
                className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="me">Just me</option>
                <option value="board">Board test group (StaffRoles emails)</option>
                <option value="board_and_custom">Board + Site Settings test list</option>
              </select>
            </label>
            <label className="text-xs text-[#5A6070]">
              Extra test emails (optional)
              <input
                value={testEmailsExtra}
                onChange={(e) => setTestEmailsExtra(e.target.value)}
                placeholder="you@gmail.com, colleague@…"
                className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>
          {testGroups?.board.length ? (
            <p className="text-[11px] text-[#5A6070]">
              Board group:{' '}
              {testGroups.board
                .slice(0, 6)
                .map((m) => m.label)
                .join(' · ')}
              {testGroups.board.length > 6 ? ` · +${testGroups.board.length - 6} more` : ''}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !subject || !body}
              onClick={() => void previewTestRecipients()}
            >
              Preview test recipients
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !subject || !body}
              onClick={() => void sendTestEmail()}
            >
              Send test email
            </Button>
          </div>
        </div>

        <p className="text-xs font-semibold text-[#1A1A1A]">Member send</p>

        <div className="grid sm:grid-cols-3 gap-2">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All members (free + paid)</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
            <option value="reef">{vanillaizeIfDemo('Reef')}</option>
            <option value="lagoon">{vanillaizeIfDemo('Lagoon')}</option>
            <option value="tide">{vanillaizeIfDemo('Tide')}</option>
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
          placeholder="Newsletter body (plain text; paste links — UTM + tracking added on send)"
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="text-xs text-[#5A6070]">
            UTM campaign (GA4)
            <input
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="e.g. run-for-charity-2026"
              className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-col gap-2 justify-end text-xs text-[#5A6070]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={trackClicks}
                onChange={(e) => setTrackClicks(e.target.checked)}
              />
              Track link clicks (/r/ redirect + Staff stats)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={trackOpens}
                onChange={(e) => setTrackOpens(e.target.checked)}
              />
              Track opens (HTML + pixel when Canva hero or this is on)
            </label>
          </div>
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
        {status ? <p className="text-sm text-[#1A1A1A] whitespace-pre-line">{status}</p> : null}
      </section>
    </div>
  )
}
