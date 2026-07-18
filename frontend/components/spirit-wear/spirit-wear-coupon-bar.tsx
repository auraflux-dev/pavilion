'use client'

import { CheckoutCouponField } from '@/components/checkout/checkout-coupon-field'

/** Page-level coupon entry for spirit-wear product checkouts. */
export function SpiritWearCouponBar() {
  return (
    <div className="mb-8 max-w-md mx-auto sm:mx-0">
      <CheckoutCouponField label="Have a discount code?" />
    </div>
  )
}
