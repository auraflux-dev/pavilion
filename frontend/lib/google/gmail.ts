import { GOOGLE_SCOPES, getStaffGoogleAccess } from '@/lib/google/workspace-auth'
import { applyEmailSignature } from '@/lib/staff/email-signature'

export type MailAttachment = {
  filename: string
  mimeType: string
  /** Standard base64 (not url-safe) */
  dataBase64: string
}

export type GmailLabel = {
  id: string
  name: string
  type: string
  messagesTotal?: number
  messagesUnread?: number
}

export type GmailListItem = {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
  unread: boolean
  labelIds: string[]
}

export type GmailThreadListItem = {
  id: string
  subject: string
  snippet: string
  date: string
  from: string
  participants: string[]
  messageCount: number
  unread: boolean
  labelIds: string[]
}

export type GmailMessageDetail = GmailListItem & {
  bodyText: string
  bodyHtml: string
  messageIdHeader: string
  references: string
  attachments: { filename: string; mimeType: string; size: number; attachmentId: string }[]
}

export type GmailThreadDetail = {
  id: string
  subject: string
  messages: GmailMessageDetail[]
}

/** System mailboxes we surface as folders (excludes CATEGORY_*, UNREAD, etc.). */
const SYSTEM_FOLDER_IDS = new Set([
  'INBOX',
  'STARRED',
  'IMPORTANT',
  'SENT',
  'DRAFT',
  'SPAM',
  'TRASH',
])

const SYSTEM_FOLDER_ORDER = ['INBOX', 'STARRED', 'IMPORTANT', 'SENT', 'DRAFT', 'SPAM', 'TRASH']

const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024 // keep under typical serverless body limits

function headerMap(payload: {
  headers?: { name?: string; value?: string }[]
}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const h of payload.headers ?? []) {
    if (h.name) out[h.name.toLowerCase()] = h.value ?? ''
  }
  return out
}

