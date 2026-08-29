import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { getLegalDoc, type LegalDoc } from '@/lib/api/legal'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { getPageSections } from '@/lib/api/page-sections'
import { PageSectionsRenderer } from '@/components/cms/page-sections-renderer'
import { VisitorChrome } from '@/components/site/visitor-chrome'

function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <main id="main-content" className="flex-1 py-12 md:py-16" style={{ backgroundColor: 'var(--brand-warm)' }}>
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--brand-green)' }}>
          {vanillaizeIfDemo('SHMS PTO Legal')}
        </p>
        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">{doc.title}</h1>
        <p className="text-sm text-[#5A6070] mb-8">Last updated: {doc.updated}</p>
        <div className="space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">{section.heading}</h2>
              <p className="text-sm text-[#5A6070] leading-relaxed">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}

export async function LegalPageShell({ slug }: { slug: LegalDoc['slug'] }) {
  const composed = await getPageSections(slug)
  if (composed?.length) {
    return (
      <VisitorChrome pageKey={slug}>
        <PageSectionsRenderer sections={composed} />
      </VisitorChrome>
    )
  }

  const doc = await getLegalDoc(slug)
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <LegalArticle doc={doc} />
      <Footer />
    </div>
  )
}
