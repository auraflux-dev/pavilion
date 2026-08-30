import { notFound } from 'next/navigation'
import { VisitorChrome } from '@/components/site/visitor-chrome'
import { PageSectionsRenderer } from '@/components/cms/page-sections-renderer'
import { getPageSections } from '@/lib/api/page-sections'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export default async function CustomCmsPage({ params }: Params) {
  if (!cmsPageBuilderEnabled()) notFound()

  const { slug: raw } = await params
  const slug = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
  if (!slug) notFound()

  const { ensureCommonsReady } = await import('@/lib/crm/migrate')
  await ensureCommonsReady()
  const { resolveCmsOrganizationId, getCmsCustomPage } = await import('@/lib/cms/store')
  const orgId = await resolveCmsOrganizationId()
  if (!orgId) notFound()

  const page = await getCmsCustomPage(orgId, slug)
  if (!page || !page.active) notFound()

  const sections = await getPageSections(slug)

  return (
    <VisitorChrome pageKey={slug}>
      {sections?.length ? (
        <PageSectionsRenderer sections={sections} />
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-3xl font-bold text-[var(--brand-dark)]">{page.title}</h1>
          <p className="mt-3 text-[#5A6070]">
            This page is empty. Use Edit page layout to add sections.
          </p>
        </section>
      )}
    </VisitorChrome>
  )
}
