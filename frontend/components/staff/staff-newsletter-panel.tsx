'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { defaultUtmCampaign } from '@/lib/staff/newsletter-utm'
import { NEWSLETTER_MERGE_HINT } from '@/lib/staff/newsletter-merge'
import {
  SCOOP_DEFAULT_SUBJECT,
  buildScoopShareText,
  resolveScoopUrl,
} from '@/lib/staff/newsletter-scoop'
import {
  NEWSLETTER_BEAT_PRESETS,
  NEWSLETTER_MAX_BEATS,
  composeNewsletterBody,
  defaultNewsletterBeats,
  emptyNewsletterBeat,
  parseBeatsJson,
  presetLabel,
  stringifyBeatsJson,
  type NewsletterBeat,
} from '@/lib/staff/newsletter-sections'
import { buildWhatsAppGraphicShare } from '@/lib/staff/whatsapp-compose'
import { uploadNewsletterPngFiles } from '@/lib/staff/newsletter-upload-client'
import {
  StaffNewsletterTemplatesPanel,
  type NewsletterCanvaMeta,
} from '@/components/staff/staff-newsletter-templates-panel'
import { StaffNewsletterStep } from '@/components/staff/staff-newsletter-step'
import { StaffNewsletterBrandingPanel } from '@/components/staff/staff-newsletter-branding-panel'

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
type NewsletterKind = 'paid' | 'scoop' | 'subscribers'

