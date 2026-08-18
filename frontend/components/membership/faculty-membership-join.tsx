'use client'

/**
 * Faculty / staff $20 membership — choose magnet OR Spirit Wear design/size, then pay.
 */
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { MemberGate } from '@/components/member-gate'
import { PortalCardCheckout } from '@/components/checkout/portal-card-checkout'
import {
  MembershipShirtPicker,
  type MembershipShirtSelection,
} from '@/components/membership/membership-shirt-picker'
import type { PhysicalPerkChoice } from '@/lib/membership-entitlements'
import { vanillaizeIfDemo } from '@/lib/demo/brand'

type Props = {
  price: number
}

export function FacultyMembershipJoin({ price }: Props) {
  const [open, setOpen] = useState(false)
  const [shirt, setShirt] = useState<MembershipShirtSelection | null>(null)
  const [physicalPerk, setPhysicalPerk] = useState<PhysicalPerkChoice | ''>('')
  const needsShirt = physicalPerk === 'spirit_shirt'
  const ready =
    physicalPerk === 'magnet' || (physicalPerk === 'spirit_shirt' && !!shirt)

  return (
    <MemberGate
      label={`Join Faculty · $${price.toFixed(0)}`}
      returnToQuery="checkout=faculty"
    >
      <div className="space-y-3 text-left w-full">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-[#5A6070]">
            Included perk — choose one
          </legend>
          <label className="flex items-start gap-2 text-sm text-[#1A1A1A] cursor-pointer">
            <input
              type="radio"
              name="faculty-perk"
              className="mt-1"
              checked={physicalPerk === 'magnet'}
              onChange={() => {
                setPhysicalPerk('magnet')
                setShirt(null)
              }}
            />
            <span>
              <span className="font-semibold">{vanillaizeIfDemo('Stone Hill car magnet')}</span>
              <span className="block text-xs text-[#5A6070]">About $10 value</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-[#1A1A1A] cursor-pointer">
            <input
              type="radio"
              name="faculty-perk"
              className="mt-1"
              checked={physicalPerk === 'spirit_shirt'}
              onChange={() => setPhysicalPerk('spirit_shirt')}
            />
            <span>
              <span className="font-semibold">Spirit Wear T-shirt</span>
              <span className="block text-xs text-[#5A6070]">About $18 value</span>
            </span>
          </label>
        </fieldset>
        <MembershipShirtPicker required={needsShirt} value={shirt} onChange={setShirt} />
        <button
          type="button"
          disabled={!ready}
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 font-semibold text-white px-5 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#085508' }}
        >
          Join Faculty · ${price.toFixed(0)}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        {!physicalPerk ? (
          <p className="text-[11px] text-[#5A6070]">Choose magnet or T-shirt to continue.</p>
        ) : null}
        <PortalCardCheckout
          open={open}
          onClose={() => setOpen(false)}
          amount={price}
          title="Join Faculty"
          subtitle={
            physicalPerk === 'spirit_shirt' && shirt
              ? `Faculty membership · ${shirt.label}.`
              : physicalPerk === 'magnet'
                ? vanillaizeIfDemo('Faculty membership · Stone Hill car magnet.')
                : 'Faculty membership for the school year.'
          }
          payBody={{
            kind: 'membership',
            tier: 'faculty',
            shirtSize: needsShirt ? shirt?.size : undefined,
            shirtDesign: needsShirt ? shirt?.design : undefined,
            shirtProductId: needsShirt ? shirt?.productId : undefined,
            shirtVariantId: needsShirt ? shirt?.variantId : undefined,
            physicalPerk: physicalPerk || null,
          }}
          containerId="membership-pay-faculty"
          onPaid={() => {
            sessionStorage.removeItem('pendingMembership')
            window.location.href = '/member-portal?membership=success'
          }}
        />
      </div>
    </MemberGate>
  )
}
