'use client'

import { CreditCard, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { storeCardCheckoutUrl } from '@/lib/wix-checkout'

export function StoreCardCta() {
  return (
    <section className="py-14 md:py-20" style={{ backgroundColor: '#1A1A1A' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFD700' }}
        >
          <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
          Store Card
        </div>

        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to load your student&apos;s card?
        </h2>
        <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
          Most students spend $20–$40 per month. Load online, student taps their card at the window.
          Funds never expire.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {([20, 40, 50] as const).map((amount) => (
            <Button
              key={amount}
              className="font-bold text-[#1A1A1A] group px-8"
              style={{ backgroundColor: '#FFD700' }}
              onClick={() => window.open(storeCardCheckoutUrl(amount), '_blank', 'noopener,noreferrer')}
            >
              Load ${amount}
              <ArrowRight
                className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>
          ))}
        </div>

        <p className="text-white/30 text-xs mt-6">
          Secure checkout via Wix Payments. Funds applied to student account within minutes.
        </p>
      </div>
    </section>
  )
}
