'use client'

import { StaffCoveRegister } from '@/components/staff/staff-cove-register'
import { StaffCoveProductsPanel } from '@/components/staff/staff-cove-products-panel'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'

export function StaffRetailPanel() {
  return (
    <div className="space-y-6">
      <StaffCoveRegister />
      <StaffCoveProductsPanel />
      <div className="rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] px-4 py-3 text-xs text-[#5A6070] space-y-1">
        <p className="font-bold text-[#1A1A1A]">Guest / no portal login?</p>
        <p>
          The register above only charges a prepaid Cove <strong>digital card</strong> (family code).
          If someone at an event wants snacks or spirit wear without a member login, take payment on{' '}
          <strong>Square Stand</strong> (iPad) as a normal card-present sale. Digital card loads still
          require a parent portal login online.
        </p>
      </div>
      <StaffCmsCollectionPanel
        collection="CoveInventory"
        title="Cove inventory (advanced)"
      />
      <p className="text-[11px] text-[#5A6070] px-1">
        Prefer <strong>Cove products</strong> above to key in restock quantities. This table is a
        backup if you need to fix a qty/SKU row directly.
      </p>
    </div>
  )
}
