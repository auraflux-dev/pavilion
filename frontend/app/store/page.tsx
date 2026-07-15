import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { StoreCardHero } from '@/components/store/store-card-hero'
import { DealsStrip } from '@/components/store/deals-strip'
import { StoreGrid } from '@/components/store/store-grid'
import { StoreCardCta } from '@/components/store/store-card-cta'
import { getStoreItems, getFeaturedItems } from '@/lib/api/store'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { getPageContent } from '@/lib/api/page-content'

export const revalidate = 300 // 5 min cache

export const metadata = {
  title: 'School Store | SHMS PTO',
  description:
    "Load your student's PTO store card and browse what's available at the Stone Hill Middle School store window — candy, snacks, and more.",
}

function parseHowSteps(bullets: string[]) {
  return bullets.map((line, i) => {
    const parts = line.split('|')
    if (parts.length >= 3) {
      return { step: parts[0], title: parts[1], body: parts.slice(2).join('|') }
    }
    return { step: String(i + 1), title: line, body: '' }
  })
}

export default async function StorePage() {
  const [allItems, featuredItems, catalog, storeCopy, howCopy, ctaCopy] = await Promise.all([
    getStoreItems(),
    getFeaturedItems(),
    getCatalogConfig(),
    getPageContent('store'),
    getPageContent('store-how'),
    getPageContent('store-cta'),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <StoreCardHero
          amounts={catalog.storeCardAmounts}
          eyebrow={storeCopy.eyebrow}
          title={storeCopy.title}
          perks={storeCopy.bullets}
          howItWorks={parseHowSteps(howCopy.bullets)}
        />

        <DealsStrip items={featuredItems} />

        <StoreGrid items={allItems} />

        <StoreCardCta
          amounts={catalog.storeCardAmounts}
          eyebrow={ctaCopy.eyebrow}
          title={ctaCopy.title}
          body={ctaCopy.body}
        />
      </main>

      <Footer />
    </div>
  )
}
