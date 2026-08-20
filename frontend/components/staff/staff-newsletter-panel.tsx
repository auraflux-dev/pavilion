'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { defaultUtmCampaign } from '@/lib/staff/newsletter-utm'
import { NEWSLETTER_MERGE_HINT } from '@/lib/staff/newsletter-merge'
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
  const [sendAudience, setSendAudience] = useState<'members' | 'subscribers'>('members')
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [canApprove, setCanApprove] = useState(false)
  const [sendAtLocal, setSendAtLocal] = useState('')
  const [jobs, setJobs] = useState<
    {
      id: string
      subject: string
      sendAt: string
      status: string
      sendAudience: string
      createdByEmail: string
      error?: string
    }[]
  >([])
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
    setSubscriberCount(Number(d.subscriberCount ?? 0))
    setCanApprove(Boolean(d.canApproveNewsletter))
    try {
      const jr = await fetch('/api/staff/newsletter/jobs')
      const jd = await jr.json()
      if (jr.ok) {
        setJobs(Array.isArray(jd.jobs) ? jd.jobs : [])
        if (typeof jd.canApprove === 'boolean') setCanApprove(jd.canApprove)
      }
    } catch {
      // jobs collection may not exist yet
    }
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
      alsoPortal: sendAudience === 'subscribers' ? false : alsoPortal,
      sendAudience,
      utmCampaign: utmCampaign.trim() || defaultUtmCampaign(subject),
      trackClicks,
      trackOpens,
      templateId: templateId || undefined,
      canvaViewUrl: canvaMeta.canvaViewUrl,
      canvaThumbnailUrl: canvaMeta.canvaThumbnailUrl,
      canvaTitle: canvaMeta.canvaTitle,
      heroImageUrl: canvaMeta.heroImageUrl,
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
        `Preview: ${d.recipientCount} ${sendAudience === 'subscribers' ? 'footer signup' : 'member parent'}${d.recipientCount === 1 ? '' : 's'}` +
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
      const previewRes = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outreachPayload({ dryRun: true, alsoPortal: false })),
      })
      const preview = await previewRes.json()
      if (!previewRes.ok) throw new Error(preview.error ?? 'Preview failed')
      const n = Number(preview.recipientCount ?? 0)
      const who = sendAudience === 'subscribers' ? 'footer signup' : 'member parent'
      const ok = window.confirm(
        `Send this newsletter to ${n} ${who}${n === 1 ? '' : 's'}?\n\nThis is not a test send. Type OK in the next step only if you meant the full list.`,
      )
      if (!ok) {
        setStatus('Member send cancelled.')
        return
      }
      if (n >= 25) {
        const typed = window.prompt(
          `This will email ${n} ${who}${n === 1 ? '' : 's'}.\n\nType SEND to confirm.`,
        )
        if (String(typed ?? '').trim().toUpperCase() !== 'SEND') {
          setStatus('Member send cancelled (confirmation not typed).')
          return
        }
      }

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
              ? ` · tracking id ${d.newsletterSendId} (see Send report below)`
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

  async function queueSend() {
    if (!sendAtLocal.trim()) {
      setStatus('Pick a send date and time first.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const sendAt = new Date(sendAtLocal).toISOString()
      const r = await fetch('/api/staff/newsletter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...outreachPayload(),
          action: 'create',
          sendAt,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not queue')
      await load()
      if (d.sentNow) {
        setStatus('Queued time was now (or past). Send completed.')
      } else if (d.status === 'pending_approval') {
        setStatus(
          `Queued for ${new Date(d.sendAt).toLocaleString()}. Waiting for secretary/president approval.`,
        )
      } else {
        setStatus(`Scheduled for ${new Date(d.sendAt).toLocaleString()}. It sends within about 15 minutes of that time.`)
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not queue')
    } finally {
      setBusy(false)
    }
  }

  async function jobAction(action: 'approve' | 'cancel', id: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/newsletter/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Job update failed')
      await load()
      if (action === 'approve') {
        setStatus(
          d.sentNow
            ? 'Approved and sent.'
            : 'Approved. It will send at the scheduled time.',
        )
      } else {
        setStatus('Job cancelled.')
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Job update failed')
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
            heroImageUrl: tpl.heroImageUrl,
            heroImageKey: tpl.heroImageKey,
          })
          if (tpl.heroImageUrl || tpl.canvaThumbnailUrl) setTrackOpens(true)
        }}
      />

      <section
        id="member-newsletter"
        className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold">Member newsletter</h2>
          <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
            No HTML coding required. Write plain text, attach a Canva design, Export PNG for email.
            Sends include SHMS header/footer + your graphic + body.
            {'\n'}
            Parent sends use the Students roster. Footer signups use the public newsletter list.
            Use Test send first so board can preview in a real inbox.
            {emailConfigured
              ? ''
              : '\nGmail send is not ready yet. Connect Google in Staff → Inbox (president@) or sends fall back to your mail app.'}
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

        <p className="text-xs font-semibold text-[#1A1A1A]">Audience + member send</p>

        <label className="text-xs text-[#5A6070]">
          Who gets this email
          <select
            value={sendAudience}
            onChange={(e) =>
              setSendAudience(e.target.value === 'subscribers' ? 'subscribers' : 'members')
            }
            className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="members">Member parents (Students roster)</option>
            <option value="subscribers">
              Footer signup list ({subscriberCount} email{subscriberCount === 1 ? '' : 's'})
            </option>
          </select>
        </label>

        <div className={`grid sm:grid-cols-3 gap-2 ${sendAudience === 'subscribers' ? 'opacity-50' : ''}`}>
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
        <p className="text-[11px] text-[#5A6070]">{NEWSLETTER_MERGE_HINT}</p>

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
            checked={sendAudience === 'subscribers' ? false : alsoPortal}
            disabled={sendAudience === 'subscribers'}
            onChange={(e) => setAlsoPortal(e.target.checked)}
          />
          Also post to parent portal inbox when sending email
          {sendAudience === 'subscribers' ? ' (signup list is email-only)' : ''}
        </label>

        <div className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-2">
          <p className="text-sm font-semibold text-[#1A1A1A]">Schedule / approval</p>
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            Test send stays one-click. Queue a later send here.
            Marketing queues wait for secretary or president approval.
            Approved jobs send at the chosen time (checked about every 15 minutes).
          </p>
          <label className="text-xs text-[#5A6070] block">
            Send at (your local time)
            <input
              type="datetime-local"
              value={sendAtLocal}
              onChange={(e) => setSendAtLocal(e.target.value)}
              className="mt-1 w-full sm:w-auto border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !subject || !body || !sendAtLocal}
            onClick={() => void queueSend()}
          >
            {canApprove ? 'Schedule send' : 'Request approval & schedule'}
          </Button>
          {jobs.filter((j) =>
            ['pending_approval', 'scheduled', 'sending', 'failed'].includes(j.status),
          ).length ? (
            <ul className="text-xs text-[#1A1A1A] space-y-2 pt-2">
              {jobs
                .filter((j) =>
                  ['pending_approval', 'scheduled', 'sending', 'failed'].includes(j.status),
                )
                .map((j) => (
                  <li key={j.id} className="border border-[var(--border)] rounded-lg p-2 space-y-1">
                    <p>
                      <span className="font-semibold">{j.subject || '(no subject)'}</span>
                      {' · '}
                      {j.status.replace('_', ' ')}
                      {' · '}
                      {j.sendAudience}
                      {' · '}
                      {j.sendAt ? new Date(j.sendAt).toLocaleString() : ''}
                    </p>
                    {j.error ? <p className="text-red-700">{j.error}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      {canApprove && j.status === 'pending_approval' ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void jobAction('approve', j.id)}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {j.status === 'pending_approval' || j.status === 'scheduled' ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void jobAction('cancel', j.id)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[#5A6070]">No pending or scheduled jobs.</p>
          )}
        </div>

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
            Send email now
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
