'use client'

import { StaffCoveRegister } from '@/components/staff/staff-cove-register'
import { StaffCoveProductsPanel } from '@/components/staff/staff-cove-products-panel'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'
import { CreditCard, Smartphone } from 'lucide-react'

/**
 * Retail sell surface: payment paths + Cove register only.
 * Stock/catalog is a separate admin block far below so table staff do not confuse it with ringing.
 */
export function StaffRetailPanel() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href="#cove-register"
          className="rounded-xl border-2 p-4 hover:opacity-95 transition-opacity"
          style={{ borderColor: '#085508', backgroundColor: '#EEF6EE' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[#085508] flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" aria-hidden />
            Path 1 · Cove Digital Card
          </p>
          <p className="mt-1.5 text-sm font-bold text-[#1A1A1A]">Staff laptop</p>
          <p className="mt-1 text-xs text-[#5A6070] leading-relaxed">
            Scan / look up → tap products → Charge Cove. Parents can also spend Cove balance in the
            portal.
          </p>
        </a>
        <div
          className="rounded-xl border-2 p-4"
          style={{ borderColor: '#0B3D0B', backgroundColor: '#F5F7F4' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[#0B3D0B] flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" aria-hidden />
            Path 2 · Square Stand / cash
          </p>
          <p className="mt-1.5 text-sm font-bold text-[#1A1A1A]">Card on iPad Stand</p>
          <p className="mt-1 text-xs text-[#5A6070] leading-relaxed">
            Any tap/swipe → ring on <strong>Square Stand</strong> only (syncs to Staff). Cash → this
            screen. Do not double-charge.
          </p>
        </div>
      </div>

      <p className="text-xs text-[#5A6070]">
        Already ordered online?{' '}
        <a href="#cove-fulfillment" className="font-bold underline" style={{ color: '#085508' }}>
          Pickup queue
        </a>
        {' · '}
        <a
          href="/staff/in-person"
          target="_blank"
          rel="noreferrer"
          className="font-bold underline"
          style={{ color: '#085508' }}
        >
          Print table card
        </a>
      </p>

      <StaffCoveRegister />

      {/* Hard separation: sell surface ends above. Catalog is admin-only. */}
      <div
        id="cove-stock-admin"
        className="scroll-mt-28 mt-16 pt-8 border-t-4 border-dashed border-[#C5CFC5] space-y-3"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5A6070]">
            After the table · Admin only
          </p>
          <h3 className="text-base font-bold text-[#1A1A1A] mt-1">Stock setup</h3>
          <p className="text-xs text-[#5A6070] mt-1 max-w-xl leading-relaxed">
            Add or restock products that appear as tiles on the register. Do not open this while
            ringing sales.
          </p>
        </div>
        <details className="rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] group">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
            <span>Edit products &amp; inventory</span>
            <span className="text-xs font-semibold text-[#5A6070] group-open:hidden">Show</span>
            <span className="text-xs font-semibold text-[#5A6070] hidden group-open:inline">
              Hide
            </span>
          </summary>
          <div className="border-t border-[#E8E4DC] px-4 pb-4 pt-3 space-y-4 bg-white">
            <StaffCoveProductsPanel />
            <StaffCmsCollectionPanel
              collection="CoveInventory"
              title="Cove inventory (advanced)"
              sectionId="cove-inventory"
            />
          </div>
        </details>
      </div>
    </div>
  )
}
