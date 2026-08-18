'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type {
  WhatsAppQueueAttachment,
  WhatsAppQueueItem,
} from '@/lib/staff/whatsapp-queue'
import { WHATSAPP_ATTACHMENT_MAX } from '@/lib/staff/whatsapp-queue'

type Links = { grade6: string; grade7: string; grade8: string }

function gradeLabel(grade: string) {
  if (grade === '6') return '6th grade'
  if (grade === '7') return '7th grade'
  if (grade === '8') return '8th grade'
  return 'All grades'
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultSendAtLocal() {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  return toLocalInputValue(d.toISOString())
}

function formatBytes(n?: number) {
  if (!n || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

async function downloadAttachment(att: WhatsAppQueueAttachment) {
  const qs = new URLSearchParams({
    url: att.url,
    fileName: att.fileName,
  })
  const r = await fetch(`/api/staff/whatsapp-queue/download?${qs.toString()}`)
  if (!r.ok) {
    const d = (await r.json().catch(() => ({}))) as { error?: string }
    throw new Error(d.error || 'Could not download attachment')
  }
  const blob = await r.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = att.fileName || 'whatsapp-attachment'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
}

async function openWhatsAppPlan(plan: {
  message: string
  openUrls: string[]
  waMeShare: string
  instructions: string
  attachments?: WhatsAppQueueAttachment[]
}) {
  if (plan.message) {
    try {
      await navigator.clipboard.writeText(plan.message)
    } catch {
      // clipboard may be blocked on some mobile browsers
    }
  }

  const attachments = plan.attachments ?? []
  for (const att of attachments) {
    try {
      await downloadAttachment(att)
    } catch {
      // Fall back to opening the file URL so staff can Save Image / Share
      window.open(att.url, '_blank', 'noopener,noreferrer')
    }
  }

  for (const url of plan.openUrls) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  if (!plan.openUrls.length && plan.waMeShare) {
    window.open(plan.waMeShare, '_blank', 'noopener,noreferrer')
  }
}

function AttachmentList({
  attachments,
  onRemove,
}: {
  attachments: WhatsAppQueueAttachment[]
  onRemove?: (index: number) => void
}) {
  if (!attachments.length) return null
  return (
    <ul className="space-y-1.5">
      {attachments.map((att, i) => (
        <li
          key={`${att.url}-${i}`}
          className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[#FAFAF8] px-3 py-2 text-xs"
        >
          <div className="min-w-0">
            <p className="font-semibold text-[#1A1A1A] truncate">{att.fileName}</p>
            <p className="text-[#5A6070]">
              {att.mimeType}
              {att.size ? ` · ${formatBytes(att.size)}` : ''}
            </p>
          </div>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="shrink-0 text-[#5A6070] underline"
            >
              Remove
            </button>
          ) : (
            <span className="shrink-0 text-[var(--brand-green)] font-semibold">Attached</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function StaffWhatsAppQueuePanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [due, setDue] = useState<WhatsAppQueueItem[]>([])
  const [upcoming, setUpcoming] = useState<WhatsAppQueueItem[]>([])
  const [recent, setRecent] = useState<WhatsAppQueueItem[]>([])
  const [links, setLinks] = useState<Links>({ grade6: '', grade7: '', grade8: '' })
  const [message, setMessage] = useState('')
  const [grade, setGrade] = useState('all')
  const [sendAt, setSendAt] = useState(defaultSendAtLocal)
  const [attachments, setAttachments] = useState<WhatsAppQueueAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [status, setStatus] = useState('')

  const configuredCount = useMemo(
    () => [links.grade6, links.grade7, links.grade8].filter((u) => u.trim()).length,
    [links],
  )

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/whatsapp-queue')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setDue(d.due ?? [])
    setUpcoming(d.upcoming ?? [])
    setRecent(d.recent ?? [])
    setLinks(d.whatsapp ?? { grade6: '', grade7: '', grade8: '' })
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
    const t = window.setInterval(() => {
      void load().catch(() => {})
    }, 60_000)
    return () => window.clearInterval(t)
  }, [load])

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return
    const room = WHATSAPP_ATTACHMENT_MAX - attachments.length
    if (room <= 0) {
      setStatus(`Up to ${WHATSAPP_ATTACHMENT_MAX} attachments per message.`)
      return
    }
    setUploading(true)
    setStatus('')
    try {
      const next = [...attachments]
      for (const file of Array.from(files).slice(0, room)) {
        const body = new FormData()
        body.set('file', file)
        const r = await fetch('/api/staff/whatsapp-queue/upload', {
          method: 'POST',
          body,
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? `Upload failed for ${file.name}`)
        next.push(d.attachment as WhatsAppQueueAttachment)
      }
      setAttachments(next)
      setStatus(
        next.length === 1
          ? 'Attachment ready. When confirmed, it will download so you can add it in WhatsApp.'
          : `${next.length} attachments ready.`,
      )
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function schedule() {
    setScheduling(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/whatsapp-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule',
          message,
          grade,
          sendAt: new Date(sendAt).toISOString(),
          attachments,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not schedule')
      setMessage('')
      setAttachments([])
      setStatus(`Scheduled for ${new Date(d.item.sendAt).toLocaleString()}.`)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not schedule')
    } finally {
      setScheduling(false)
    }
  }

  async function confirm(id: string) {
    setBusyId(id)
    setStatus('')
    try {
      const r = await fetch('/api/staff/whatsapp-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Confirm failed')
      await openWhatsAppPlan(d.plan)
      const hasFiles = (d.plan.attachments?.length ?? 0) > 0
      setStatus(
        hasFiles
          ? 'Message copied. Attachment(s) downloading. In WhatsApp: paste the text, tap +, add the saved file(s), then Send.'
          : `${d.plan.instructions} Message copied when clipboard allows. Paste in WhatsApp and tap Send.`,
      )
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Confirm failed')
    } finally {
      setBusyId('')
    }
  }

  async function cancel(id: string) {
    setBusyId(id)
    setStatus('')
    try {
      const r = await fetch('/api/staff/whatsapp-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Cancel failed')
      setStatus('Cancelled.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setBusyId('')
    }
  }

  return (
    <section
      id="whatsapp-queue"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-4 sm:p-5 space-y-5"
    >
      <div>
        <h2 className="text-lg font-bold">WhatsApp grade queue</h2>
        <p className="text-xs text-[#5A6070] mt-1 leading-relaxed">
          Schedule a grade-group message (optional flyer/PDF), then any logged-in staffer taps
          Confirm when due. That copies the text, downloads attachments to your device, and opens
          the group link. In WhatsApp: paste, attach the saved file, Send. Meta does not allow
          auto-posting into groups. {configuredCount}/3 grade invite links configured in Site
          Settings.
        </p>
      </div>

      {due.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--brand-green)]">
            Ready to confirm ({due.length})
          </p>
          {due.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border-2 border-[var(--brand-green)] bg-[#FAFCF9] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-[#1A1A1A]">{gradeLabel(item.grade)}</p>
                <p className="text-xs text-[#5A6070]">
                  Due {new Date(item.sendAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">
                {item.message}
              </p>
              <AttachmentList attachments={item.attachments ?? []} />
              <Button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => void confirm(item.id)}
                className="w-full min-h-12 text-base font-bold text-white"
                style={{ backgroundColor: 'var(--brand-green)' }}
              >
                {busyId === item.id
                  ? 'Opening…'
                  : item.attachments?.length
                    ? 'Confirm · copy · save file · open WhatsApp'
                    : 'Confirm & open WhatsApp'}
              </Button>
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => void cancel(item.id)}
                className="w-full text-xs text-[#5A6070] underline"
              >
                Cancel this send
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#5A6070] rounded-lg bg-[var(--brand-warm)] px-3 py-2">
          Nothing due right now. Scheduled messages appear here when their time arrives.
        </p>
      )}

      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#5A6070]">
          Schedule a message
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Message for the grade WhatsApp group…"
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading || attachments.length >= WHATSAPP_ATTACHMENT_MAX}
              onClick={() => fileRef.current?.click()}
              className="text-xs"
            >
              {uploading
                ? 'Uploading…'
                : attachments.length
                  ? `Add another file (${attachments.length}/${WHATSAPP_ATTACHMENT_MAX})`
                  : 'Attach file (image, PDF, MP4)'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => void onPickFiles(e.target.files)}
            />
            <p className="text-[11px] text-[#5A6070]">
              Up to {WHATSAPP_ATTACHMENT_MAX} files, 12MB each. Saved to your phone/computer on
              Confirm so you can attach in WhatsApp.
            </p>
          </div>
          <AttachmentList
            attachments={attachments}
            onRemove={(index) =>
              setAttachments((prev) => prev.filter((_, i) => i !== index))
            }
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm min-h-11"
          >
            <option value="all">All grade groups</option>
            <option value="6">6th grade</option>
            <option value="7">7th grade</option>
            <option value="8">8th grade</option>
          </select>
          <input
            type="datetime-local"
            value={sendAt}
            onChange={(e) => setSendAt(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm min-h-11"
          />
        </div>
        <Button
          type="button"
          disabled={scheduling || uploading || !message.trim() || !sendAt}
          onClick={() => void schedule()}
          className="w-full sm:w-auto text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {scheduling ? 'Saving…' : 'Add to queue'}
        </Button>
      </div>

      {upcoming.length > 0 ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5A6070]">
            Upcoming ({upcoming.length})
          </p>
          <ul className="space-y-2">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="font-semibold text-[#1A1A1A]">
                    {gradeLabel(item.grade)} · {new Date(item.sendAt).toLocaleString()}
                  </p>
                  <p className="text-[#5A6070] line-clamp-2">{item.message}</p>
                  {(item.attachments?.length ?? 0) > 0 ? (
                    <p className="text-[11px] text-[var(--brand-green)] font-semibold">
                      {item.attachments!.length} attachment
                      {item.attachments!.length === 1 ? '' : 's'}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(busyId)}
                    onClick={() => void confirm(item.id)}
                    className="text-xs"
                  >
                    Send now
                  </Button>
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => void cancel(item.id)}
                    className="text-xs text-[#5A6070] underline px-1"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div className="space-y-2 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#5A6070]">Recent</p>
          <ul className="space-y-1.5 text-xs text-[#5A6070]">
            {recent.map((item) => (
              <li key={item.id}>
                {item.status === 'sent' ? 'Sent' : 'Cancelled'} · {gradeLabel(item.grade)} ·{' '}
                {item.confirmedByName || item.confirmedByEmail || 'staff'} ·{' '}
                {new Date(item.confirmedAt || item.createdAt).toLocaleString()}
                {(item.attachments?.length ?? 0) > 0
                  ? ` · ${item.attachments!.length} file${item.attachments!.length === 1 ? '' : 's'}`
                  : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {status ? <p className="text-sm text-[var(--brand-green)]">{status}</p> : null}
    </section>
  )
}
