/**
 * Shared wrapper: render CMS sections when present, else legacy children.
 * Demo/trial only; SHMS always gets children (getPageSections returns null).
 */
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { PageSectionsRenderer } from '@/components/cms/page-sections-renderer'
import { getPageSections } from '@/lib/api/page-sections'

export async function ComposableVisitorPage({
  pageSlug,
  pageKey,
  children,
}: {
  pageSlug: string
  /** VisitorChrome pageKey for theme/strings (defaults to pageSlug). */
  pageKey?: string
  children: React.ReactNode
}) {
  const sections = await getPageSections(pageSlug)
  if (sections?.length) {
    return (
      <VisitorChrome pageKey={pageKey ?? pageSlug}>
        <PageSectionsRenderer sections={sections} />
      </VisitorChrome>
    )
  }
  return <>{children}</>
}
