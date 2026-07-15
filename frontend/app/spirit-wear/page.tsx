import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { PageHero } from '@/components/page-hero'
import { getSpiritWearItems } from '@/lib/api/store'
import { getPageContent } from '@/lib/api/page-content'
import { SpiritWearBuyButton } from '@/components/spirit-wear/spirit-wear-buy-button'

export const revalidate = 300

export const metadata = {
  title: 'Spirit Wear | SHMS PTO',
  description: 'Show your Stingrays pride. Shop SHMS spirit wear — t-shirts, hoodies, hats, and more. Available year-round.',
}

export default async function SpiritWearPage() {
  const [items, page] = await Promise.all([
    getSpiritWearItems(),
    getPageContent('spirit-wear'),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content" className="flex-1">
        <PageHero content={page} />

        {/* Product grid */}
        <section className="py-12 md:py-16" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {items.length === 0 ? (
              <p className="text-center text-[#5A6070] py-20">
                Spirit wear coming soon — check back shortly.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {items.map((item) => (
                  <article
                    key={item._id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E8E4DC] flex flex-col group"
                  >
                    {/* Image */}
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

                    {/* Info */}
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
                          disabled={!item.inStock}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-[#5A6070] mt-10 max-w-lg mx-auto">
              Orders are processed through Wix Stores. Pick-up at the school main office within 5–7 school days.
            </p>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
