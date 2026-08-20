import { NextResponse } from 'next/server'
import { clearAccountCookie } from '@/lib/account'

export const runtime = 'nodejs'

export async function POST() {
  await clearAccountCookie()
  return NextResponse.json({ ok: true })
}
