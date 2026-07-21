'use client'

import { StaffCoveRegister } from '@/components/staff/staff-cove-register'
import { StaffCoveProductsPanel } from '@/components/staff/staff-cove-products-panel'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'

export function StaffRetailPanel() {
  return (
    <div className="space-y-6">
      <StaffCoveRegister />
      <StaffCoveProductsPanel />
      <StaffCmsCollectionPanel
        collection="CoveInventory"
        title="Cove inventory (advanced)"
      />
      <p className="text-[11px] text-[#5A6070] px-1">
        Prefer <strong>Cove products</strong> above for day-to-day adds and restocks. The inventory
        table is a backup if you need to fix a SKU/qty row directly. Membership and spirit-wear
        catalog items can stay in Wix if needed; snacks should live here.
      </p>
    </div>
  )
}