export function StaffNewsletterPanel() {
  const [emailConfigured, setEmailConfigured] = useState(false)
  const [waLinks, setWaLinks] = useState({ grade6: '', grade7: '', grade8: '' })
  const [testGroups, setTestGroups] = useState<TestGroups | null>(null)
  const [testGroup, setTestGroup] = useState<'me' | 'board' | 'board_and_custom'>('me')
  const [testEmailsExtra, setTestEmailsExtra] = useState('')
  const [sendAudience, setSendAudience] = useState<NewsletterKind>('paid')
  const [scoopUrl, setScoopUrl] = useState('')
  const [scoopIncludeSignups, setScoopIncludeSignups] = useState(true)
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
  const [useBeats, setUseBeats] = useState(false)
  const [intro, setIntro] = useState('')
  const [beats, setBeats] = useState<NewsletterBeat[]>(defaultNewsletterBeats)
  const [signoff, setSignoff] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [trackClicks, setTrackClicks] = useState(true)
  const [trackOpens, setTrackOpens] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [canvaMeta, setCanvaMeta] = useState<NewsletterCanvaMeta>({})
  const [alsoPortal, setAlsoPortal] = useState(true)
  const [busy, setBusy] = useState(false)
  const [beatUploadIdx, setBeatUploadIdx] = useState<number | null>(null)
  const beatFileRef = useRef<HTMLInputElement>(null)
  const attachFileRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<
    Array<{ key: string; filename: string; mimeType: string }>
  >([])
  const [senderPreview, setSenderPreview] = useState({ name: '', staffEmail: '' })
  const [canEditSiteCss, setCanEditSiteCss] = useState(false)
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
    try {
      const mr = await fetch('/api/staff/me')
      const md = await mr.json()
      if (mr.ok) {
        const name = String(md.name ?? md.boardTitle ?? md.email ?? '').trim()
        const staffEmail = String(md.email ?? '').trim().toLowerCase()
        setSenderPreview({ name, staffEmail })
        const roles = Array.isArray(md.roles) ? md.roles : []
        setCanEditSiteCss(Boolean(md.isAdmin || roles.includes('marketing') || roles.includes('admin')))
      }
    } catch {
      /* ignore */
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

  useEffect(() => {
    if (!useBeats) return
    setBody(composeNewsletterBody({ intro, beats, signoff }))
  }, [useBeats, intro, beats, signoff])

  function scoopLink() {
    return resolveScoopUrl(scoopUrl, canvaMeta.canvaViewUrl)
  }

  function scoopShareText() {
    return buildScoopShareText({
      subject: subject || SCOOP_DEFAULT_SUBJECT,
      body,
      url: scoopLink(),
    })
  }

  function beatsPayload() {
    return useBeats ? stringifyBeatsJson({ intro, beats, signoff }) : undefined
  }

  function pickBeatImage(index: number) {
    setBeatUploadIdx(index)
    beatFileRef.current?.click()
  }

  async function onBeatImageSelected(files: FileList | null) {
    const i = beatUploadIdx
    if (i === null || !files?.length) return
    setBusy(true)
    setStatus('')
    try {
      const uploaded = await uploadNewsletterPngFiles(files)
      const next = beats.slice()
      next[i] = {
        ...next[i],
        imageUrl: uploaded.heroImageUrl,
        imageKey: uploaded.heroImageKey,
      }
      setBeats(next)
      setStatus('Section image uploaded. It appears in the email between heading and body.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Section image upload failed')
    } finally {
      setBusy(false)
      setBeatUploadIdx(null)
      if (beatFileRef.current) beatFileRef.current.value = ''
    }
  }

  function clearBeatImage(index: number) {
    const next = beats.slice()
    next[index] = { ...next[index], imageUrl: '', imageKey: '', imageLinkUrl: '' }
    setBeats(next)
  }

  async function onAttachmentSelected(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setStatus('')
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
      setStatus(`Attached ${d.filename}.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Attachment upload failed')
    } finally {
      setBusy(false)
      if (attachFileRef.current) attachFileRef.current.value = ''
    }
  }

  function canvaPngBlock(): string | null {
    if (sendAudience !== 'paid') return null
    if (!canvaMeta.canvaDesignId?.trim()) return null
    if (canvaMeta.heroImageUrl?.trim()) return null
    return [
      'Canva is attached but the email PNG is not ready yet.',
      'In Templates above: Export PNG for email, or Upload PNG from Canva Download.',
      'Paid emails need the graphic above your text.',
    ].join('\n')
  }

  function outreachPayload(extra: Record<string, unknown> = {}) {
    const kind = sendAudience
    const emailBody = kind === 'scoop' ? scoopShareText() : body
    return {
      channel: 'email',
      subject: kind === 'scoop' ? subject || SCOOP_DEFAULT_SUBJECT : subject,
      body: emailBody,
      tier: kind === 'paid' ? (tier === 'free' || tier === 'all' ? 'paid' : tier) : kind === 'scoop' ? 'free' : tier,
      grade,
      alsoPortal: kind === 'subscribers' ? false : kind === 'scoop' ? extra.alsoPortal === true : alsoPortal,
      sendAudience: kind,
      includeSubscribers: kind === 'scoop' && scoopIncludeSignups,
      utmCampaign: utmCampaign.trim() || defaultUtmCampaign(subject || SCOOP_DEFAULT_SUBJECT),
      trackClicks,
      trackOpens,
      templateId: templateId || undefined,
      canvaViewUrl: canvaMeta.canvaViewUrl,
      canvaThumbnailUrl: canvaMeta.canvaThumbnailUrl,
      canvaTitle: canvaMeta.canvaTitle,
      canvaDesignId: canvaMeta.canvaDesignId,
      heroImageUrl: canvaMeta.heroImageUrl,
      extraImageUrls: (canvaMeta.pageImageUrls ?? []).slice(1),
      beatsJson: beatsPayload(),
      attachmentKeys: attachments.length ? attachments : undefined,
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
        `Preview: ${d.recipientCount} ${
          sendAudience === 'subscribers'
            ? 'footer signup'
            : sendAudience === 'scoop'
              ? 'free parent (Weekly Scoop link)'
              : sendAudience === 'paid'
                ? 'paid member'
                : 'member parent'
        }${d.recipientCount === 1 ? '' : 's'}` +
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
    const pngBlock = canvaPngBlock()
    if (pngBlock) {
      setStatus(pngBlock)
      return
    }
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
    const pngBlock = canvaPngBlock()
    if (pngBlock) {
      setStatus(pngBlock)
      return
    }
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
      const who =
        sendAudience === 'subscribers'
          ? 'footer signup'
          : sendAudience === 'scoop'
            ? 'free parent (Weekly Scoop link)'
            : sendAudience === 'paid'
              ? 'paid member'
              : 'member parent'
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
          message:
            sendAudience === 'scoop'
              ? scoopShareText()
              : [subject, body].filter(Boolean).join('\n\n'),
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
      const graphic = buildWhatsAppGraphicShare({
        message: plan.message,
        imageUrl: canvaMeta.heroImageUrl || canvaMeta.canvaThumbnailUrl,
      })
      if (graphic.imageUrl) {
        window.open(graphic.imageUrl, '_blank', 'noopener,noreferrer')
      }
      for (const url of plan.openUrls) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
      if (!plan.openUrls.length && plan.waMeShare) {
        window.open(plan.waMeShare, '_blank', 'noopener,noreferrer')
      }
      setStatus(
        `${plan.instructions} ${graphic.instructions} Message copied when clipboard allowed.`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'WhatsApp failed')
    } finally {
      setBusy(false)
    }
  }

  async function postScoopToPortal() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/membership/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'scoop-portal',
          subject: subject || SCOOP_DEFAULT_SUBJECT,
          body: scoopShareText(),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Portal post failed')
      setStatus(
        d.newsletterArchived
          ? 'Posted to member portal Messages for free parents (paid members will not see this scoop).'
          : d.error ?? 'Portal post failed',
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Portal post failed')
    } finally {
      setBusy(false)
    }
  }

  async function queueSend() {
    if (!sendAtLocal.trim()) {
      setStatus('Pick a send date and time first.')
      return
    }
    const pngBlock = canvaPngBlock()
    if (pngBlock) {
      setStatus(pngBlock)
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
    <section id="member-newsletter" className="scroll-mt-28 space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-white px-5 py-4">
        <h2 className="text-lg font-bold">Create newsletter</h2>
        <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
          Work top to bottom: audience, graphic, body, email look, then test and send.
          {emailConfigured
            ? ''
            : '\nGmail send is not ready. Connect Google in Staff → Inbox (president@).'}
        </p>
        {process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true' ? null : (
          <p className="text-xs text-[#5A6070] mt-2">
            <Link
              href="/staff?view=help&article=member-newsletter-diane"
              className="font-semibold text-[var(--brand-green)] hover:underline"
            >
              How this works
            </Link>
            {' · '}Canva PNG, test send, Weekly Scoop, schedule.
          </p>
        )}
      </div>

      <StaffNewsletterStep
        step={1}
        title="Who is this for?"
        description="Pick the audience, filters, and subject line."
        id="newsletter-step-audience"
      >
        <label className="text-xs text-[#5A6070] block">
          Who this is for
          <select
            value={sendAudience}
            onChange={(e) => {
              const v = e.target.value
              const next: NewsletterKind =
                v === 'scoop' || v === 'subscribers' || v === 'paid' ? v : 'paid'
              setSendAudience(next)
              if (next === 'paid' && (tier === 'all' || tier === 'free')) setTier('paid')
              if (next === 'scoop' && !subject.trim()) setSubject(SCOOP_DEFAULT_SUBJECT)
            }}
            className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="paid">Paid members (full email)</option>
            <option value="scoop">Weekly Scoop (free monthly link)</option>
            <option value="subscribers">
              Footer signup list only ({subscriberCount} email{subscriberCount === 1 ? '' : 's'})
            </option>
          </select>
        </label>

        {sendAudience === 'scoop' ? (
          <div
            data-help-shot="weekly-scoop"
            className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-2"
          >
            <p className="text-xs text-[#5A6070] whitespace-pre-line">
              Free audience gets a link, not the full newsletter in their inbox.
              Paste the Canva view link (or we use the attached Canva / the site newsletter page).
              Then export to WhatsApp and post to the member portal.
            </p>
            <label className="text-xs text-[#5A6070] block">
              Scoop link
              <input
                value={scoopUrl}
                onChange={(e) => setScoopUrl(e.target.value)}
                placeholder={resolveScoopUrl('', canvaMeta.canvaViewUrl)}
                className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[#5A6070]">
              <input
                type="checkbox"
                checked={scoopIncludeSignups}
                onChange={(e) => setScoopIncludeSignups(e.target.checked)}
              />
              If you email the scoop link, also include footer signups
            </label>
          </div>
        ) : null}

        <div className={`grid sm:grid-cols-3 gap-2 ${sendAudience === 'subscribers' ? 'opacity-50' : ''}`}>
          <select
            value={sendAudience === 'paid' && (tier === 'all' || tier === 'free') ? 'paid' : tier}
            onChange={(e) => setTier(e.target.value)}
            disabled={sendAudience === 'scoop' || sendAudience === 'subscribers'}
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            {sendAudience === 'paid' ? null : <option value="all">All members (free + paid)</option>}
            {sendAudience === 'paid' ? null : <option value="free">Free only</option>}
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

        <label className="text-xs text-[#5A6070] block">
          Subject / headline
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={sendAudience === 'scoop' ? SCOOP_DEFAULT_SUBJECT : 'Subject / headline'}
            className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          />
        </label>
      </StaffNewsletterStep>

      <StaffNewsletterStep
        step={2}
        title="Hero graphic"
        description="Attach Canva, upload PNG, or load a saved template."
        id="newsletter-step-graphic"
      >
        <StaffNewsletterTemplatesPanel
          subject={subject}
          body={body}
          utmCampaign={utmCampaign}
          beatsJson={stringifyBeatsJson({ intro, beats, signoff })}
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
              pageImageUrls: tpl.pageImageUrls,
            })
            const parsed = parseBeatsJson(tpl.beatsJson)
            if (parsed && composeNewsletterBody(parsed).trim()) {
              setUseBeats(true)
              setIntro(parsed.intro)
              setBeats(parsed.beats)
              setSignoff(parsed.signoff)
            } else {
              setUseBeats(false)
            }
            if (tpl.heroImageUrl || tpl.canvaThumbnailUrl) setTrackOpens(true)
          }}
        />
      </StaffNewsletterStep>

      <StaffNewsletterStep
        step={3}
        title="Newsletter body"
        description="Plain text or sections. Add optional section images and file attachments."
        id="newsletter-step-body"
        defaultOpen
      >
        <div data-help-shot="copy-tracking" className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-[#5A6070]">
          <input
            type="checkbox"
            checked={useBeats}
            onChange={(e) => setUseBeats(e.target.checked)}
          />
          Write in sections (intro, beats, sign-off). Optional PNG per section breaks up the text in email.
        </label>
        {useBeats ? (
          <div
            data-help-shot="beats"
            className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-3"
          >
            <StaffPlainCopyField
              label="Intro"
              value={intro}
              rows={2}
              onChange={setIntro}
              onCommit={(next) => setIntro(normalizePlainCopy(next))}
            />
            <input
              ref={beatFileRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={(e) => void onBeatImageSelected(e.target.files)}
            />
            {beats.map((beat, i) => {
              const preset = NEWSLETTER_BEAT_PRESETS.find((p) => p.id === beat.preset)
              return (
                <div
                  key={`beat-${i}`}
                  className="rounded-lg border border-[var(--border)] bg-white p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#1A1A1A]">
                      Section {i + 1}
                      {preset ? ` · ${preset.label}` : ''}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={beats.length <= 1}
                      onClick={() => setBeats(beats.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  </div>
                  {preset?.hint ? (
                    <p className="text-[11px] text-[#5A6070]">{preset.hint}</p>
                  ) : null}
                  <label className="text-xs text-[#5A6070] block">
                    Heading (bold in email)
                    <input
                      value={beat.heading}
                      onChange={(e) => {
                        const next = beats.slice()
                        next[i] = { ...next[i], heading: e.target.value }
                        setBeats(next)
                      }}
                      placeholder={presetLabel(beat.preset)}
                      className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                    />
                  </label>
                  <StaffPlainCopyField
                    label="Body"
                    value={beat.body}
                    rows={3}
                    onChange={(val) => {
                      const next = beats.slice()
                      next[i] = { ...next[i], body: val }
                      setBeats(next)
                    }}
                    onCommit={(val) => {
                      const next = beats.slice()
                      next[i] = { ...next[i], body: normalizePlainCopy(val) }
                      setBeats(next)
                    }}
                  />
                  <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => pickBeatImage(i)}
                      >
                        {beat.imageUrl ? 'Replace section image' : 'Upload section image'}
                      </Button>
                      {beat.imageUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => clearBeatImage(i)}
                        >
                          Remove image
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[#5A6070]">
                      Canva → Download PNG. Shows in email under the heading (social / event graphic).
                    </p>
                    {beat.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={beat.imageUrl}
                        alt=""
                        className="max-h-32 w-auto rounded border border-[var(--border)]"
                      />
                    ) : null}
                    <label className="text-xs text-[#5A6070] block">
                      Image link (optional)
                      <input
                        value={beat.imageLinkUrl ?? ''}
                        onChange={(e) => {
                          const next = beats.slice()
                          next[i] = { ...next[i], imageLinkUrl: e.target.value }
                          setBeats(next)
                        }}
                        placeholder="https://…"
                        className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              disabled={beats.length >= NEWSLETTER_MAX_BEATS}
              onClick={() => setBeats([...beats, emptyNewsletterBeat('custom')])}
            >
              Add section ({beats.length}/{NEWSLETTER_MAX_BEATS})
            </Button>
            <StaffPlainCopyField
              label="Sign-off"
              value={signoff}
              rows={2}
              onChange={setSignoff}
              onCommit={(next) => setSignoff(normalizePlainCopy(next))}
            />
          </div>
        ) : null}

        {useBeats ? (
          <textarea
            value={body}
            readOnly
            rows={8}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[#F5F5F3] text-[#5A6070]"
          />
        ) : (
          <StaffPlainCopyField
            label="Newsletter body"
            value={body}
            rows={8}
            hint="Press Enter for a new line. Paste links as plain text. No HTML."
            placeholder={
              sendAudience === 'scoop'
                ? 'Short note above the scoop link'
                : 'Newsletter body (paste links; UTM + tracking added on send)'
            }
            onChange={setBody}
            onCommit={(next) => setBody(normalizePlainCopy(next))}
          />
        )}
        <p className="text-[11px] text-[#5A6070]">{NEWSLETTER_MERGE_HINT}</p>

        <div className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-2">
          <p className="text-sm font-semibold text-[#1A1A1A]">Attachments (optional)</p>
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
          {attachments.length ? (
            <ul className="text-xs text-[#5A6070] space-y-1">
              {attachments.map((a) => (
                <li key={a.key} className="flex items-center gap-2">
                  <span>{a.filename}</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.key !== a.key))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        </div>
      </StaffNewsletterStep>

      <StaffNewsletterStep
        step={4}
        title="Email look"
        description="Logo, header, footer, and CSS templates. Preview with filler text before you send."
        id="newsletter-branding"
        defaultOpen={false}
      >
        <StaffNewsletterBrandingPanel embedded canEditSiteTemplates={canEditSiteCss} />
      </StaffNewsletterStep>

      <StaffNewsletterStep
        step={5}
        title="Test, review & send"
        description="Test to board, tune tracking, schedule, or send now."
        id="newsletter-step-send"
      >
        {senderPreview.staffEmail ? (
          <p className="text-xs text-[#5A6070]">
            Sending as{' '}
            <span className="font-semibold text-[#1A1A1A]">
              {senderPreview.name || senderPreview.staffEmail}
            </span>{' '}
            ({senderPreview.staffEmail})
          </p>
        ) : null}

        <div
          data-help-shot="test-send"
          className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-[#1A1A1A]">Test send</p>
          <p className="text-xs text-[#5A6070] whitespace-pre-line">
            Subject is prefixed with [TEST]. Does not post to the portal or archive.
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
                <option value="board">Board test group</option>
                <option value="board_and_custom">Board + Site Settings test list</option>
              </select>
            </label>
            <label className="text-xs text-[#5A6070]">
              Extra test emails
              <input
                value={testEmailsExtra}
                onChange={(e) => setTestEmailsExtra(e.target.value)}
                placeholder="you@gmail.com"
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

        {sendAudience === 'scoop' ? null : (
        <label className="flex items-center gap-2 text-xs text-[#5A6070]">
          <input
            type="checkbox"
            checked={sendAudience === 'subscribers' ? false : alsoPortal}
            disabled={sendAudience === 'subscribers'}
            onChange={(e) => setAlsoPortal(e.target.checked)}
          />
          Also post to parent portal inbox when sending email
          {sendAudience === 'subscribers'
            ? ' (signup list is email-only)'
            : sendAudience === 'paid'
              ? ' (paid parents only in Messages)'
              : ''}
        </label>
        )}

        <div
          data-help-shot="schedule-approval"
          className="rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-4 space-y-2"
        >
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

        <div data-help-shot="send-actions" className="flex flex-wrap gap-2">
          {sendAudience === 'scoop' ? (
            <>
              <Button
                type="button"
                disabled={busy || (!subject && !body)}
                className="text-white"
                style={{ backgroundColor: 'var(--brand-green)' }}
                onClick={() => void openWhatsApp()}
              >
                Copy + open WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || (!subject && !body)}
                onClick={() => void postScoopToPortal()}
              >
                Post scoop to portal
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || (!subject && !body)}
                onClick={() => void preview()}
              >
                Preview free + signup recipients
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || (!subject && !body)}
                onClick={() => void sendEmail()}
              >
                Email scoop link
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        {status ? <p className="text-sm text-[#1A1A1A] whitespace-pre-line">{status}</p> : null}
      </StaffNewsletterStep>
    </section>
  )
}
