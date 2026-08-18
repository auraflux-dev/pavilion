import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NextResponse } from 'next/server'

const PDF_DIR = join(fileURLToPath(new URL('../_pdfs/', import.meta.url)))

const FILES: Record<string, { disk: string; download: string }> = {
  'run-for-charity-lp-flyer.pdf': {
    disk: 'run-for-charity-lp-flyer.pdf',
    download: 'run-for-charity-SHMS-flyer.pdf',
  },
  'run-for-charity-official.pdf': {
    disk: 'run-for-charity-official.pdf',
    download: 'run-for-charity-official-flyer.pdf',
  },
}

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ file: string }> },
) {
  const { file } = await ctx.params
  const spec = FILES[file]
  if (!spec) return new NextResponse('Not found', { status: 404 })
  const buf = await readFile(join(PDF_DIR, spec.disk))
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${spec.download}"`,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
