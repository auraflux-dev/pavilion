'use client'

import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart/store'

export function CartButton() {
  const { count, setOpen } = useCart()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative p-2 rounded-md hover:bg-[var(--brand-soft)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-green)]"
      aria-label={count > 0 ? `Bag, ${count} items` : 'Bag'}
    >
      <ShoppingBag className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
      {count > 0 ? (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center tabular-nums"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}
