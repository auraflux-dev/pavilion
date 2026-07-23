'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'

type HubTab = 'inbox' | 'calendar' | 'docs'

type Status = {
  connected: boolean
  connectAvailable: boolean
  delegationConfigured: boolean
  setupHint: string | null
  email: string
}

type MailItem = {
  id: string
  from: string
  subject: string
  snippet: string
  date: string
  unread: boolean
  messageCount?: number
  participants?: string[]
}

type MailDetail = MailItem & {
  bodyText: string
  bodyHtml: string
  threadId?: string
  attachments?: { filename: string; mimeType: string; size: number; attachmentId: string }[]
}

function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function MailBody({ text, html }: { text: string; html: string }) {
  const rich = html.trim()
  const plain = text.trim()
  // Prefer full HTML when it is meaningfully longer than the plain stub
  if (rich && (!plain || rich.length > plain.length * 1.2 || plain.length < 80)) {
    return (
      <iframe
        title="Email body"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8" /><base target="_blank" rel="noopener" /><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.45;color:#1A1A1A;margin:0;padding:8px;word-break:break-word;}a{color:#085508;}img{max-width:100%;height:auto;}</style></head><body>${sanitizeEmailHtml(rich)}</body></html>`}
        className="w-full min-h-[12rem] max-h-[28rem] rounded-md border border-[#E8E4DC] bg-white"
      />
    )
  }
  return <div className="text-sm whitespace-pre-wrap">{plain || '(No message body)'}</div>
}

type ThreadDetail = {
  id: string
  subject: string
  messages: MailDetail[]
}

type Folder = { id: string; name: string; type: string; messagesUnread?: number }

type CalEvent = {
  id: string
  summary: string
  description: string
  start: string
  end: string
  location: string
  htmlLink: string
  meetingLink?: string
  allDay: boolean
  attachments?: { title: string; fileUrl: string; mimeType: string }[]
}

type DocFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  webViewLink: string
}

/** In-portal Google file URL (no new-tab jump). */
function staffDocEmbedUrl(f: DocFile): string {
  const id = f.id
  switch (f.mimeType) {
    case 'application/vnd.google-apps.document':
      return `https://docs.google.com/document/d/${id}/edit?usp=embedded`
    case 'application/vnd.google-apps.spreadsheet':
      return `https://docs.google.com/spreadsheets/d/${id}/edit?usp=embedded`
    case 'application/vnd.google-apps.presentation':
      return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=60000`
    case 'application/pdf':
      return `https://drive.google.com/file/d/${id}/preview`
    default:
      return `https://drive.google.com/file/d/${id}/preview`
  }
}

type PendingFile = { filename: string; mimeType: string; dataBase64: string }

