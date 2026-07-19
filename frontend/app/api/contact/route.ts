import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'
import { getSiteSettings } from '@/lib/api/site-settings'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveAssignedTo(
  department: string | undefined,
  assignedTo: string | undefined,
  settings: Awaited<ReturnType<typeof getSiteSettings>>
): string {
  const explicit = String(assignedTo ?? '').trim().toLowerCase()
  if (explicit && EMAIL_RE.test(explicit)) return explicit

  const dept = String(department ?? '').trim().toLowerCase()
  if (dept === 'programs') {
    return settings
      .get('contactEmailPrograms', 'fundraising@shmspto.org')
      .trim()
      .toLowerCase()
  }
  if (dept === 'treasurer') {
    return settings.get('contactEmailTreasurer', 'treasurer@shmspto.org').trim().toLowerCase()
  }
  return settings.get('contactEmailGeneral', 'info@shmspto.org').trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const topic = String(body.topic ?? 'General Question').trim() || 'General Question'
    const message = String(body.message ?? '').trim()
    const department = String(body.department ?? '').trim().toLowerCase() || 'general'

    if (!name || !email || !EMAIL_RE.test(email) || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const settings = await getSiteSettings()
    const assignedTo = resolveAssignedTo(department, body.assignedTo, settings)

    const client = getWixClient()
    const base = {
      name,
      email,
      topic,
      message:
        department === 'programs'
          ? `[Route: VP Programs · ${assignedTo}]\n\n${message}`
          : message,
      submittedAt: new Date().toISOString(),
      resolved: false,
    }

    try {
      await client.items.insert('ContactSubmissions', {
        ...base,
        department,
        assignedTo,
      })
    } catch {
      // Collection may not have department/assignedTo fields yet
      await client.items.insert('ContactSubmissions', base)
    }

    return NextResponse.json({ ok: true, assignedTo })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
