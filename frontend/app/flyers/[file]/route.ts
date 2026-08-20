import { NextResponse } from 'next/server'
import { RUN_FOR_CHARITY_FLYER_PDF_URL } from '@/lib/run-for-charity'
import { SPONSORSHIP_FLYER_PDF_URL } from '@/lib/sponsorships'

/**
 * Old /flyers/*.pdf links. PDFs under /flyers hit this route (not public/).
 * Redirect known aliases to hosted assets elsewhere.
 */
const REDIRECTS: Record<string, string> = {
  'run-for-charity-lp-flyer.pdf': RUN_FOR_CHARITY_FLYER_PDF_URL,
  'run-for-charity-official.pdf': RUN_FOR_CHARITY_FLYER_PDF_URL,
  'run-for-charity-SHMS-flyer.pdf': RUN_FOR_CHARITY_FLYER_PDF_URL,
  'run-for-charity-official-flyer.pdf': RUN_FOR_CHARITY_FLYER_PDF_URL,
  'sponsorship-2026-27.pdf': SPONSORSHIP_FLYER_PDF_URL,
  'sponsorship-packages-2026-27.pdf': SPONSORSHIP_FLYER_PDF_URL,
  'sponsorship.pdf': SPONSORSHIP_FLYER_PDF_URL,
}

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ file: string }> },
) {
  const { file } = await ctx.params
  const target = REDIRECTS[file]
  if (target) {
    return NextResponse.redirect(new URL(target, 'https://www.shmspto.org'), 308)
  }
  return new NextResponse('Flyer not found', { status: 404 })
}
