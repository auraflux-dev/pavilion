import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { StoreCardHero } from '@/components/store/store-card-hero'
import { DealsStrip } from '@/components/store/deals-strip'
import { StoreGrid } from '@/components/store/store-grid'
import { StoreCardCta } from '@/components/store/store-card-cta'
import { getStoreItems, getFeaturedItems, getSpiritWearItems } from '@/lib/api/store'
import { getCatalogConfig } from '@/lib/api/catalog-config'
import { getPageContent } from '@/lib/api/page-content'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getStoreCardBonusPercent } from '@/lib/store-card-bonus'
import { SpiritWearBuyButton } from '@/components/spirit-wear/spirit-wear-buy-button'
import { SpiritWearCouponBar } from '@/components/spirit-wear/spirit-wear-coupon-bar'

export const revalidate = 300

export const metadata = {
  title: 'The Cove | SHMS PTO',
  description:
    'The Cove — SHMS PTO store card, snack window menu, and spirit wear in one place.',
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

export default async function CovePage() {
  const [allItems, featuredItems, spiritItems, catalog, storeCopy, howCopy, ctaCopy, spiritCopy, settings] =
    await Promise.all([
      getStoreItems(),
      getFeaturedItems(),
      getSpiritWearItems(),
      getCatalogConfig(),
      getPageContent('store'),
      getPageContent('store-how'),
      getPageContent('store-cta'),
      getPageContent('spirit-wear'),
      getSiteSettings(),
    ])

  const bonusPercent = getStoreCardBonusPercent(settings.get('storeCardBonusPercent', '10'))

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        <StoreCardHero
          amounts={catalog.storeCardAmounts}
          eyebrow={storeCopy.eyebrow || 'The Cove'}
          title={storeCopy.title || 'Become a free member, then load a Cove card.'}
          perks={
            storeCopy.bullets.length
              ? storeCopy.bullets
              : [
                  'Free parent membership required',
                  `${bonusPercent}% bonus on every reload`,
                  'Funds never expire',
                ]
          }
          howItWorks={parseHowSteps(howCopy.bullets)}
          bonusPercent={bonusPercent}
        />

        <DealsStrip items={featuredItems} />

        <StoreGrid items={allItems} />

        <section
          id="shop"
          className="py-12 md:py-16"
          style={{ backgroundColor: '#F5F0E8' }}
          aria-labelledby="cove-shop-heading"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2"
                style={{ color: '#085508' }}
              >
                {spiritCopy.eyebrow || 'Spirit & merchandise'}
              </p>
              <h2
                id="cove-shop-heading"
                className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]"
              >
                {spiritCopy.title || 'Spirit wear & more'}
              </h2>
              {spiritCopy.body ? (
                <p className="mt-2 text-[#5A6070] leading-relaxed">{spiritCopy.body}</p>
              ) : null}
            </div>

            <SpiritWearCouponBar />

            {spiritItems.length === 0 ? (
              <p className="text-center text-[#5A6070] py-16">
                Spirit wear and Cove merchandise will appear here when listed.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {spiritItems.map((item) => (
                  <article
                    key={item._id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E8E4DC] flex flex-col group"
                  >
                    <div className="relative overflow-hidden" style={{ backgroundColor: '#EEF6EE' }}>
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center text-5xl">
                          👕
                        </div>
                      )}
                      {!item.inStock && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#5A6070] bg-white px-3 py-1 rounded-full border border-[#E8E4DC]">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-sm font-bold text-[#1A1A1A] leading-snug flex-1 mb-3">
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold" style={{ color: '#085508' }}>
                          ${item.price.toFixed(2)}
                        </span>
                        <SpiritWearBuyButton
                          productId={item._id}
                          price={item.price}
                          productName={item.name}
                          disabled={!item.inStock}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <StoreCardCta
          amounts={catalog.storeCardAmounts}
          eyebrow={ctaCopy.eyebrow}
          title={ctaCopy.title}
          body={ctaCopy.body}
          bonusPercent={bonusPercent}
        />
      </main>

      <Footer />
    </div>
  )
}
