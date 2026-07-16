import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { getLegalDoc, type LegalDoc } from '@/lib/api/legal'

function LegalArticle({ doc }: { doc: LegalDoc }) {
  return (
    <main id="main-content" className="flex-1 py-12 md:py-16" style={{ backgroundColor: '#F5F0E8' }}>
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#085508' }}>
          SHMS PTO Legal
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
  const doc = await getLegalDoc(slug)
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <LegalArticle doc={doc} />
      <Footer />
    </div>
  )
}
