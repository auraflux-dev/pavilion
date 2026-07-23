import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { getMessageAttachment } from '@/lib/google/gmail'

/**
 * GET /api/staff/workspace/mail/attachment?messageId=&attachmentId=&filename=
 * Streams a Gmail attachment for the signed-in staff mailbox.
 */
export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  const messageId = req.nextUrl.searchParams.get('messageId')?.trim() || ''
  const attachmentId = req.nextUrl.searchParams.get('attachmentId')?.trim() || ''
  const filename = (req.nextUrl.searchParams.get('filename') || 'attachment').replace(
    /[^\w.\- ()[\]]+/g,
    '_',
  )
  const mimeType =
    req.nextUrl.searchParams.get('mimeType')?.trim() || 'application/octet-stream'

  if (!messageId || !attachmentId) {
    return NextResponse.json({ error: 'messageId and attachmentId required' }, { status: 400 })
  }

  try {
    const file = await getMessageAttachment(session.email, messageId, attachmentId)
    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(file.data.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('/api/staff/workspace/mail/attachment GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Download failed' },
      { status: 503 },
    )
  }
}
