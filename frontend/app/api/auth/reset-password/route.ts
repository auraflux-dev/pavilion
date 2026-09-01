/**
 * POST /api/auth/reset-password
 * Sends a Wix password-reset email for a parent member account.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, OAuthStrategy } from '@wix/sdk'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function canonicalOrigin(req: NextRequest): string {
  const raw = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    'www.shmspto.org'
  )
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase()
  if (raw === 'shmspto.org' || raw === 'www.shmspto.org') {
    return 'https://www.shmspto.org'
  }
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim()
  return `${proto}://${raw}`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { email?: string; returnTo?: string }
    const email = String(body.email || '').trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_WIX_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: 'Password reset is not configured.' },
        { status: 503 },
      )
    }

    const origin = canonicalOrigin(req)
    const client = createClient({
      auth: OAuthStrategy({ clientId }),
    })
    const visitorTokens = await client.auth.generateVisitorTokens()
    client.auth.setTokens(visitorTokens)

    // After reset on the Wix-managed page, send them back to our login.
    // Must be an allowed OAuth redirect URI in the Wix Headless app
    // (exact match preferred; avoid extra query strings).
    const redirectUri = `${origin}/auth/join`
    await client.auth.sendPasswordResetEmail(email, redirectUri)

    return NextResponse.json({
      ok: true,
      message:
        'If an account exists for that email, we sent a reset link. Check your inbox (and spam).',
    })
  } catch (err) {
    console.error('reset-password', err)
    // Avoid account enumeration. still give a usable next step.
    return NextResponse.json({
      ok: true,
      message:
        'If an account exists for that email, we sent a reset link. Check your inbox (and spam). If nothing arrives, email vp-membershipexperience@shmspto.org.',
    })
  }
}
