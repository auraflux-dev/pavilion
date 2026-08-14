'use client'

/**
 * Staff helper: add Design · Size variants on the membership Spirit Wear tee
 * and sync CoveInventory so paid checkout can hold stock.
 */
import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SHIRT_SIZES } from '@/lib/membership-entitlements'
import { formatMembershipShirtLabel } from '@/lib/membership-shirt-label'

type Variant = {
  id: string
  label: string
  price: number
  sku: string
  quantity: number | null
}

type Product = {
  id: string
  name: string
  price: number
  variants: Variant[]
}

export function StaffMembershipShirtDesignsPanel() {
  const [product, setProduct] = useState<Product | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [designName, setDesignName] = useState('')
  const [sizeQtys, setSizeQtys] = useState<Record<string, string>>(
    Object.fromEntries(SHIRT_SIZES.map((s) => [s, ''])),
  )

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const opt = await fetch('/api/membership/shirt-options')
      const optData = await opt.json()
      if (!opt.ok) throw new Error(optData.error ?? 'Could not resolve shirt product')
      const productId = String(optData.productId ?? '')
      const r = await fetch('/api/staff/cove/products')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      const match = ((d.products ?? []) as Product[]).find((p) => p.id === productId)
      if (!match) {
        throw new Error(
          'Membership shirt product not in Cove product list. Confirm spiritWearProductIds / Stock setup.',
        )
      }
      setProduct(match)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addDesign(e: React.FormEvent) {
    e.preventDefault()
    if (!product) return
    const design = designName.trim()
    if (!design) {
      setError('Design name is required')
      return
    }
    const additions: Array<{ label: string; price: number; quantity: number; sku: string }> = []
    for (const size of SHIRT_SIZES) {
      const qty = Math.max(0, Math.floor(Number(sizeQtys[size]) || 0))
      if (qty <= 0) continue
      additions.push({
        label: formatMembershipShirtLabel(design, size),
        price: product.price || 18,
        quantity: qty,
        sku: '',
      })
    }
    if (!additions.length) {
      setError('Enter quantity for at least one size')
      return
    }

    setBusy(true)
    setError('')
    setStatus('')
    try {
      const existing = (product.variants ?? [])
        .filter((v) => v.label && v.label !== 'Default')
        .map((v) => ({
          id: v.id,
          label: v.label,
          price: v.price,
          quantity: v.quantity ?? 0,
          sku: v.sku ?? '',
        }))

      // Replace any prior rows for this design name
      const designLower = design.toLowerCase()
      const kept = existing.filter((v) => {
        const parsedDesign = v.label.includes('·')
          ? v.label.split('·')[0]!.trim().toLowerCase()
          : 'standard'
        return parsedDesign !== designLower
      })

      const r = await fetch('/api/staff/cove/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          price: product.price,
          showOnCove: true,
          optionName: 'Design · Size',
          variants: [...kept, ...additions],
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save design')
      setStatus(`Saved design “${design}” with ${additions.length} size(s). Inventory held for membership checkout.`)
      setDesignName('')
      setSizeQtys(Object.fromEntries(SHIRT_SIZES.map((s) => [s, ''])))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      id="cove-membership-shirts"
      className="scroll-mt-28 rounded-2xl border border-[#E8E4DC] bg-white shadow-sm overflow-hidden"
    >
      <div
        className="flex items-start gap-3 border-b border-[#F0EDE8] px-5 py-4"
        style={{ backgroundColor: '#FAFCF9' }}
      >
        <Shirt className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#085508' }} aria-hidden />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A6070]">
            Paid membership perk
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-[#1A1A1A]">
            Shirt designs (held at checkout)
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5A6070]">
            Add a design name and sizes with quantities. Checkout stays size-only until Site
            Settings → <span className="font-semibold">membershipShirtDesignsEnabled</span> is
            turned on. Then parents pick design + size and that unit is held so the register
            cannot sell it.
          </p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {product ? (
          <p className="text-sm text-[#5A6070]">
            Product: <span className="font-semibold text-[#1A1A1A]">{product.name}</span>
            <span className="text-xs font-mono text-[#9AA3B0]"> · {product.id}</span>
          </p>
        ) : null}

        {product?.variants?.length ? (
          <ul className="space-y-1 text-sm">
            {product.variants
              .filter((v) => v.label && v.label !== 'Default')
              .map((v) => (
                <li key={v.id} className="flex justify-between gap-3 border-b border-[#F0EDE8] py-1.5">
                  <span className="font-medium text-[#1A1A1A]">{v.label}</span>
                  <span className="tabular-nums text-[#085508] font-bold">
                    {v.quantity ?? 0} left
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-[#5A6070]">No design variants yet.</p>
        )}

        <form onSubmit={(e) => void addDesign(e)} className="space-y-3 rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] p-4">
          <h3 className="text-sm font-bold text-[#1A1A1A]">Add / replace a design</h3>
          <label className="block text-xs font-bold text-[#5A6070] space-y-1">
            Design name *
            <input
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="e.g. Classic Green · Stingray Crest"
              className="w-full rounded-lg border border-[#E8E4DC] bg-white px-3 py-2 text-sm font-normal text-[#1A1A1A]"
            />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SHIRT_SIZES.map((size) => (
              <label key={size} className="text-xs font-bold text-[#5A6070] space-y-1">
                {size}
                <input
                  type="number"
                  min={0}
                  value={sizeQtys[size] ?? ''}
                  onChange={(e) =>
                    setSizeQtys((prev) => ({ ...prev, [size]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-[#E8E4DC] bg-white px-2 py-1.5 text-sm font-normal text-[#1A1A1A]"
                />
              </label>
            ))}
          </div>
          <Button
            type="submit"
            disabled={busy || !product}
            className="gap-2 text-white"
            style={{ backgroundColor: '#085508' }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save design sizes
          </Button>
        </form>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {status ? <p className="text-sm font-semibold text-green-700">{status}</p> : null}
      </div>
    </section>
  )
}
