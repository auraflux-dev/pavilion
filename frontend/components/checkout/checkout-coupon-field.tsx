'use client'

import { useEffect, useState } from 'react'
import { getStoredCouponCode, setStoredCouponCode } from '@/lib/start-checkout'

/** Compact coupon field; persists to sessionStorage for checkout. */
export function CheckoutCouponField({
  className = '',
  label = 'Discount code',
}: {
  className?: string
  label?: string
}) {
  const [code, setCode] = useState('')

  useEffect(() => {
    setCode(getStoredCouponCode())
  }, [])

  return (
    <label className={`block text-xs font-bold text-[#5A6070] ${className}`}>
      {label}
      <input
        type="text"
        value={code}
        onChange={(e) => {
          const next = e.target.value.toUpperCase()
          setCode(next)
          setStoredCouponCode(next)
        }}
        placeholder="Optional"
        autoComplete="off"
        className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-mono font-normal tracking-wide uppercase"
      />
      <span className="mt-1 block text-[11px] font-normal text-[#5A6070]">
        For spirit wear and enrichment when available. Not for membership or store cards.
      </span>
    </label>
  )
}
