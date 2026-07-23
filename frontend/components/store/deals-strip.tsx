import { Zap } from 'lucide-react'
import type { StoreItem } from '@/lib/api/store'

interface DealsStripProps {
  items: StoreItem[]
}

const CATEGORY_EMOJI: Record<string, string> = {
  Candy: '🍬',
  Snacks: '🍿',
  Drinks: '🥤',
}

export function DealsStrip({ items }: DealsStripProps) {
  if (items.length === 0) return null

  return (
    <section className="py-7 md:py-9 border-b border-[#E8E4DC]" style={{ backgroundColor: '#FFF8E7' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#085508' }}
          >
            <Zap className="w-5 h-5 text-white fill-current" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Deals of the Week</h2>
            <p className="text-xs text-[#5A6070]">Staff picks. Rotating weekly</p>
          </div>
        </div>

        {/* Horizontal scroll strip */}
        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
          {items.map((item) => (
            <article
              key={item._id}
              className="snap-start shrink-0 w-44 bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E8E4DC] flex flex-col"
            >
              {/* Product image or emoji fallback */}
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-28 w-full object-cover"
                />
              ) : (
                <div
                  className="h-28 flex items-center justify-center text-4xl"
                  style={{ backgroundColor: '#F5F0E8' }}
                  aria-hidden="true"
                >
                  {CATEGORY_EMOJI[item.category] ?? '🍬'}
                </div>
              )}

              <div className="p-3 flex flex-col flex-1">
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#5A6070] mb-0.5">
                  {item.brand}
                </p>
                <p className="text-sm font-bold text-[#1A1A1A] leading-tight mb-2 line-clamp-2">
                  {item.name}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-lg font-bold" style={{ color: '#085508' }}>
                    ${item.price.toFixed(2)}
                  </span>
                  {!item.inStock && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                      Out
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
