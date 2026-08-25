'use client'

import { StaffCoveRegister } from '@/components/staff/staff-cove-register'
import { StaffCoveProductsPanel } from '@/components/staff/staff-cove-products-panel'
import { StaffCmsCollectionPanel } from '@/components/staff/staff-cms-collection-panel'
import { StaffReveal } from '@/components/staff/staff-reveal'
import { useLiveCommerceGate } from '@/lib/demo/commons-surface-context'
import { Smartphone } from 'lucide-react'

/**
 * Cove table ops intro. Selling is Square Stand / mobile reader — not Staff register.
 * Pickups, demand, and admin (stock + hidden register) are siblings below.
 */
export function StaffRetailPanel() {
  const { allowed: liveCommerce } = useLiveCommerceGate()

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#FAFCF9] px-4 py-3">
      <p className="text-sm font-bold text-[#1A1A1A]">Cove · table ops</p>
      <p className="text-xs text-[#5A6070] mt-1 leading-relaxed max-w-2xl">
        Ring on <strong>Square Stand</strong> or the mobile card reader. This page is for handoffs,
        size demand, and inventory — not day-to-day ringing.
      </p>
      <p className="text-xs text-[#5A6070] mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <a
          href="/staff?view=help&article=cove-in-person-square-stand"
          className="font-bold underline inline-flex items-center gap-1"
          style={{ color: 'var(--brand-green)' }}
        >
          <Smartphone className="w-3.5 h-3.5" aria-hidden />
          Stand playbook
        </a>
        <a
          href="/staff?view=help&article=cove-in-person-manual"
          className="font-bold underline"
          style={{ color: 'var(--brand-green)' }}
        >
          Full manual
        </a>
        {liveCommerce ? (
          <a
            href="/staff/in-person"
            target="_blank"
            rel="noreferrer"
            className="font-bold underline"
            style={{ color: 'var(--brand-green)' }}
          >
            Print table card
          </a>
        ) : null}
      </p>
    </div>
  )
}

/**
 * Admin block: stock in a details fold; Staff register via StaffReveal
 * (Stand + mobile reader both down).
 */
export function StaffCoveStockAdmin() {
  const { allowed: liveCommerce } = useLiveCommerceGate()

  return (
    <div
      id="cove-stock-admin"
      className="scroll-mt-28 rounded-xl border border-dashed border-[#C5CFC5] bg-white p-4 sm:p-5 space-y-3"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5A6070]">
          Admin · after the table
        </p>
        <h3 className="text-base font-bold text-[#1A1A1A] mt-1">Stock &amp; backup tools</h3>
        <p className="text-xs text-[#5A6070] mt-1 max-w-xl leading-relaxed">
          Restock products between rushes. Staff register stays hidden — only open it if Stand and
          the mobile reader both cannot take a sale.
        </p>
      </div>

      <details className="rounded-xl border border-[var(--border)] bg-white group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
          <span>Show catalog · snacks &amp; spirit wear</span>
          <span className="text-xs font-bold text-[#5A6070] group-open:hidden">Show</span>
          <span className="text-xs font-bold text-[#5A6070] hidden group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-4 bg-white">
          <StaffCoveProductsPanel />
          <StaffCmsCollectionPanel
            collection="CoveInventory"
            title="Cove inventory (advanced)"
            sectionId="cove-inventory"
          />
        </div>
      </details>

      <StaffReveal
        storageKey="cove-staff-register-open"
        id="cove-register"
        title="Staff register · backup only"
        closedTitle="Show Staff register backup"
        hint="Cove / saved card · External · only if Stand and mobile reader are down"
      >
        {liveCommerce ? (
          <StaffCoveRegister />
        ) : (
          <p className="text-sm text-[#5A6070]">
            Connect Square in Staff → Payments to use the Staff register backup.
          </p>
        )}
      </StaffReveal>
    </div>
  )
}
