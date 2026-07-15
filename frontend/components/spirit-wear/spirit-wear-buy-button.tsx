'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { startWixCheckout } from '@/lib/start-checkout'

interface Props {
  productId: string
  disabled?: boolean
}

/** Spirit wear buys require a free parent account so orders attach to a known member. */
export function SpiritWearBuyButton({ productId, disabled }: Props) {
  const { status } = useAuth()
  const pathname = usePathname()
  const [busy, setBusy] = useState(false)

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
        href={`/auth/login?returnTo=${returnTo}`}
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
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await startWixCheckout({
            kind: 'product',
            productId,
            postFlowUrl: `${window.location.origin}/spirit-wear`,
          })
        } finally {
          setBusy(false)
        }
      }}
      className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors text-white disabled:opacity-60"
      style={{ backgroundColor: '#085508' }}
    >
      {busy ? '…' : 'Buy'}
    </button>
  )
}
