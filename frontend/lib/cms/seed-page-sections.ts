/**
 * Seed CMS page sections from legacy PageContent (demo/trial only).
 */
import 'server-only'
import {
  emptySectionData,
  isSectionType,
  type ComposablePageSlug,
} from '@/lib/cms/section-types'
import {
  countCmsPageSections,
  getCmsPageContent,
  upsertCmsPageSection,
} from '@/lib/cms/store'
import { sql } from '@/lib/crm/db'

export async function seedHomeSectionsIfEmpty(orgId: string): Promise<void> {
  const lockKey = `cms_seed_home_${orgId}`
  await sql(`select pg_advisory_lock(hashtext($1))`, [lockKey])
  try {
    if ((await countCmsPageSections(orgId, 'home')) > 0) return

    const home = await getCmsPageContent(orgId, 'home')
    const volunteer = await getCmsPageContent(orgId, 'home-volunteer')
    const community = await getCmsPageContent(orgId, 'home-community')

    let order = 0
    await upsertCmsPageSection(orgId, {
      pageSlug: 'home',
      sortOrder: order++,
      sectionType: 'hero',
      data: {
        ...emptySectionData('hero'),
        eyebrow: home?.eyebrow ?? '',
        title: home?.title ?? 'Welcome',
        body: home?.body ?? '',
        ctaLabel: home?.ctaLabel ?? '',
        ctaHref: home?.ctaHref ?? '',
        imageUrl: home?.flyerImage ?? '',
        imageAlt: '',
      },
    })

    if (volunteer?.title || volunteer?.body) {
      await upsertCmsPageSection(orgId, {
        pageSlug: 'home',
        sortOrder: order++,
        sectionType: 'cta',
        data: {
          ...emptySectionData('cta'),
          title: volunteer?.title ?? 'Volunteer',
          body: volunteer?.body ?? '',
          label: volunteer?.ctaLabel ?? 'Get involved',
          href: volunteer?.ctaHref || '/volunteer',
        },
      })
    }

    if (community?.title || community?.body) {
      await upsertCmsPageSection(orgId, {
        pageSlug: 'home',
        sortOrder: order++,
        sectionType: 'richText',
        data: {
          ...emptySectionData('richText'),
          title: community?.title ?? '',
          body: community?.body ?? community?.sectionBody ?? '',
        },
      })
    }

    const bulletsRaw = home?.bullets
    const bullets = Array.isArray(bulletsRaw)
      ? bulletsRaw.map((l) => String(l).trim()).filter(Boolean)
      : String(bulletsRaw ?? '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
    if (bullets.length) {
      await upsertCmsPageSection(orgId, {
        pageSlug: 'home',
        sortOrder: order++,
        sectionType: 'pdfList',
        data: {
          ...emptySectionData('pdfList'),
          title: 'Downloads',
          items: bullets.map((line) => {
            const pipe = line.indexOf('|')
            if (pipe > 0) {
              return { label: line.slice(0, pipe).trim(), url: line.slice(pipe + 1).trim() }
            }
            return { label: line, url: '' }
          }),
        },
      })
    }
  } finally {
    await sql(`select pg_advisory_unlock(hashtext($1))`, [lockKey]).catch(() => {})
  }
}

/** Generic seed: one hero (+ optional richText) from cms_page_content row. */
export async function seedPageSectionsFromPageContent(
  orgId: string,
  pageSlug: string,
): Promise<void> {
  if ((await countCmsPageSections(orgId, pageSlug)) > 0) return
  const page = await getCmsPageContent(orgId, pageSlug)
  if (!page) {
    // Still create a blank hero so Staff can compose without a blank null fallback forever.
    await upsertCmsPageSection(orgId, {
      pageSlug,
      sortOrder: 0,
      sectionType: 'hero',
      data: {
        ...emptySectionData('hero'),
        title: pageSlug.replace(/-/g, ' '),
        body: 'Add your copy in Staff → Pages.',
      },
    })
    return
  }

  let order = 0
  await upsertCmsPageSection(orgId, {
    pageSlug,
    sortOrder: order++,
    sectionType: 'hero',
    data: {
      ...emptySectionData('hero'),
      eyebrow: page.eyebrow ?? '',
      title: page.title ?? '',
      body: page.body ?? '',
      ctaLabel: page.ctaLabel ?? '',
      ctaHref: page.ctaHref ?? '',
      imageUrl: page.flyerImage ?? '',
      imageAlt: '',
    },
  })

  if (page.sectionTitle || page.sectionBody) {
    await upsertCmsPageSection(orgId, {
      pageSlug,
      sortOrder: order++,
      sectionType: 'richText',
      data: {
        ...emptySectionData('richText'),
        title: page.sectionTitle ?? '',
        body: page.sectionBody ?? '',
      },
    })
  }

  const bulletsRaw = page.bullets
  const bullets = Array.isArray(bulletsRaw)
    ? bulletsRaw.map((l) => String(l).trim()).filter(Boolean)
    : String(bulletsRaw ?? '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
  if (bullets.length) {
    await upsertCmsPageSection(orgId, {
      pageSlug,
      sortOrder: order++,
      sectionType: 'bullets',
      data: {
        ...emptySectionData('bullets'),
        title: '',
        items: bullets.map((line) => {
          const pipe = line.indexOf('|')
          return pipe > 0 ? line.slice(pipe + 1).trim() || line : line
        }),
      },
    })
  }
}

void isSectionType
void (null as unknown as ComposablePageSlug)
