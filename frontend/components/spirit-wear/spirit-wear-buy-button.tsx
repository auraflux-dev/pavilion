'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'

interface Props {
  productId: string
  /** List price from catalog (server-rendered). */
  price: number
  productName?: string
  disabled?: boolean
}

/** Cove / spirit buys — free or paid member, own CC in portal via Square. */
export function SpiritWearBuyButton({ productId, price, productName, disabled }: Props) {
  const { status } = useAuth()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (disabled) {
    return (
      <span className="text-xs font-bold px-3 py-1.5 rounded-full text-[#5A6070] bg-[#F0EDE8]">
        Unavailable
      </span>
    )
  }

  if (status === 'loading') {
    return (
      <span
        className="text-xs font-bold px-3 py-1.5 rounded-full text-white/70"
        style={{ backgroundColor: '#085508' }}
      >
        …
      </span>
    )
  }

  if (status === 'visitor') {
    const returnTo = encodeURIComponent(pathname)
    return (
      <a
        href={`/auth/join?returnTo=${returnTo}`}
        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors"
        style={{ borderColor: '#085508', color: '#085508' }}
        title="Create a free parent account or log in to buy"
      >
        <Lock className="w-3 h-3" />
        Log in
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors text-white"
        style={{ backgroundColor: '#085508' }}
      >
        Buy
      </button>
      <PortalCardCheckout
        open={open}
        onClose={() => setOpen(false)}
        amount={price}
        title={productName || 'The Cove'}
        subtitle="Pay with your credit or debit card — stays on shmspto.org"
        payBody={{ kind: 'product', productId }}
        containerId={`cove-pay-${productId.slice(0, 8)}`}
        onPaid={() => {
          window.dispatchEvent(new CustomEvent('cove-purchase'))
        }}
      />
    </>
  )
}
