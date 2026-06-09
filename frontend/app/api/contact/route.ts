import { NextRequest, NextResponse } from 'next/server'
import { getWixClient } from '@/lib/wix-client'

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json()

    if (!name || !email || !email.includes('@') || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Store in Wix CMS ContactSubmissions collection
    const client = getWixClient()
    await client.items.insert('ContactSubmissions', {
      name,
      email,
      topic: topic || 'General Question',
      message,
      submittedAt: new Date().toISOString(),
      resolved: false,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