function decodeBodyData(data?: string): string {
  if (!data) return ''
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

function toRaw(mime: string): string {
  return Buffer.from(mime, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function extractBodies(payload: {
  mimeType?: string
  body?: { data?: string }
  parts?: {
    mimeType?: string
    filename?: string
    body?: { data?: string; attachmentId?: string; size?: number }
    parts?: unknown[]
  }[]
}): { text: string; html: string } {
  const texts: string[] = []
  const htmls: string[] = []
  const walk = (part: {
    mimeType?: string
    filename?: string
    body?: { data?: string; attachmentId?: string }
    parts?: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }[]
  }) => {
    const mt = part.mimeType || ''
    const hasFile = Boolean(part.filename?.trim())
    // Skip attachment parts when reading body (filename + attachmentId/data)
    if (hasFile && (part.body?.attachmentId || (!mt.startsWith('text/') && part.body?.data))) {
      for (const child of part.parts ?? []) walk(child as typeof part)
      return
    }
    if (mt === 'text/plain' && part.body?.data) texts.push(decodeBodyData(part.body.data))
    if (mt === 'text/html' && part.body?.data) htmls.push(decodeBodyData(part.body.data))
    // Root-level non-multipart message
    if (!part.parts?.length && part.body?.data && !mt.includes('multipart')) {
      if (mt.includes('html')) htmls.push(decodeBodyData(part.body.data))
      else if (mt.includes('text') || !mt) texts.push(decodeBodyData(part.body.data))
    }
    for (const child of part.parts ?? []) walk(child as typeof part)
  }
  walk(payload)
  // Prefer the longest part (stubs are often short text/plain companions to full HTML)
  const text = texts.sort((a, b) => b.length - a.length)[0] || ''
  const html = htmls.sort((a, b) => b.length - a.length)[0] || ''
  if (!text && html) {
    return {
      text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html,
    }
  }
  return { text, html }
}

function extractAttachmentMeta(payload: {
  parts?: {
    mimeType?: string
    filename?: string
    body?: { attachmentId?: string; size?: number; data?: string }
    parts?: unknown[]
  }[]
}): GmailMessageDetail['attachments'] {
  const out: GmailMessageDetail['attachments'] = []
  const seen = new Set<string>()
  const walk = (parts?: typeof payload.parts) => {
    for (const part of parts ?? []) {
      const filename =
        (part.filename || '').trim() ||
        (part.mimeType === 'text/calendar'
          ? 'invite.ics'
          : part.mimeType === 'message/rfc822'
            ? 'forwarded.eml'
            : '')
      const attachmentId = part.body?.attachmentId || ''
      // Real attachments always have attachmentId in Gmail API; skip inline images without names
      if (filename && attachmentId) {
        const key = `${attachmentId}:${filename}`
        if (!seen.has(key)) {
          seen.add(key)
          out.push({
            filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body?.size || 0,
            attachmentId,
          })
        }
      }
      if (part.parts) walk(part.parts as typeof parts)
    }
  }
  walk(payload.parts)
  return out
}

export async function getMessageAttachment(
  staffEmail: string,
  messageId: string,
  attachmentId: string,
): Promise<{ data: Buffer; size: number }> {
  const token = await accessToken(staffEmail)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = (await res.json()) as { data?: string; size?: number; error?: { message?: string } }
  if (!res.ok || !data.data) {
    throw new Error(data.error?.message || 'Could not download attachment')
  }
  const normalized = data.data.replace(/-/g, '+').replace(/_/g, '/')
  return {
    data: Buffer.from(normalized, 'base64'),
    size: data.size || 0,
  }
}

function sanitizeAttachments(attachments: MailAttachment[] | undefined): MailAttachment[] {
  const list = attachments ?? []
  let total = 0
  const out: MailAttachment[] = []
  for (const a of list) {
    const filename = String(a.filename ?? '').trim().slice(0, 180)
    const mimeType = String(a.mimeType ?? 'application/octet-stream').trim() || 'application/octet-stream'
    const dataBase64 = String(a.dataBase64 ?? '').replace(/\s/g, '')
    if (!filename || !dataBase64) continue
    const bytes = Math.floor((dataBase64.length * 3) / 4)
    total += bytes
    if (total > MAX_ATTACHMENT_BYTES) {
      throw new Error('Attachments exceed 12 MB total limit for portal send')
    }
    out.push({ filename, mimeType, dataBase64 })
  }
  return out
}

function buildMimeMessage(opts: {
  to: string
  subject: string
  bodyText: string
  cc?: string
  inReplyTo?: string
  references?: string
  attachments?: MailAttachment[]
}): string {
  const attachments = sanitizeAttachments(opts.attachments)
  const headers = [
    `To: ${opts.to}`,
    ...(opts.cc ? [`Cc: ${opts.cc}`] : []),
    `Subject: ${opts.subject}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`] : []),
    ...(opts.references ? [`References: ${opts.references}`] : []),
    'MIME-Version: 1.0',
  ]

  if (!attachments.length) {
    return [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      opts.bodyText.replace(/\r?\n/g, '\r\n'),
    ].join('\r\n')
  }

  const boundary = `shmspto_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    opts.bodyText.replace(/\r?\n/g, '\r\n'),
  ]

  for (const file of attachments) {
    const safeName = file.filename.replace(/"/g, '')
    parts.push(
      `--${boundary}`,
      `Content-Type: ${file.mimeType}; name="${safeName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${safeName}"`,
      '',
      file.dataBase64.replace(/(.{76})/g, '$1\r\n'),
    )
  }
  parts.push(`--${boundary}--`, '')
  return parts.join('\r\n')
}

async function gmailSend(
  accessToken: string,
  mime: string,
  threadId?: string,
): Promise<{ id: string }> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: toRaw(mime),
      threadId: threadId || undefined,
    }),
  })
  const data = (await res.json()) as { id?: string; error?: { message?: string } }
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Send failed')
  }
  return { id: data.id }
}

async function accessToken(staffEmail: string) {
  const access = await getStaffGoogleAccess(staffEmail, GOOGLE_SCOPES.gmail)
  if (!access) throw new Error('Google mail is not connected for this staff account')
  return access.accessToken
}

export async function listLabels(staffEmail: string): Promise<GmailLabel[]> {
  const token = await accessToken(staffEmail)
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await res.json()) as {
    labels?: { id?: string; name?: string; type?: string; messagesTotal?: number; messagesUnread?: number }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(data.error?.message || 'Could not list labels')

  const base = (data.labels ?? [])
    .filter((l) => l.id && l.name)
    .map((l) => ({
      id: l.id!,
      name: l.name!,
      type: l.type || 'user',
      messagesTotal: l.messagesTotal,
      messagesUnread: l.messagesUnread,
    }))

 // labels.list often omits unread counts. pull them via labels.get for sidebar badges.
  const needCounts = base.filter(
    (l) =>
      l.type === 'user' ||
      SYSTEM_FOLDER_IDS.has(l.id),
  )
  await Promise.all(
    needCounts.map(async (label) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/labels/${encodeURIComponent(label.id)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        const detail = (await detailRes.json()) as {
          messagesTotal?: number
          messagesUnread?: number
        }
        if (!detailRes.ok) return
        label.messagesTotal = detail.messagesTotal ?? label.messagesTotal
        label.messagesUnread = detail.messagesUnread ?? label.messagesUnread
      } catch {
        // keep list values if get fails
      }
    }),
  )

  return base.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Sidebar order: Inbox first, then user folders (Gmail labels / rule targets),
 * then other system mailboxes (Sent, Drafts, …).
 */
export function foldersFromLabels(labels: GmailLabel[]): GmailLabel[] {
  const usable = labels.filter(
    (l) =>
      l.type === 'user' ||
      (SYSTEM_FOLDER_IDS.has(l.id) && !l.id.startsWith('CATEGORY_')),
  )
  const byId = new Map(usable.map((l) => [l.id, l]))
  const ordered: GmailLabel[] = []

  const inbox = byId.get('INBOX')
  if (inbox) {
    ordered.push(inbox)
    byId.delete('INBOX')
  }

  const userFolders = [...byId.values()]
    .filter((l) => l.type === 'user')
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const f of userFolders) {
    ordered.push(f)
    byId.delete(f.id)
  }

  for (const id of SYSTEM_FOLDER_ORDER) {
    if (id === 'INBOX') continue
    const hit = byId.get(id)
    if (hit) {
      ordered.push(hit)
      byId.delete(id)
    }
  }

  return ordered
}

export async function createLabel(staffEmail: string, name: string): Promise<GmailLabel> {
  const token = await accessToken(staffEmail)
  const labelName = name.trim()
  if (!labelName) throw new Error('Folder name is required')
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  })
  const data = (await res.json()) as {
    id?: string
    name?: string
    type?: string
    error?: { message?: string }
  }
  if (!res.ok || !data.id) throw new Error(data.error?.message || 'Could not create folder')
  return { id: data.id, name: data.name || labelName, type: data.type || 'user' }
}

export async function modifyMessageLabels(
  staffEmail: string,
  messageId: string,
  opts: { addLabelIds?: string[]; removeLabelIds?: string[] },
): Promise<void> {
  const token = await accessToken(staffEmail)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: opts.addLabelIds ?? [],
        removeLabelIds: opts.removeLabelIds ?? [],
      }),
    },
  )
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(data.error?.message || 'Could not update labels')
  }
}

export async function modifyThreadLabels(
  staffEmail: string,
  threadId: string,
  opts: { addLabelIds?: string[]; removeLabelIds?: string[] },
): Promise<void> {
  const token = await accessToken(staffEmail)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: opts.addLabelIds ?? [],
        removeLabelIds: opts.removeLabelIds ?? [],
      }),
    },
  )
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(data.error?.message || 'Could not update thread labels')
  }
}

export async function archiveMessage(staffEmail: string, messageId: string) {
  await modifyMessageLabels(staffEmail, messageId, { removeLabelIds: ['INBOX'] })
}

export async function archiveThread(staffEmail: string, threadId: string) {
  await modifyThreadLabels(staffEmail, threadId, { removeLabelIds: ['INBOX'] })
}

function parseMessageDetail(detail: {
  id?: string
  threadId?: string
  snippet?: string
  labelIds?: string[]
  payload?: {
    mimeType?: string
    body?: { data?: string }
    parts?: {
      mimeType?: string
      filename?: string
      body?: { data?: string; attachmentId?: string; size?: number }
      parts?: unknown[]
    }[]
    headers?: { name?: string; value?: string }[]
  }
}): GmailMessageDetail | null {
  if (!detail.id) return null
  const h = headerMap(detail.payload ?? {})
  const bodies = extractBodies(detail.payload ?? {})
  return {
    id: detail.id,
    threadId: detail.threadId || '',
    from: h.from || '',
    to: h.to || '',
    subject: h.subject || '(no subject)',
    snippet: detail.snippet || '',
    date: h.date || '',
    unread: (detail.labelIds ?? []).includes('UNREAD'),
    labelIds: detail.labelIds ?? [],
    bodyText: bodies.text,
    bodyHtml: bodies.html,
    messageIdHeader: h['message-id'] || '',
    references: h.references || h['message-id'] || '',
    attachments: extractAttachmentMeta(detail.payload ?? {}),
  }
}

function participantKey(from: string): string {
  const m = from.match(/<([^>]+)>/)
  return (m?.[1] || from).trim().toLowerCase()
}

export async function listThreads(
  staffEmail: string,
  opts: { labelId?: string; query?: string; maxResults?: number } = {},
): Promise<GmailThreadListItem[]> {
  const token = await accessToken(staffEmail)
  const maxResults = opts.maxResults ?? 25
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (opts.labelId) params.set('labelIds', opts.labelId)
  const q = opts.query || (opts.labelId ? '' : 'in:inbox newer_than:90d')
  if (q) params.set('q', q)

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const list = (await listRes.json()) as {
    threads?: { id: string; snippet?: string; historyId?: string }[]
    error?: { message?: string }
  }
  if (!listRes.ok) throw new Error(list.error?.message || 'Could not list Gmail threads')

  const threads: GmailThreadListItem[] = []
  await Promise.all(
    (list.threads ?? []).map(async (t) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(t.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const detail = (await detailRes.json()) as {
        id?: string
        messages?: {
          id?: string
          snippet?: string
          labelIds?: string[]
          payload?: { headers?: { name?: string; value?: string }[] }
        }[]
      }
      if (!detailRes.ok || !detail.id || !detail.messages?.length) return
      const messages = detail.messages
      const last = messages[messages.length - 1]!
      const first = messages[0]!
      const lastH = headerMap(last.payload ?? {})
      const firstH = headerMap(first.payload ?? {})
      const participants: string[] = []
      const seen = new Set<string>()
      for (const msg of messages) {
        const from = headerMap(msg.payload ?? {}).from || ''
        if (!from) continue
        const key = participantKey(from)
        if (seen.has(key)) continue
        seen.add(key)
        participants.push(from)
      }
      const labelIds = [...new Set(messages.flatMap((m) => m.labelIds ?? []))]
      threads.push({
        id: detail.id,
        subject: lastH.subject || firstH.subject || '(no subject)',
        snippet: last.snippet || t.snippet || '',
        date: lastH.date || firstH.date || '',
        from: lastH.from || firstH.from || '',
        participants,
        messageCount: messages.length,
        unread: labelIds.includes('UNREAD'),
        labelIds,
      })
    }),
  )

  // Preserve Gmail list order (newest first) when possible
  const order = new Map((list.threads ?? []).map((t, i) => [t.id, i]))
  threads.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return threads
}

export async function getThread(
  staffEmail: string,
  threadId: string,
): Promise<GmailThreadDetail> {
  const token = await accessToken(staffEmail)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const detail = (await res.json()) as {
    id?: string
    messages?: Parameters<typeof parseMessageDetail>[0][]
    error?: { message?: string }
  }
  if (!res.ok || !detail.id) {
    throw new Error(detail.error?.message || 'Could not load thread')
  }
  const messages = (detail.messages ?? [])
    .map((m) => parseMessageDetail(m))
    .filter((m): m is GmailMessageDetail => Boolean(m))
  const subject =
    messages.find((m) => m.subject && m.subject !== '(no subject)')?.subject ||
    messages[0]?.subject ||
    '(no subject)'
  return { id: detail.id, subject, messages }
}

export async function listMessages(
  staffEmail: string,
  opts: { labelId?: string; query?: string; maxResults?: number } = {},
): Promise<GmailListItem[]> {
  const token = await accessToken(staffEmail)
  const maxResults = opts.maxResults ?? 25
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (opts.labelId) params.set('labelIds', opts.labelId)
  const q = opts.query || (opts.labelId ? '' : 'in:inbox newer_than:90d')
  if (q) params.set('q', q)

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const list = (await listRes.json()) as {
    messages?: { id: string; threadId: string }[]
    error?: { message?: string }
  }
  if (!listRes.ok) throw new Error(list.error?.message || 'Could not list Gmail messages')

  const items: GmailListItem[] = []
  for (const m of list.messages ?? []) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const detail = (await detailRes.json()) as {
      id?: string
      threadId?: string
      snippet?: string
      labelIds?: string[]
      payload?: { headers?: { name?: string; value?: string }[] }
    }
    if (!detailRes.ok || !detail.id) continue
    const h = headerMap(detail.payload ?? {})
    items.push({
      id: detail.id,
      threadId: detail.threadId || m.threadId,
      from: h.from || '',
      to: h.to || '',
      subject: h.subject || '(no subject)',
      snippet: detail.snippet || '',
      date: h.date || '',
      unread: (detail.labelIds ?? []).includes('UNREAD'),
      labelIds: detail.labelIds ?? [],
    })
  }
  return items
}

export async function listInbox(staffEmail: string, maxResults = 25) {
  return listThreads(staffEmail, { query: 'in:inbox newer_than:90d', maxResults })
}

export async function getMessage(
  staffEmail: string,
  messageId: string,
): Promise<GmailMessageDetail> {
  const token = await accessToken(staffEmail)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const detail = (await res.json()) as Parameters<typeof parseMessageDetail>[0] & {
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(detail.error?.message || 'Could not load message')
  }
  const parsed = parseMessageDetail(detail)
  if (!parsed) throw new Error(detail.error?.message || 'Could not load message')
  return parsed
}

export async function replyToMessage(
  staffEmail: string,
  messageId: string,
  bodyText: string,
  opts: {
    signature?: string
    includeSignature?: boolean
    attachments?: MailAttachment[]
  } = {},
): Promise<{ id: string }> {
  const token = await accessToken(staffEmail)
  const finalBody = applyEmailSignature(
    bodyText,
    opts.signature,
    opts.includeSignature !== false,
  )
  const original = await getMessage(staffEmail, messageId)
  const subject = original.subject.toLowerCase().startsWith('re:')
    ? original.subject
    : `Re: ${original.subject}`
  const refs = [original.references, original.messageIdHeader].filter(Boolean).join(' ')
  const mime = buildMimeMessage({
    to: original.from,
    subject,
    bodyText: finalBody,
    inReplyTo: original.messageIdHeader || undefined,
    references: refs || undefined,
    attachments: opts.attachments,
  })
  return gmailSend(token, mime, original.threadId || undefined)
}

export async function sendNewMessage(
  staffEmail: string,
  opts: {
    to: string
    subject: string
    bodyText: string
    cc?: string
    signature?: string
    includeSignature?: boolean
    attachments?: MailAttachment[]
  },
): Promise<{ id: string }> {
  const token = await accessToken(staffEmail)
  const to = opts.to.trim()
  const subject = opts.subject.trim()
  if (!to || !subject || !opts.bodyText.trim()) {
    throw new Error('To, subject, and body are required')
  }
  const finalBody = applyEmailSignature(
    opts.bodyText,
    opts.signature,
    opts.includeSignature !== false,
  )
  const mime = buildMimeMessage({
    to,
    subject,
    bodyText: finalBody,
    cc: opts.cc?.trim() || undefined,
    attachments: opts.attachments,
  })
  return gmailSend(token, mime)
}

export async function forwardMessage(
  staffEmail: string,
  messageId: string,
  opts: {
    to: string
    bodyText?: string
    cc?: string
    signature?: string
    includeSignature?: boolean
    attachments?: MailAttachment[]
  },
): Promise<{ id: string }> {
  const token = await accessToken(staffEmail)
  const to = opts.to.trim()
  if (!to) throw new Error('To is required to forward')

  const original = await getMessage(staffEmail, messageId)
  const subject = original.subject.toLowerCase().startsWith('fwd:')
    ? original.subject
    : `Fwd: ${original.subject}`

  const intro = applyEmailSignature(
    (opts.bodyText || '').trim() || 'Please see forwarded message below.',
    opts.signature,
    opts.includeSignature !== false,
  )
  const quoted = [
    intro,
    '',
    '---------- Forwarded message ---------',
    `From: ${original.from}`,
    `Date: ${original.date}`,
    `Subject: ${original.subject}`,
    `To: ${original.to}`,
    '',
    original.bodyText || original.snippet,
  ].join('\n')

  const forwardedFiles: MailAttachment[] = [...(opts.attachments ?? [])]
  for (const att of original.attachments.slice(0, 8)) {
    try {
      const attRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(att.attachmentId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const attData = (await attRes.json()) as { data?: string; error?: { message?: string } }
      if (!attRes.ok || !attData.data) continue
      const dataBase64 = attData.data.replace(/-/g, '+').replace(/_/g, '/')
      forwardedFiles.push({
        filename: att.filename,
        mimeType: att.mimeType,
        dataBase64,
      })
    } catch {
      // skip failed attachment pulls
    }
  }

  const mime = buildMimeMessage({
    to,
    subject,
    bodyText: quoted,
    cc: opts.cc?.trim() || undefined,
    attachments: forwardedFiles,
  })
  return gmailSend(token, mime)
}