function formatWhen(iso: string, allDay?: boolean) {
  if (!iso) return ''
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function filesToAttachments(files: FileList | null): Promise<PendingFile[]> {
  if (!files?.length) return []
  const out: PendingFile[] = []
  for (const file of Array.from(files)) {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
    out.push({
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      dataBase64: btoa(binary),
    })
  }
  return out
}

function AttachFilesButton({ onPick }: { onPick: (list: FileList | null) => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          void onPick(e.target.files)
          e.target.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        aria-label="Attach files"
        title="Attach files"
        className="px-2.5"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" aria-hidden />
      </Button>
    </>
  )
}

/**
 * Per-staff Google Workspace hub: mail (compose/reply/forward/archive/folders), calendar, docs.
 * Sapling grammar check on compose/reply (server-side SAPLING_API_KEY).
 */
export function StaffWorkspaceHub({ tab }: { tab: HubTab }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleJustConnected, setGoogleJustConnected] = useState(false)

  const [threads, setThreads] = useState<MailItem[]>([])
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [activeLabelId, setActiveLabelId] = useState('INBOX')
  const [newFolderName, setNewFolderName] = useState('')
  const [foldersSyncedAt, setFoldersSyncedAt] = useState('')

  const [mode, setMode] = useState<'read' | 'compose' | 'forward'>('read')
  const [reply, setReply] = useState('')
  const [includeSignature, setIncludeSignature] = useState(true)
  const [signature, setSignature] = useState('')
  const [signatureDraft, setSignatureDraft] = useState('')
  const [signatureOpen, setSignatureOpen] = useState(false)

  const [composeTo, setComposeTo] = useState('')
  const [composeCc, setComposeCc] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [grammarBusy, setGrammarBusy] = useState(false)
  const [grammarNote, setGrammarNote] = useState('')

  const [events, setEvents] = useState<CalEvent[]>([])
  const [docs, setDocs] = useState<DocFile[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)

  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [embedTitle, setEmbedTitle] = useState('')
  const embedPanelRef = useRef<HTMLDivElement>(null)

  const loadStatus = useCallback(async () => {
    const r = await fetch('/api/staff/workspace/status')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Status failed')
    setStatus(d)
    return d as Status
  }, [])

  const loadSignature = useCallback(async () => {
    const r = await fetch('/api/staff/workspace/signature')
    const d = await r.json()
    if (!r.ok) return
    setSignature(String(d.signature ?? ''))
    setSignatureDraft(String(d.signature ?? ''))
  }, [])

  const loadFolders = useCallback(async () => {
    const r = await fetch('/api/staff/workspace/labels')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Folders failed')
    setFolders(d.folders ?? [])
    setFoldersSyncedAt(String(d.syncedAt ?? new Date().toISOString()))
  }, [])

  const loadMail = useCallback(async (labelId = activeLabelId) => {
    const q =
      labelId && labelId !== 'INBOX'
        ? `/api/staff/workspace/mail?labelId=${encodeURIComponent(labelId)}`
        : '/api/staff/workspace/mail'
    const r = await fetch(q)
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Mail failed')
    setThreads(d.threads ?? [])
  }, [activeLabelId])

  const loadCalendar = useCallback(async () => {
    const r = await fetch('/api/staff/workspace/calendar')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Calendar failed')
    setEvents(d.events ?? [])
  }, [])

  const loadDocs = useCallback(async () => {
    const r = await fetch('/api/staff/workspace/docs')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Docs failed')
    setDocs(d.files ?? [])
  }, [])

  useEffect(() => {
    if (searchParams.get('google') !== 'connected') return
    setGoogleJustConnected(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('google')
    const qs = params.toString()
    router.replace(qs ? `/staff?${qs}` : '/staff?view=inbox')
  }, [searchParams, router])

  useEffect(() => {
    setSelectedEvent(null)
    setEmbedUrl(null)
    setEmbedTitle('')
  }, [tab])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBusy(true)
      setError('')
      try {
        const s = await loadStatus()
        if (cancelled) return
        await loadSignature()
        if (!s.connected) return
        if (tab === 'inbox') {
          await loadFolders()
          await loadMail(activeLabelId)
        }
        if (tab === 'calendar') await loadCalendar()
        if (tab === 'docs') await loadDocs()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Load failed')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tab, activeLabelId, loadStatus, loadSignature, loadFolders, loadMail, loadCalendar, loadDocs])

  async function openThread(threadId: string) {
    setBusy(true)
    setError('')
    setMode('read')
    try {
      const r = await fetch(`/api/staff/workspace/mail?threadId=${encodeURIComponent(threadId)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Open failed')
      const thread = d.thread as ThreadDetail
      setSelectedThread(thread)
      const last = thread.messages[thread.messages.length - 1]
      setReplyToMessageId(last?.id ?? null)
      setReply('')
      setPendingFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Open failed')
    } finally {
      setBusy(false)
    }
  }

  function replyTargetMessage(): MailDetail | null {
    if (!selectedThread?.messages.length) return null
    const hit = selectedThread.messages.find((m) => m.id === replyToMessageId)
    return hit ?? selectedThread.messages[selectedThread.messages.length - 1] ?? null
  }

  async function onPickFiles(list: FileList | null) {
    try {
      const files = await filesToAttachments(list)
      setPendingFiles((prev) => [...prev, ...files])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read files')
    }
  }

  async function sendReply() {
    const target = replyTargetMessage()
    if (!target || !reply.trim()) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/workspace/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          messageId: target.id,
          body: reply,
          includeSignature,
          attachments: pendingFiles,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Reply failed')
      setReply('')
      setPendingFiles([])
      setError('Reply sent.')
      await loadMail()
      if (selectedThread) await openThread(selectedThread.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reply failed')
    } finally {
      setBusy(false)
    }
  }

  async function sendComposeOrForward() {
    if (!composeTo.trim()) return
    setBusy(true)
    setError('')
    try {
      const forwardTarget = replyTargetMessage()
      const isForward = mode === 'forward' && forwardTarget
      const r = await fetch('/api/staff/workspace/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isForward
            ? {
                action: 'forward',
                messageId: forwardTarget.id,
                to: composeTo,
                cc: composeCc,
                body: composeBody,
                includeSignature,
                attachments: pendingFiles,
              }
            : {
                action: 'compose',
                to: composeTo,
                cc: composeCc,
                subject: composeSubject,
                body: composeBody,
                includeSignature,
                attachments: pendingFiles,
              },
        ),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Send failed')
      setComposeTo('')
      setComposeCc('')
      setComposeSubject('')
      setComposeBody('')
      setPendingFiles([])
      setMode('read')
      setError(isForward ? 'Forwarded.' : 'Email sent.')
      await loadMail()
      if (isForward && selectedThread) await openThread(selectedThread.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  async function archiveSelected() {
    if (!selectedThread) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/workspace/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', threadId: selectedThread.id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Archive failed')
      setSelectedThread(null)
      setReplyToMessageId(null)
      setError('Thread archived (removed from Inbox).')
      await Promise.all([loadMail(), loadFolders()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  async function moveSelected(labelId: string) {
    if (!selectedThread || !labelId) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/workspace/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          threadId: selectedThread.id,
          labelId,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Move failed')
      setSelectedThread(null)
      setReplyToMessageId(null)
      setError('Thread moved to folder.')
      await Promise.all([loadMail(), loadFolders()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed')
    } finally {
      setBusy(false)
    }
  }

  async function syncFolders() {
    setBusy(true)
    setError('')
    try {
      await loadFolders()
      setError('Folders synced from Gmail.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Folder sync failed')
    } finally {
      setBusy(false)
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/workspace/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Create folder failed')
      setNewFolderName('')
      await loadFolders()
      setError(`Folder “${d.label?.name ?? newFolderName}” created (synced with Gmail).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create folder failed')
    } finally {
      setBusy(false)
    }
  }

  async function checkGrammar(
    text: string,
    apply: (next: string) => void,
    context: 'compose' | 'reply' | 'forward',
  ) {
    if (!text.trim()) {
      setGrammarNote('Nothing to check.')
      return
    }
    setGrammarBusy(true)
    setGrammarNote('')
    setError('')
    try {
      const r = await fetch('/api/staff/workspace/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Grammar check failed')
      const next = String(d.appliedText ?? text)
      apply(next)
      const n = Number(d.editCount ?? 0)
      setGrammarNote(n === 0 ? 'Looks good. No edits suggested.' : `Applied ${n} Sapling edit${n === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grammar check failed')
    } finally {
      setGrammarBusy(false)
    }
  }

  async function saveSignature() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/workspace/signature', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signatureDraft }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save signature')
      setSignature(signatureDraft)
      setSignatureOpen(false)
      setError('Signature saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save signature')
    } finally {
      setBusy(false)
    }
  }

  function startCompose() {
    setMode('compose')
    setSelectedThread(null)
    setReplyToMessageId(null)
    setSignatureOpen(false)
    setComposeTo('')
    setComposeCc('')
    setComposeSubject('')
    setComposeBody('')
    setPendingFiles([])
  }

  function startForward() {
    const target = replyTargetMessage()
    if (!target) return
    setMode('forward')
    setComposeTo('')
    setComposeCc('')
    setComposeSubject(
      target.subject.toLowerCase().startsWith('fwd:')
        ? target.subject
        : `Fwd: ${target.subject}`,
    )
    setComposeBody('')
    setPendingFiles([])
  }

  const title =
    tab === 'inbox' ? 'Inbox' : tab === 'calendar' ? 'My calendar' : 'Docs'

  const moveFolders = folders.filter((f) => f.type === 'user')
  const folderLabel = (f: Folder) =>
    f.id === 'INBOX'
      ? 'Inbox'
      : f.id === 'SENT'
        ? 'Sent'
        : f.id === 'DRAFT'
          ? 'Drafts'
          : f.id === 'TRASH'
            ? 'Trash'
            : f.id === 'SPAM'
              ? 'Spam'
              : f.id === 'STARRED'
                ? 'Starred'
                : f.id === 'IMPORTANT'
                  ? 'Important'
                  : f.name

  const sidebarFolders =
    folders.length > 0
      ? folders
      : [{ id: 'INBOX', name: 'INBOX', type: 'system' as const, messagesUnread: 0 }]

  const inboxFolder = sidebarFolders.find((f) => f.id === 'INBOX')
  const userSidebarFolders = sidebarFolders.filter((f) => f.type === 'user')
  const systemSidebarFolders = sidebarFolders.filter(
    (f) => f.id !== 'INBOX' && f.type !== 'user',
  )

  function selectFolder(labelId: string) {
    setActiveLabelId(labelId)
    setSelectedThread(null)
    setReplyToMessageId(null)
    setMode('read')
  }

  function FolderRow({ f }: { f: Folder }) {
    const unread = f.messagesUnread ?? 0
    const active = activeLabelId === f.id
    return (
      <button
        type="button"
        onClick={() => selectFolder(f.id)}
        className={`w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
          active ? 'bg-[#E8F3E8] text-[#085508] font-semibold' : 'hover:bg-[#F7F5F0] text-[#1A1A1A]'
        }`}
      >
        <span className="truncate">{folderLabel(f)}</span>
        {unread > 0 ? (
          <span
            className={`shrink-0 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums ${
              active ? 'bg-[#085508] text-white' : 'bg-[#085508]/15 text-[#085508]'
            }`}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-xs text-[#5A6070] mt-1">
            Your Google Workspace. Same account as {status?.email || 'your @shmspto.org login'}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'inbox' && status?.connected ? (
            <Button
              type="button"
              className="text-white"
              style={{ backgroundColor: '#085508' }}
              onClick={startCompose}
            >
              New email
            </Button>
          ) : null}
          {tab === 'inbox' ? (
            <Button type="button" variant="outline" onClick={() => setSignatureOpen((o) => !o)}>
              {signatureOpen ? 'Close signature' : 'Email signature'}
            </Button>
          ) : null}
          {status && !status.connected && status.connectAvailable ? (
            <Button asChild className="text-white" style={{ backgroundColor: '#085508' }}>
              <a href="/api/staff/workspace/connect">Connect Google</a>
            </Button>
          ) : null}
        </div>
      </div>

      {signatureOpen ? (
        <div className="rounded-lg border border-[#E8E4DC] bg-[#F7F5F0] p-3 space-y-2">
          <p className="text-xs text-[#5A6070]">
            Appended to new emails, replies, and forwards when “Include signature” is checked.
          </p>
          <textarea
            value={signatureDraft}
            onChange={(e) => setSignatureDraft(e.target.value)}
            rows={5}
            placeholder={'Jane Doe\nVP Membership · SHMS PTO\nmembership@shmspto.org'}
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm bg-white"
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => void saveSignature()}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            Save signature
          </Button>
        </div>
      ) : null}

      {status && !status.connected ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {status.setupHint || 'Google Workspace is not connected yet.'}
        </div>
      ) : null}

      {googleJustConnected && status?.connected ? (
        <div className="rounded-lg border border-[#085508]/30 bg-[#E8F3E8] px-3 py-2 text-xs text-[#085508]">
          <p className="font-bold">Google connected as {status.email}</p>
          <p className="mt-1 text-[#1A1A1A]/80">
            This is your Workspace inbox (same mail as Gmail). Bold rows are unread. Purchase
            confirmation and form-notify emails send from a connected mailbox (membership@ /
            treasurer@ preferred).
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {busy && !threads.length && !events.length && !docs.length ? (
        <p className="text-xs text-[#5A6070]">Loading…</p>
      ) : null}

      {tab === 'inbox' && status?.connected && (mode === 'compose' || mode === 'forward') ? (
        <div className="rounded-lg border border-[#E8E4DC] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold">{mode === 'forward' ? 'Forward' : 'New email'}</p>
            <button
              type="button"
              className="text-xs font-bold underline text-[#085508]"
              onClick={() => setMode('read')}
            >
              Cancel
            </button>
          </div>
          <input
            value={composeTo}
            onChange={(e) => setComposeTo(e.target.value)}
            placeholder="To (email)"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={composeCc}
            onChange={(e) => setComposeCc(e.target.value)}
            placeholder="Cc (optional)"
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          {mode === 'compose' ? (
            <input
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
            />
          ) : (
            <p className="text-xs text-[#5A6070]">Subject: {composeSubject}</p>
          )}
          <textarea
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            rows={8}
            placeholder={mode === 'forward' ? 'Add a note above the forwarded message…' : 'Message'}
            className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={grammarBusy || !composeBody.trim()}
              onClick={() =>
                void checkGrammar(composeBody, setComposeBody, mode === 'forward' ? 'forward' : 'compose')
              }
            >
              {grammarBusy ? 'Checking…' : 'Check grammar'}
            </Button>
            <AttachFilesButton onPick={onPickFiles} />
            {grammarNote ? <p className="text-xs text-[#5A6070]">{grammarNote}</p> : null}
          </div>
          {pendingFiles.length ? (
            <ul className="text-xs text-[#5A6070] space-y-0.5">
              {pendingFiles.map((f) => (
                <li key={f.filename + f.dataBase64.slice(0, 12)}>{f.filename}</li>
              ))}
            </ul>
          ) : null}
          <label className="flex items-center gap-2 text-xs text-[#5A6070]">
            <input
              type="checkbox"
              checked={includeSignature}
              onChange={(e) => setIncludeSignature(e.target.checked)}
            />
            Include signature
          </label>
          <Button
            disabled={
              busy ||
              !composeTo.trim() ||
              (mode === 'compose' && (!composeSubject.trim() || !composeBody.trim()))
            }
            onClick={() => void sendComposeOrForward()}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
          >
            {mode === 'forward' ? 'Send forward' : 'Send email'}
          </Button>
        </div>
      ) : null}

      {tab === 'inbox' && status?.connected && mode === 'read' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1.15fr)] gap-3 min-h-[520px]">
          {/* Folders sidebar */}
          <aside className="border border-[#E8E4DC] rounded-lg flex flex-col min-h-0 max-h-[520px] bg-[#FBFBF9]">
            <div className="px-2.5 py-2 border-b border-[#E8E4DC] flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#5A6070]">Folders</p>
              <button
                type="button"
                className="text-[11px] font-bold underline text-[#085508]"
                disabled={busy}
                onClick={() => void syncFolders()}
              >
                Sync
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5" aria-label="Mail folders">
              {inboxFolder ? <FolderRow f={inboxFolder} /> : <FolderRow f={{ id: 'INBOX', name: 'INBOX', type: 'system' }} />}
              {userSidebarFolders.length ? (
                <>
                  <p className="px-2.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-[#5A6070]">
                    Labels
                  </p>
                  {userSidebarFolders.map((f) => (
                    <FolderRow key={f.id} f={f} />
                  ))}
                </>
              ) : null}
              {systemSidebarFolders.length ? (
                <>
                  <p className="px-2.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-[#5A6070]">
                    Mailboxes
                  </p>
                  {systemSidebarFolders.map((f) => (
                    <FolderRow key={f.id} f={f} />
                  ))}
                </>
              ) : null}
            </nav>
            <div className="border-t border-[#E8E4DC] p-2 space-y-1.5">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder"
                className="w-full border border-[#E8E4DC] rounded-md px-2 py-1.5 text-xs bg-white"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs h-8"
                disabled={busy || !newFolderName.trim()}
                onClick={() => void createFolder()}
              >
                Add folder
              </Button>
            </div>
          </aside>

          {/* Thread list */}
          <div className="border border-[#E8E4DC] rounded-lg max-h-[520px] overflow-auto divide-y min-h-0">
            <div className="sticky top-0 bg-white px-3 py-2 border-b border-[#E8E4DC] z-10">
              <p className="text-xs font-bold text-[#1A1A1A]">
                {folderLabel(
                  sidebarFolders.find((f) => f.id === activeLabelId) ?? {
                    id: activeLabelId,
                    name: activeLabelId,
                    type: 'user',
                  },
                )}
              </p>
            </div>
            {threads.length === 0 ? (
              <p className="p-3 text-sm text-[#5A6070]">No conversations in this folder.</p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void openThread(t.id)}
                  className={`w-full text-left p-3 hover:bg-[#F7F5F0] ${
                    selectedThread?.id === t.id ? 'bg-[#F0F7F0]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${t.unread ? 'font-bold' : 'font-medium'}`}>{t.subject}</p>
                    {(t.messageCount ?? 1) > 1 ? (
                      <span className="shrink-0 text-[10px] font-semibold text-[#5A6070] tabular-nums">
                        {t.messageCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[#5A6070] truncate">{t.from}</p>
                  <p className="text-[11px] text-[#5A6070] line-clamp-2 mt-0.5">{t.snippet}</p>
                </button>
              ))
            )}
          </div>

          {/* Thread detail */}
          <div className="border border-[#E8E4DC] rounded-lg p-3 min-h-[280px] max-h-[520px] overflow-auto space-y-3">
            {!selectedThread ? (
              <p className="text-sm text-[#5A6070]">
                Select a conversation to read the thread, reply, forward, or archive.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-bold">{selectedThread.subject}</p>
                  <p className="text-[11px] text-[#5A6070]">
                    {selectedThread.messages.length} message
                    {selectedThread.messages.length === 1 ? '' : 's'} in thread
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={startForward}>
                    Forward
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void archiveSelected()}>
                    Archive
                  </Button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) void moveSelected(e.target.value)
                      e.target.value = ''
                    }}
                    className="border border-[#E8E4DC] rounded-lg px-2 py-1.5 text-xs"
                  >
                    <option value="">Move to folder…</option>
                    {moveFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-auto border-t border-[#E8E4DC] pt-2">
                  {selectedThread.messages.map((m) => (
                    <article
                      key={m.id}
                      className={`rounded-lg border px-3 py-2 ${
                        m.id === replyToMessageId
                          ? 'border-[#085508] bg-[#F0F7F0]'
                          : 'border-[#E8E4DC] bg-[#F7F5F0]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold">{m.from}</p>
                          <p className="text-[11px] text-[#5A6070]">{m.date}</p>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] font-bold underline text-[#085508]"
                          onClick={() => setReplyToMessageId(m.id)}
                        >
                          Reply to this
                        </button>
                      </div>
                      <div className="mt-2">
                        <MailBody text={m.bodyText || m.snippet || ''} html={m.bodyHtml || ''} />
                      </div>
                      {m.attachments?.length ? (
                        <ul className="mt-2 space-y-1">
                          {m.attachments.map((a) => (
                            <li key={`${m.id}-${a.attachmentId}`}>
                              <a
                                href={`/api/staff/workspace/mail/attachment?messageId=${encodeURIComponent(m.id)}&attachmentId=${encodeURIComponent(a.attachmentId)}&filename=${encodeURIComponent(a.filename)}&mimeType=${encodeURIComponent(a.mimeType)}`}
                                className="text-xs font-semibold text-[#085508] underline"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Download {a.filename}
                                {a.size ? ` (${Math.max(1, Math.round(a.size / 1024))} KB)` : ''}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  ))}
                </div>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder="Type your reply…"
                  className="w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={grammarBusy || !reply.trim()}
                    onClick={() => void checkGrammar(reply, setReply, 'reply')}
                  >
                    {grammarBusy ? 'Checking…' : 'Check grammar'}
                  </Button>
                  <AttachFilesButton onPick={onPickFiles} />
                  {grammarNote ? <p className="text-xs text-[#5A6070]">{grammarNote}</p> : null}
                </div>
                {pendingFiles.length ? (
                  <ul className="text-xs text-[#5A6070]">
                    {pendingFiles.map((f) => (
                      <li key={f.filename + f.dataBase64.slice(0, 8)}>{f.filename}</li>
                    ))}
                  </ul>
                ) : null}
                <label className="flex items-center gap-2 text-xs text-[#5A6070]">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                  />
                  Include signature
                </label>
                <Button
                  disabled={busy || !reply.trim()}
                  onClick={() => void sendReply()}
                  className="text-white"
                  style={{ backgroundColor: '#085508' }}
                >
                  Send reply
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'calendar' && status?.connected ? (
        <div className="space-y-3">
          <ul className="divide-y border border-[#E8E4DC] rounded-lg">
            {events.length === 0 ? (
              <li className="p-3 text-sm text-[#5A6070]">No upcoming events on your primary calendar.</li>
            ) : (
              events.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="w-full text-left p-3 flex flex-wrap justify-between gap-2 hover:bg-[#F7F5F0]"
                    onClick={() => {
                      setEmbedUrl(null)
                      setSelectedEvent(e)
                    }}
                  >
                    <div>
                      <p className="text-sm font-semibold">{e.summary}</p>
                      <p className="text-xs text-[#5A6070]">
                        {formatWhen(e.start, e.allDay)}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#085508] self-center">Details</span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {selectedEvent ? (
            <div className="rounded-lg border border-[#E8E4DC] bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-[#1A1A1A]">{selectedEvent.summary}</h3>
                <button
                  type="button"
                  className="text-xs font-semibold underline text-[#085508] shrink-0"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </button>
              </div>
              <p className="text-sm text-[#5A6070]">
                {formatWhen(selectedEvent.start, selectedEvent.allDay)}
                {selectedEvent.end
                  ? ` → ${formatWhen(selectedEvent.end, selectedEvent.allDay)}`
                  : ''}
              </p>
              {selectedEvent.location ? (
                <p className="text-sm text-[#1A1A1A]">
                  <span className="font-semibold">Where: </span>
                  {selectedEvent.location}
                </p>
              ) : null}
              {selectedEvent.meetingLink ? (
                <p>
                  <a
                    href={selectedEvent.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: '#085508' }}
                  >
                    Join meeting
                  </a>
                </p>
              ) : null}
              {selectedEvent.attachments?.length ? (
                <ul className="text-sm space-y-1">
                  {selectedEvent.attachments.map((a) => (
                    <li key={a.fileUrl}>
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#085508] underline"
                      >
                        {a.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {selectedEvent.description ? (
                <div className="text-sm text-[#1A1A1A] whitespace-pre-wrap border-t border-[#E8E4DC] pt-2">
                  {selectedEvent.description
                    .replace(/<br\s*\/?\s*>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim()}
                </div>
              ) : (
                <p className="text-xs text-[#5A6070]">No extra notes on this event.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'docs' && status?.connected ? (
        <ul className="divide-y border border-[#E8E4DC] rounded-lg">
          {docs.length === 0 ? (
            <li className="p-3 text-sm text-[#5A6070]">
              No Docs/Sheets/Slides found. Share the PTO Shared drive with board emails, or set
              GOOGLE_DRIVE_FOLDER_ID.
            </li>
          ) : (
            docs.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="w-full text-left p-3 flex flex-wrap justify-between gap-2 hover:bg-[#F7F5F0]"
                  onClick={() => {
                    setSelectedEvent(null)
                    setEmbedTitle(f.name)
                    setEmbedUrl(staffDocEmbedUrl(f))
                    requestAnimationFrame(() =>
                      embedPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    )
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">{f.name}</p>
                    <p className="text-[11px] text-[#5A6070]">
                      {f.modifiedTime ? formatWhen(f.modifiedTime) : f.mimeType}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#085508] self-center">Open here</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {tab === 'docs' && embedUrl ? (
        <div
          ref={embedPanelRef}
          className="rounded-lg border border-[#E8E4DC] overflow-hidden bg-white"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E8E4DC]">
            <p className="text-xs font-bold truncate">{embedTitle || 'Preview'}</p>
            <button
              type="button"
              className="text-xs font-semibold underline text-[#085508] shrink-0"
              onClick={() => setEmbedUrl(null)}
            >
              Close
            </button>
          </div>
          <iframe
            title={embedTitle || 'Document'}
            src={embedUrl}
            className="w-full h-[min(78vh,42rem)] bg-white"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      ) : null}
    </section>
  )
}
