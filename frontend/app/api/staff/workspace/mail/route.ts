import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import {
  listThreads,
  getThread,
  getMessage,
  replyToMessage,
  sendNewMessage,
  forwardMessage,
  archiveThread,
  archiveMessage,
  modifyThreadLabels,
  modifyMessageLabels,
  type MailAttachment,
} from '@/lib/google/gmail'

function parseAttachments(raw: unknown): MailAttachment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => ({
      filename: String((a as MailAttachment)?.filename ?? ''),
      mimeType: String((a as MailAttachment)?.mimeType ?? 'application/octet-stream'),
      dataBase64: String((a as MailAttachment)?.dataBase64 ?? ''),
    }))
    .filter((a) => a.filename && a.dataBase64)
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const threadId = req.nextUrl.searchParams.get('threadId')
    if (threadId) {
      const thread = await getThread(session.email, threadId)
      return NextResponse.json({ thread })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (id) {
      const message = await getMessage(session.email, id)
      return NextResponse.json({ message })
    }

    const labelId = req.nextUrl.searchParams.get('labelId') || undefined
    const threads = labelId
      ? await listThreads(session.email, { labelId })
      : await listThreads(session.email, { query: 'in:inbox newer_than:90d' })
    return NextResponse.json({ threads })
  } catch (err) {
    console.error('/api/staff/workspace/mail GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Mail unavailable' },
      { status: 503 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const action = String(body.action ?? 'reply').trim().toLowerCase()
    const text = String(body.body ?? '').trim()
    const includeSignature = body.includeSignature !== false
    const attachments = parseAttachments(body.attachments)
    const messageId = String(body.messageId ?? '').trim()
    const threadId = String(body.threadId ?? '').trim()

    if (action === 'archive') {
      if (threadId) {
        await archiveThread(session.email, threadId)
        return NextResponse.json({ ok: true, action: 'archive', threadId })
      }
      if (!messageId) return NextResponse.json({ error: 'threadId or messageId required' }, { status: 400 })
      await archiveMessage(session.email, messageId)
      return NextResponse.json({ ok: true, action: 'archive' })
    }

    if (action === 'move') {
      const labelId = String(body.labelId ?? '').trim()
      if (!labelId) return NextResponse.json({ error: 'labelId required' }, { status: 400 })
      if (threadId) {
        await modifyThreadLabels(session.email, threadId, {
          addLabelIds: [labelId],
          removeLabelIds: ['INBOX'],
        })
        return NextResponse.json({ ok: true, action: 'move', threadId })
      }
      if (!messageId) return NextResponse.json({ error: 'threadId or messageId required' }, { status: 400 })
      await modifyMessageLabels(session.email, messageId, {
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX'],
      })
      return NextResponse.json({ ok: true, action: 'move' })
    }

    if (action === 'compose' || action === 'send') {
      const to = String(body.to ?? '').trim()
      const subject = String(body.subject ?? '').trim()
      const cc = String(body.cc ?? '').trim()
      if (!to || !subject || !text) {
        return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 })
      }
      const result = await sendNewMessage(session.email, {
        to,
        subject,
        bodyText: text,
        cc: cc || undefined,
        signature: session.staff.emailSignature,
        includeSignature,
        attachments,
      })
      return NextResponse.json({ ok: true, id: result.id, action: 'compose' })
    }

    if (action === 'forward') {
      const to = String(body.to ?? '').trim()
      if (!messageId || !to) {
        return NextResponse.json({ error: 'messageId and to are required' }, { status: 400 })
      }
      const result = await forwardMessage(session.email, messageId, {
        to,
        bodyText: text,
        cc: String(body.cc ?? '').trim() || undefined,
        signature: session.staff.emailSignature,
        includeSignature,
        attachments,
      })
      return NextResponse.json({ ok: true, id: result.id, action: 'forward' })
    }

    if (!messageId || !text) {
      return NextResponse.json({ error: 'messageId and body are required' }, { status: 400 })
    }
    const result = await replyToMessage(session.email, messageId, text, {
      signature: session.staff.emailSignature,
      includeSignature,
      attachments,
    })
    return NextResponse.json({ ok: true, id: result.id, action: 'reply' })
  } catch (err) {
    console.error('/api/staff/workspace/mail POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Send failed' },
      { status: 503 },
    )
  }
}
