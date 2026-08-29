/**
 * Visitor loader for CMS page sections (demo/trial page builder only).
 */
import 'server-only'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'
import {
  isSectionType,
  parseSectionData,
  type SectionType,
  type SectionDataMap,
} from '@/lib/cms/section-types'

export type PageSectionView = {
  id: string
  type: SectionType
  data: SectionDataMap[SectionType]
  sortOrder: number
}

function isProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

/**
 * Returns active sections for a page when the builder is enabled and rows exist.
 * Null → caller must use the legacy hardcoded page.
 */
export async function getPageSections(pageSlug: string): Promise<PageSectionView[] | null> {
  if (!cmsPageBuilderEnabled()) return null
  // Avoid DB migrate races across parallel prerender workers.
  if (isProductionBuild()) return null

  try {
    const { ensureCommonsReady } = await import('@/lib/crm/migrate')
    await ensureCommonsReady()

    const {
      resolveCmsOrganizationId,
      listCmsPageSections,
      countCmsPageSections,
    } = await import('@/lib/cms/store')

    const orgId = await resolveCmsOrganizationId()
    if (!orgId) return null

    const total = await countCmsPageSections(orgId, pageSlug)
    if (pageSlug === 'home' && total > 6) {
      // Prior race left duplicate seeds; wipe and reseed once.
      const { deleteCmsPageSectionsForPage } = await import('@/lib/cms/store')
      const { seedHomeSectionsIfEmpty } = await import('@/lib/cms/seed-page-sections')
      await deleteCmsPageSectionsForPage(orgId, pageSlug)
      await seedHomeSectionsIfEmpty(orgId)
    } else if (total === 0) {
      // Auto-seed home only so the demo composer is populated.
      // Other routes stay legacy until Staff opens Pages and seeds/edits.
      if (pageSlug === 'home') {
        const { seedHomeSectionsIfEmpty } = await import('@/lib/cms/seed-page-sections')
        await seedHomeSectionsIfEmpty(orgId)
      } else {
        return null
      }
    }

    const rows = await listCmsPageSections(orgId, pageSlug, true)
    if (!rows.length) return null

    const out: PageSectionView[] = []
    for (const row of rows) {
      if (!isSectionType(row.sectionType)) continue
      out.push({
        id: row.id,
        type: row.sectionType,
        data: parseSectionData(row.sectionType, row.data),
        sortOrder: row.sortOrder,
      })
    }
    return out.length ? out : null
  } catch (err) {
    console.error('getPageSections', pageSlug, err)
    return null
  }
}
