'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Family = {
  parentEmail: string
  coveFamilyCode: string
  balance: number
  hasCard: boolean
  gan?: string
  students: Array<{ id: string; firstName: string; lastName: string }>
}

type Product = {
  id: string
  variantId: string
  name: string
  price: number
  category: string
  sku: string
  quantity: number | null
  available: boolean
  image?: string
  featured?: boolean
  dealLabel?: string
}

type CartLine = {
  productId: string
  variantId: string
  name: string
  price: number
  qty: number
}

function lineKey(productId: string, variantId: string) {
  return `${productId}:${variantId || ''}`
}

/**
 * In-person Cove window register — tap tiles, weekly deals on top, one Charge button.
 * Restock qty lives in Cove products below. No barcodes on this screen.
 */
export function StaffCoveRegister() {
  const [code, setCode] = useState('')
  const [family, setFamily] = useState<Family | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  const loadProducts = useCallback(async () => {
    const r = await fetch('/api/staff/cove/products?mode=register')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load products')
    setProducts(
      ((d.products ?? []) as Product[]).map((p) => ({
        ...p,
        variantId: p.variantId ?? '',
        featured: Boolean(p.featured),
        dealLabel: p.dealLabel || (p.featured ? 'Deal' : undefined),
      }))
    )
  }, [])

  useEffect(() => {
    void loadProducts().catch((err) =>
      setError(err instanceof Error ? err.message : 'Product load failed')
    )
    codeRef.current?.focus()
  }, [loadProducts])

  const deals = useMemo(
    () => products.filter((p) => p.featured),
    [products]
  )
  const regular = useMemo(
    () => products.filter((p) => !p.featured),
    [products]
  )

  async function lookup(nextCode = code) {
    const trimmed = nextCode.replace(/\D/g, '').trim()
    if (trimmed.length < 4) {
      setError('Scan the phone QR / gift-card number, or enter the 6-digit backup code.')
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    setCart([])
    try {
      const r = await fetch(`/api/staff/cove/lookup?code=${encodeURIComponent(trimmed)}`)
      const d = await r.json()
      if (r.status === 409 && d.family) {
        setFamily({ ...d.family, hasCard: false, balance: 0 })
        setError(d.error)
        return
      }
      if (!r.ok) throw new Error(d.error ?? 'Lookup failed')
      setFamily(d)
      setCode(trimmed)
      setStatus(`Digital card balance: $${Number(d.balance).toFixed(2)}`)
    } catch (err) {
      setFamily(null)
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setBusy(false)
    }
  }

  function setLineQty(product: Product, qty: number) {
    if (!family?.hasCard) {
      setError('Look up the Cove Digital Card code first.')
      return
    }
    const variantId = product.variantId || ''
    const key = lineKey(product.id, variantId)
    setCart((prev) => {
      const nextQty = Math.max(0, Math.floor(qty))
      if (nextQty <= 0) return prev.filter((l) => lineKey(l.productId, l.variantId) !== key)
      const existing = prev.find((l) => lineKey(l.productId, l.variantId) === key)
      if (existing) {
        return prev.map((l) =>
          lineKey(l.productId, l.variantId) === key ? { ...l, qty: nextQty } : l
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: product.name,
          price: product.price,
          qty: nextQty,
        },
      ]
    })
    setError('')
  }

  function bump(product: Product, delta: number) {
    const variantId = product.variantId || ''
    const key = lineKey(product.id, variantId)
    const current = cart.find((l) => lineKey(l.productId, l.variantId) === key)?.qty ?? 0
    setLineQty(product, current + delta)
  }

  function qtyFor(product: Product) {
    return (
      cart.find(
        (l) => lineKey(l.productId, l.variantId) === lineKey(product.id, product.variantId || '')
      )?.qty ?? 0
    )
  }

  const cartTotal = useMemo(
    () => Math.round(cart.reduce((sum, l) => sum + l.price * l.qty, 0) * 100) / 100,
    [cart]
  )
  const balance = family?.balance ?? 0
  const remainingAfter = Math.round((balance - cartTotal) * 100) / 100

  async function checkout() {
    if (!family?.hasCard || !cart.length) return
    if (remainingAfter < 0) {
      setError(
        `Not enough balance. Digital card has $${balance.toFixed(2)}; order is $${cartTotal.toFixed(2)}.`
      )
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: family.coveFamilyCode,
          lines: cart.map((l) => ({
            productId: l.productId,
            variantId: l.variantId || undefined,
            qty: l.qty,
          })),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Checkout failed')
      setStatus(
        `Charged $${Number(d.total).toFixed(2)}. New digital card balance $${Number(d.newBalance).toFixed(2)}.`
      )
      setFamily(null)
      setCart([])
      setCode('')
      await loadProducts()
      codeRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  function clearFamily() {
    setFamily(null)
    setCart([])
    setCode('')
    setStatus('')
    setError('')
    codeRef.current?.focus()
  }

  function ProductTile({ product }: { product: Product }) {
    const qty = qtyFor(product)
    const inCart = qty > 0
    return (
      <div
        className={`rounded-2xl border overflow-hidden flex flex-col ${
          inCart ? 'border-[#085508] ring-2 ring-[#085508]/25' : 'border-[#E8E4DC]'
        } bg-white`}
      >
        <button
          type="button"
          onClick={() => bump(product, 1)}
          disabled={!family?.hasCard}
          className="text-left flex-1 disabled:opacity-50"
        >
          <div className="aspect-square bg-[#FAFCF9] relative">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#C5CFC5] text-xs font-bold">
                Cove
              </div>
            )}
            {product.featured ? (
              <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-[#FFD700] text-[#1A1A1A] px-2 py-0.5 rounded-full">
                {product.dealLabel || 'Deal'}
              </span>
            ) : null}
            {inCart ? (
              <span className="absolute top-2 right-2 min-w-7 h-7 rounded-full bg-[#085508] text-white text-sm font-bold flex items-center justify-center px-1.5">
                {qty}
              </span>
            ) : null}
          </div>
          <div className="p-2.5">
            <p className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2 min-h-[2.5rem]">
              {product.name}
            </p>
            <p className="text-sm font-bold mt-1" style={{ color: '#085508' }}>
              ${product.price.toFixed(2)}
            </p>
          </div>
        </button>
        <div className="flex items-center justify-between gap-1 px-2 pb-2">
          <button
            type="button"
            aria-label={`Fewer ${product.name}`}
            disabled={!family?.hasCard || qty <= 0}
            onClick={() => bump(product, -1)}
            className="h-9 w-9 rounded-lg border border-[#E8E4DC] flex items-center justify-center disabled:opacity-30"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tabular-nums w-6 text-center">{qty}</span>
          <button
            type="button"
            aria-label={`More ${product.name}`}
            disabled={!family?.hasCard}
            onClick={() => bump(product, 1)}
            className="h-9 w-9 rounded-lg border border-[#E8E4DC] flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: inCart ? '#EEF6EE' : undefined }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: '#085508' }} />
          Cove register
        </h2>
        <p className="mt-1 text-xs text-[#5A6070] leading-relaxed">
          Prefer Square Stand / iPad scanning the student&apos;s Photos or Wallet QR (Square gift
          card). Or type the 6-digit spoken backup / paste a long GAN here → tap products → Charge.
          Guests without a loaded Cove Digital Card pay card-present on Square Stand.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          void lookup()
        }}
      >
        <label className="flex-1 min-w-[10rem] text-xs font-bold text-[#5A6070]">
          Scan QR / GAN or 6-digit backup
          <input
            ref={codeRef}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 24))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Scan or 6-digit code"
            className="mt-1 w-full border-2 border-[#085508] rounded-lg px-3 py-3 text-xl font-mono tracking-widest"
          />
        </label>
        <Button
          type="submit"
          disabled={busy || code.length < 4}
          className="text-white py-3"
          style={{ backgroundColor: '#085508' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look up'}
        </Button>
        {family ? (
          <Button type="button" variant="outline" className="py-3" onClick={clearFamily}>
            <X className="w-4 h-4 mr-1" /> Next student
          </Button>
        ) : null}
      </form>

      {family ? (
        <div className="rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: '#EEF6EE' }}>
          <p className="text-sm font-bold text-[#1A1A1A]">
            {family.students
              .map((s) => [s.firstName, s.lastName].filter(Boolean).join(' ').trim())
              .filter(Boolean)
              .join(', ') || family.parentEmail || 'Family'}
            <span className="font-normal text-[#5A6070]"> · code {family.coveFamilyCode}</span>
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: '#085508' }}>
            Cove Digital Card: ${Number(family.balance).toFixed(2)}
          </p>
          {!family.hasCard ? (
            <p className="text-xs text-amber-800">
              No digital card loaded yet. Parent must load online in the member portal first — or sell
              this purchase on Square Stand.
            </p>
          ) : null}
        </div>
      ) : null}

      {family?.hasCard ? (
        <>
          {deals.length > 0 ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
                Weekly deals
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {deals.map((p) => (
                  <ProductTile key={`deal:${lineKey(p.id, p.variantId)}`} product={p} />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
              All products
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[28rem] overflow-y-auto pr-1">
              {regular.map((p) => (
                <ProductTile key={lineKey(p.id, p.variantId)} product={p} />
              ))}
            </div>
            {products.length === 0 ? (
              <p className="text-sm text-[#5A6070]">No Cove products in stock. Restock below.</p>
            ) : null}
          </div>

          <div className="sticky bottom-2 z-10 rounded-2xl border-2 border-[#085508] bg-white shadow-lg p-3 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="text-sm space-y-0.5">
                <p>
                  Order{' '}
                  <span className="font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                  {cart.length ? (
                    <span className="text-[#5A6070]">
                      {' '}
                      · {cart.reduce((n, l) => n + l.qty, 0)} items
                    </span>
                  ) : null}
                </p>
                <p style={{ color: remainingAfter < 0 ? '#b91c1c' : '#085508' }}>
                  Left after charge:{' '}
                  <span className="font-bold tabular-nums">
                    {remainingAfter < 0 ? 'Not enough' : `$${remainingAfter.toFixed(2)}`}
                  </span>
                </p>
              </div>
              <Button
                disabled={busy || !cart.length || remainingAfter < 0}
                onClick={() => void checkout()}
                className="text-white text-base px-8 py-6 font-bold min-w-[10rem]"
                style={{ backgroundColor: '#085508' }}
              >
                {busy ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Charge $${cartTotal.toFixed(2)}`
                )}
              </Button>
            </div>
            {cart.length > 0 ? (
              <ul className="flex flex-wrap gap-2 text-xs text-[#5A6070]">
                {cart.map((l) => (
                  <li
                    key={lineKey(l.productId, l.variantId)}
                    className="rounded-full bg-[#FAFCF9] border border-[#E8E4DC] px-2.5 py-1"
                  >
                    {l.qty}× {l.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#5A6070]">Tap a product tile to add it.</p>
            )}
          </div>
        </>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {status ? <p className="text-xs font-semibold text-green-700">{status}</p> : null}
    </section>
  )
}
