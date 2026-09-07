import { NextResponse } from 'next/server'
import { ADDONS_PUBLIC } from '@/lib/addons'

export const runtime = 'nodejs'

/** SaaS add-ons are hidden. Keep route so old links fail cleanly. */
export async function POST() {
  if (!ADDONS_PUBLIC) {
    return NextResponse.json(
      { error: 'Add-ons are not available for self-serve checkout right now.' },
      { status: 404 },
    )
  }
  return NextResponse.json({ error: 'Add-ons are not configured.' }, { status: 503 })
}
