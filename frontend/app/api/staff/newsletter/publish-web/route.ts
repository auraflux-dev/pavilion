/**
 * POST /api/staff/newsletter/publish-web
 * Publish the current newsletter as a public on-site page and return a shareable URL
 * (for school Scoop, WhatsApp, etc.).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { getWixClient } from '@/lib/wix-client'
import { buildNewsletterHtml } from '@/lib/staff/newsletter-html'
import {
  loadNewsletterBrandingFromKeys,
  type NewsletterBranding,
} from '@/lib/staff/newsletter-branding'
import { parseBeatsJson } from '@/lib/staff/newsletter-sections'
import { newsletterAssetsConfigured } from '@/lib/staff/newsletter-assets'
import {
  newsletterWebPublicUrl,
  normalizeNewsletterWebSlug,
  putNewsletterWebEdition,
  slugifyNewsletterTitle,
} from '@/lib/staff/newsletter-web'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>>) {
  return requireStaffRole(session.staff, ['marketing', 'secretary', 'membership', 'admin'])
}

async function loadSiteSetting(key: string): Promise<string> {
  try {
    const client = getWixClient()
    const found = await client.items.query('SiteSettings').eq('key', key).limit(1).find()
    const item = found.items?.[0] as { value?: string } | undefined
    return String(item?.value ?? '').trim()
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!session?.staff || !canAccess(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (!newsletterAssetsConfigured()) {
      return NextResponse.json(
        {
          error:
            'Web newsletter storage (R2) is not configured on this environment. Ask an admin to set R2_* on Vercel.',
        },
        { status: 503 },
      )
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const subject = String(body.subject ?? '').trim()
    const textBody = String(body.body ?? '').trim()
    const beatsJson = String(body.beatsJson ?? '').trim()
    const sections = beatsJson ? parseBeatsJson(beatsJson) : null
    const hasSections =
      sections &&
      (sections.intro.trim() ||
        sections.beats.some(
          (b) => b.heading.trim() || b.body.trim() || String(b.imageUrl ?? '').trim(),
        ) ||
        sections.signoff.trim())

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required to publish.' }, { status: 400 })
    }
    if (!textBody && !hasSections) {
      return NextResponse.json(
        { error: 'Add newsletter copy (or beats) before publishing to the site.' },
        { status: 400 },
      )
    }

    const slugOverride = String(body.slug ?? '').trim()
    const slug =
      normalizeNewsletterWebSlug(slugOverride) || slugifyNewsletterTitle(subject)

    let branding: NewsletterBranding = await loadNewsletterBrandingFromKeys(loadSiteSetting)
    const cssOverride = String(body.customCss ?? '').trim()
    if (cssOverride) {
      branding = { ...branding, customCss: cssOverride }
    }

    const physicalAddress =
      (await loadSiteSetting('contactAddress')) ||
      '23415 Evergreen Ridge Drive, Ashburn, VA 20148'

    const heroImageUrl = String(body.heroImageUrl ?? '').trim()
    const extraImageUrls = Array.isArray(body.extraImageUrls)
      ? (body.extraImageUrls as unknown[]).map((u) => String(u ?? '').trim()).filter(Boolean)
      : undefined
    const canvaViewUrl = String(body.canvaViewUrl ?? '').trim()
    const canvaThumbnailUrl = String(body.canvaThumbnailUrl ?? '').trim()
    const canvaTitle = String(body.canvaTitle ?? '').trim() || subject

    const html = buildNewsletterHtml({
      textBody: textBody || subject,
      sections: hasSections ? sections : null,
      branding,
      heroImageUrl: heroImageUrl || undefined,
      extraImageUrls,
      canvaViewUrl: canvaViewUrl || undefined,
      canvaThumbnailUrl: canvaThumbnailUrl || undefined,
      canvaTitle,
      physicalAddress,
      documentTitle: subject,
      // Web edition: no open pixel, no personalized unsubscribe
    })

    const meta = await putNewsletterWebEdition({
      slug,
      title: subject,
      html,
      publishedByEmail: session.email || '',
    })

    const url = newsletterWebPublicUrl(meta.slug)
    return NextResponse.json({
      ok: true,
      slug: meta.slug,
      url,
      title: meta.title,
      publishedAt: meta.publishedAt,
    })
  } catch (err) {
    console.error('/api/staff/newsletter/publish-web POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Publish failed' },
      { status: 500 },
    )
  }
}
