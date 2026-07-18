import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/staff/session'
import { listDocs } from '@/lib/google/drive'

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }

  try {
    const files = await listDocs(session.email)
    return NextResponse.json({
      files,
      folderScoped: Boolean(process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()),
    })
  } catch (err) {
    console.error('/api/staff/workspace/docs GET', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Docs unavailable' },
      { status: 503 },
    )
  }
}
