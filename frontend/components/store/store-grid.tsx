'use client'

import { useState } from 'react'
import type { StoreItem } from '@/lib/api/store'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

interface StoreGridProps {
  items: StoreItem[]
}

const ALL_CATEGORIES = ['All', 'Candy', 'Snacks', 'Drinks'] as const

const CATEGORY_EMOJI: Record<string, string> = {
  Candy: '🍬',
  Snacks: '🍿',
  Drinks: '🥤',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Candy: { bg: 'var(--brand-soft)', text: 'var(--brand-green)' },
  Snacks: { bg: 'var(--brand-soft)', text: 'var(--brand-green)' },
  Drinks: { bg: 'var(--brand-soft)', text: 'var(--brand-green)' },
}

export function StoreGrid({ items }: StoreGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All')

  const filtered =
    activeCategory === 'All'
      ? items
      : items.filter((i) => i.category === activeCategory)

  const inStock = filtered.filter((i) => i.inStock)
  const outOfStock = filtered.filter((i) => !i.inStock)

  return (
    <section id="menu" className="py-8 md:py-12 scroll-mt-28" style={{ backgroundColor: 'var(--brand-warm)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">What&apos;s in the Store</h2>
          <p className="text-[#5A6070] text-sm">
            {vanillaizeIfDemo(
              'In-person snack window only. Students spend with their Cove Digital Card. Online reload anytime after free or paid parent login.',
            )}
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Filter by category">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={
                activeCategory === cat
                  ? { backgroundColor: 'var(--brand-green)', color: 'white' }
                  : { backgroundColor: 'white', color: '#5A6070', border: '1px solid var(--border)' }
              }
              aria-pressed={activeCategory === cat}
            >
              {cat !== 'All' && <span className="mr-1.5">{CATEGORY_EMOJI[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-[#5A6070] py-16">No items in this category yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {inStock.map((item) => (
                <ItemCard key={item._id} item={item} />
              ))}
            </div>

            {outOfStock.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-bold text-[#5A6070] uppercase tracking-wider mb-4">
                  Temporarily Out of Stock
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 opacity-50">
                  {outOfStock.map((item) => (
                    <ItemCard key={item._id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-[#5A6070] mt-10 max-w-lg mx-auto">
          {vanillaizeIfDemo(
            'Items and prices may vary. Snack-window hours are in person only; load the card online anytime. Use your Cove Digital Card (code or QR) to pay. No cash at the snack window. Guests without a portal login can buy spirit wear / merch on Square Stand with staff.',
          )}
        </p>
      </div>
    </section>
  )
}

function ItemCard({ item }: { item: StoreItem }) {
  const colors = CATEGORY_COLORS[item.category] ?? { bg: 'var(--brand-warm)', text: '#5A6070' }

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[var(--border)] flex flex-col">
      {/* Product image or emoji fallback */}
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          className="h-24 w-full object-cover"
        />
      ) : (
        <div
          className="h-24 flex items-center justify-center text-3xl"
          style={{ backgroundColor: colors.bg }}
          aria-hidden="true"
        >
          {CATEGORY_EMOJI[item.category] ?? '🍬'}
        </div>
      )}

      <div className="p-3 flex flex-col flex-1">
        <span
          className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded self-start mb-1"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {item.category}
        </span>
        <p className="text-[11px] text-[#5A6070] font-medium">{item.brand}</p>
        <p className="text-sm font-bold text-[#1A1A1A] leading-tight mt-0.5 line-clamp-2 flex-1">
          {item.name}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-bold" style={{ color: 'var(--brand-green)' }}>
            ${item.price.toFixed(2)}
          </span>
          {!item.inStock && (
            <span className="text-[10px] font-bold text-red-500">Out of stock</span>
          )}
        </div>
      </div>
    </article>
  )
}
