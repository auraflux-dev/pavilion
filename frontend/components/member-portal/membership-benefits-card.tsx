'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Loader2 } from 'lucide-react'
import type { MembershipEntitlement } from '@/lib/membership-entitlements'

type Benefits = {
  tier: string
  shirtSize: string
  entitlements: MembershipEntitlement[]
  discountCode: string
  coveFamilyCode: string
  paidMemberCode: boolean
}

export function MembershipBenefitsCard() {
  const [data, setData] = useState<Benefits | null>(null)
  const [busy, setBusy] = useState(true)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/portal/membership-benefits')
      if (!r.ok) {
        setData(null)
        return
      }
      const d = await r.json()
      if (!d?.entitlements?.length && !d?.discountCode) {
        setData(null)
        return
      }
      setData({
        tier: d.tier || '',
        shirtSize: d.shirtSize || '',
        entitlements: d.entitlements || [],
        discountCode: d.discountCode || '',
        coveFamilyCode: d.coveFamilyCode || '',
        paidMemberCode: Boolean(d.paidMemberCode),
      })
    } catch {
      setData(null)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (busy) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-white px-3 py-3 mb-4">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-green)]" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="rounded-xl border border-[var(--brand-line)] bg-[#FAFCF9] px-3 py-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070] flex items-center gap-1">
        <Gift className="w-3 h-3" />
        Membership benefits
        {data.tier ? ` · ${data.tier}` : ''}
      </p>
      <ul className="mt-2 space-y-2">
        {data.entitlements.map((e) => (
          <li key={e.kind} className="text-sm">
            <span className="font-bold text-[#1A1A1A]">{e.label}</span>
            {e.detail ? (
              <span className="text-[var(--brand-green)] font-mono text-xs ml-2">{e.detail}</span>
            ) : null}
            <span
              className={`ml-2 text-[10px] font-bold uppercase ${
                e.status === 'fulfilled'
                  ? 'text-green-700'
                  : e.status === 'pending'
                    ? 'text-amber-700'
                    : 'text-[#5A6070]'
              }`}
            >
              {e.status}
            </span>
            {e.notes ? <p className="text-[11px] text-[#5A6070] mt-0.5">{e.notes}</p> : null}
          </li>
        ))}
      </ul>
      {data.discountCode ? (
        <p className="text-xs mt-2 text-[#5A6070]">
          Enrichment code:{' '}
          <span className="font-mono font-bold text-[var(--brand-green)]">{data.discountCode}</span>
          <span className="block text-[11px] mt-0.5">Tier % also auto-applies at checkout.</span>
        </p>
      ) : null}
    </div>
  )
}
