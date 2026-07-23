import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getWixClient } from '@/lib/wix-client'
import { defaultKbArticles } from '@/lib/api/kb-articles'
import type { KbAudience } from '@/lib/kb'

function rowSlug(row: Record<string, unknown>): string {
  return String(row.slug ?? '').trim()
}

/**
 * POST /api/staff/kb/seed
 * Insert code-default articles missing from KbArticles (by audience+slug).
 * Safe to re-run. Does not overwrite existing CMS rows.
 */
export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session) {
    return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
  }
  if (!requireStaffRole(session.staff, ['marketing', 'membership', 'secretary', 'admin'])) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { audience?: string }
  const audiences: KbAudience[] =
    body.audience === 'member' || body.audience === 'staff'
      ? [body.audience]
      : ['member', 'staff']

  const client = getWixClient()
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  for (const audience of audiences) {
    let existingItems: Record<string, unknown>[] = []
    try {
      const existing = await client.items.query('KbArticles').eq('audience', audience).limit(200).find()
      existingItems = (existing.items ?? []) as Record<string, unknown>[]
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'KbArticles collection missing. Click “Create KbArticles collection” first.',
        },
        { status: 400 },
      )
    }

    const have = new Set(existingItems.map(rowSlug).filter(Boolean))

    for (const article of defaultKbArticles(audience)) {
      if (have.has(article.slug)) {
        skipped += 1
        continue
      }
      try {
        await client.items.insert('KbArticles', {
          audience,
          categoryId: article.categoryId,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          body: article.body,
          order: article.order,
          adminOnly: Boolean(article.adminOnly),
          need: article.need || 'none',
          active: true,
        })
        inserted += 1
        have.add(article.slug)
      } catch (err) {
        errors.push(
          `${audience}/${article.slug}: ${err instanceof Error ? err.message : 'insert failed'}`,
        )
      }
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    inserted,
    skipped,
    errors: errors.slice(0, 10),
  })
}
