import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { StoreCardHero } from '@/components/store/store-card-hero'
import { DealsStrip } from '@/components/store/deals-strip'
import { StoreGrid } from '@/components/store/store-grid'
import { StoreCardCta } from '@/components/store/store-card-cta'
import { getStoreItems, getFeaturedItems } from '@/lib/api/store'

export const revalidate = 0 // force-dynamic while debugging

export const metadata = {
  title: 'School Store | SHMS PTO',
  description:
    'Load your student\'s PTO store card and browse what\'s available at the Stone Hill Middle School store window — candy, snacks, and more.',
}

export default async function StorePage() {
  const [allItems, featuredItems] = await Promise.all([
    getStoreItems(),
    getFeaturedItems(),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        {/* 1. Store Card Hero — primary CTA above the fold */}
        <StoreCardHero />

        {/* 2. Deals of the Week — featured items strip */}
        <DealsStrip items={featuredItems} />

        {/* 3. Full inventory grid */}
        <StoreGrid items={allItems} />

        {/* 4. Repeat store card CTA at the bottom */}
        <StoreCardCta />
      </main>

      <Footer />
    </div>
  )
}
