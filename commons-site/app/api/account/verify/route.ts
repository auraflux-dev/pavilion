import { NextRequest, NextResponse } from 'next/server'
import { hashToken, setAccountCookie } from '@/lib/account'
import { consumeAccountToken } from '@/lib/db'
import { siteOrigin } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('token') || ''
  if (!raw) {
    return NextResponse.redirect(`${siteOrigin()}/account?error=missing`)
  }

  try {
    const email = await consumeAccountToken(hashToken(raw))
    if (!email) {
      return NextResponse.redirect(`${siteOrigin()}/account?error=expired`)
    }
    await setAccountCookie(email)
    return NextResponse.redirect(`${siteOrigin()}/account`)
  } catch (err) {
    console.error('account verify failed', err)
    return NextResponse.redirect(`${siteOrigin()}/account?error=failed`)
  }
}
