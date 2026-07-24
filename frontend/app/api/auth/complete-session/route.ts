/**
 * POST /api/auth/complete-session
 * @deprecated Use /api/auth/email-login instead.
 * Accepting a client-supplied sessionToken + API-key external login is unsafe
 * (MST2 payloads are not verified here). Kept as a 410 so old clients fail closed.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    {
      error:
        'This sign-in path was retired. Refresh the page and use email/password again.',
    },
    { status: 410 },
  )
}
