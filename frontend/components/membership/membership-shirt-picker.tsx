'use client'

import { useEffect, useMemo, useState } from 'react'
import { SHIRT_SIZES } from '@/lib/membership-entitlements'

type SizeOpt = {
  size: string
  variantId: string
  sku: string
  quantity: number
  available: boolean
  label: string
}

type DesignGroup = {
  design: string
  sizes: SizeOpt[]
}

export type MembershipShirtSelection = {
  productId: string
  variantId: string
  design: string
  size: string
  label: string
}

type Props = {
  /** When false, picker is hidden (tier does not include a shirt). */
  required: boolean
  value: MembershipShirtSelection | null
  onChange: (next: MembershipShirtSelection | null) => void
}

/**
 * Spirit Wear perk picker.
 * Default: size-only (legacy) until SiteSettings membershipShirtDesignsEnabled is on.
 * When enabled: design + size with inventory hold.
 */
export function MembershipShirtPicker({ required, value, onChange }: Props) {
  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('Spirit Wear T-shirt')
  const [designsEnabled, setDesignsEnabled] = useState(false)
  const [designs, setDesigns] = useState<DesignGroup[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [design, setDesign] = useState(value?.design ?? '')

  useEffect(() => {
    if (!required) return
    let cancelled = false
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const r = await fetch('/api/membership/shirt-options')
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Could not load shirt options')
        if (cancelled) return
        setProductId(String(d.productId ?? ''))
        setProductName(String(d.productName ?? 'Spirit Wear T-shirt'))
        const enabled = Boolean(d.designsEnabled)
        setDesignsEnabled(enabled)
        const groups = enabled ? ((d.designs ?? []) as DesignGroup[]) : []
        setDesigns(groups)
        const firstAvailable = groups.find((g) => g.sizes.some((s) => s.available))
        if (firstAvailable && !design) setDesign(firstAvailable.design)
      } catch (err) {
        if (!cancelled) {
          // Fall back to size-only if options API fails
          setDesignsEnabled(false)
          setError('')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when required
  }, [required])

  const availableDesigns = useMemo(
    () => designs.filter((d) => d.sizes.some((s) => s.available)),
    [designs],
  )

  const sizesForDesign = useMemo(() => {
    const group = designs.find((d) => d.design === design)
    return (group?.sizes ?? []).filter((s) => s.available)
  }, [designs, design])

  if (!required) return null

  if (!designsEnabled) {
    return (
      <label className="block text-xs text-[#5A6070]">
        Spirit Wear T-shirt size <span className="text-red-500">*</span>
        <select
          value={value?.size ?? ''}
          onChange={(e) => {
            const size = e.target.value
            if (!size) {
              onChange(null)
              return
            }
            onChange({
              productId: '',
              variantId: '',
              design: '',
              size,
              label: size,
            })
          }}
          className="mt-1 w-full border border-[#E8E4DC] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A] bg-white"
        >
          <option value="">Select size</option>
          {SHIRT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#085508]">
          Spirit Wear perk
        </p>
        <p className="mt-0.5 text-sm font-bold text-[#1A1A1A]">{productName}</p>
        <p className="mt-1 text-xs text-[#5A6070] leading-relaxed">
          Choose a design and size. We hold that unit so it cannot be sold to someone else.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-[#5A6070]">Loading designs…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : !availableDesigns.length ? (
        <p className="text-xs text-amber-800">
          No shirt designs in stock right now. Email vp-membershipexperience@shmspto.org and we
          will follow up.
        </p>
      ) : (
        <>
          <label className="block text-xs font-bold text-[#5A6070] space-y-1">
            Design <span className="text-red-500">*</span>
            <select
              value={design}
              onChange={(e) => {
                const nextDesign = e.target.value
                setDesign(nextDesign)
                onChange(null)
              }}
              className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
            >
              <option value="">Select design</option>
              {availableDesigns.map((d) => (
                <option key={d.design} value={d.design}>
                  {d.design}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-[#5A6070] space-y-1">
            Size <span className="text-red-500">*</span>
            <select
              value={value?.variantId ?? ''}
              disabled={!design}
              onChange={(e) => {
                const variantId = e.target.value
                const sizeRow = sizesForDesign.find((s) => s.variantId === variantId)
                if (!sizeRow || !productId) {
                  onChange(null)
                  return
                }
                onChange({
                  productId,
                  variantId: sizeRow.variantId,
                  design,
                  size: sizeRow.size,
                  label: sizeRow.label,
                })
              }}
              className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A] disabled:opacity-50"
            >
              <option value="">Select size</option>
              {sizesForDesign.map((s) => (
                <option key={s.variantId} value={s.variantId}>
                  {s.size}
                  {s.quantity <= 3 ? ` (${s.quantity} left)` : ''}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  )
}
