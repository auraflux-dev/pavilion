'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, ScanBarcode, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoveCameraScanner } from '@/components/staff/cove-camera-scanner'

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
}

type CartLine = {
  productId: string
  variantId: string
  name: string
  price: number
  qty: number
}

type SkuHit = { productId: string; variantId?: string }

/**
 * Cove window register — matches in-person ops:
 * 1) Student says what they want
 * 2) Student gives family code → staff enters it
 * 3) Staff scans product barcode (phone camera)
 * 4) Charge (or tell student balance / remaining if asked)
 * 5) Inventory decrements on successful charge
 */
export function StaffCoveRegister() {
  const [code, setCode] = useState('')
  const [family, setFamily] = useState<Family | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [skuIndex, setSkuIndex] = useState<Record<string, SkuHit>>({})
  const [cart, setCart] = useState<CartLine[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)
  const productsRef = useRef(products)
  const skuIndexRef = useRef(skuIndex)
  productsRef.current = products
  skuIndexRef.current = skuIndex

  const loadProducts = useCallback(async () => {
    const r = await fetch('/api/staff/cove/products?mode=register')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load products')
    setProducts(
      ((d.products ?? []) as Product[]).map((p) => ({
        ...p,
        variantId: p.variantId ?? '',
      }))
    )
    setSkuIndex((d.skuIndex ?? {}) as Record<string, SkuHit>)
  }, [])

  useEffect(() => {
    void loadProducts().catch((err) =>
      setError(err instanceof Error ? err.message : 'Product load failed')
    )
    codeRef.current?.focus()
  }, [loadProducts])

  async function lookup(nextCode = code) {
    const trimmed = nextCode.replace(/\D/g, '').trim()
    if (trimmed.length < 4) {
      setError('Enter the family code the student gives you.')
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
      setStatus(`Balance on card: $${Number(d.balance).toFixed(2)}`)
    } catch (err) {
      setFamily(null)
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setBusy(false)
    }
  }

  function lineKey(productId: string, variantId: string) {
    return `${productId}:${variantId || ''}`
  }

  function addProduct(product: Product, qty = 1) {
    if (!family?.hasCard) {
      setError('Enter the family code first.')
      return
    }
    const variantId = product.variantId || ''
    setCart((prev) => {
      const existing = prev.find(
        (l) => lineKey(l.productId, l.variantId) === lineKey(product.id, variantId)
      )
      if (existing) {
        return prev.map((l) =>
          lineKey(l.productId, l.variantId) === lineKey(product.id, variantId)
            ? { ...l, qty: l.qty + qty }
            : l
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: product.name,
          price: product.price,
          qty,
        },
      ]
    })
    setError('')
    setStatus(`Added ${product.name}`)
  }

  function resolveProduct(raw: string): Product | null {
    const key = raw.trim()
    const upper = key.toUpperCase()
    const fromIndex = skuIndexRef.current[upper]
    return (
      productsRef.current.find((p) => p.sku.toUpperCase() === upper) ||
      (fromIndex
        ? productsRef.current.find(
            (p) =>
              p.id === fromIndex.productId &&
              (!fromIndex.variantId || p.variantId === fromIndex.variantId)
          )
        : null) ||
      productsRef.current.find((p) => p.id === key) ||
      null
    )
  }

  function onProductScan(raw: string) {
    // Ignore family-code shaped payloads if staff accidentally re-scans a QR
    const cleaned = raw.trim()
    if (/^(?:SHMSCOVE:|shmscove\/|cove:)/i.test(cleaned) || /^\d{4,6}$/.test(cleaned)) {
      void lookup(cleaned.replace(/\D/g, ''))
      return
    }
    const product = resolveProduct(cleaned)
    if (!product) {
      setError(`No product for barcode “${cleaned}”. Check CoveInventory.sku.`)
      return
    }
    addProduct(product)
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
        `Not enough balance. Card has $${balance.toFixed(2)}; order is $${cartTotal.toFixed(2)}.`
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
        `Charged $${Number(d.total).toFixed(2)}. New balance $${Number(d.newBalance).toFixed(2)}. Inventory updated.`
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

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: '#085508' }} />
          Cove register
        </h2>
        <ol className="mt-2 text-xs text-[#5A6070] list-decimal list-inside space-y-0.5">
          <li>Student says what they want</li>
          <li>Student gives unique family code → staff enters it</li>
          <li>Staff scans product barcode with phone</li>
          <li>Tell balance / remaining if asked → Charge → hand items from behind the door</li>
        </ol>
      </div>

      <form
        className="flex flex-wrap gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault()
          void lookup()
        }}
      >
        <label className="flex-1 min-w-[10rem] text-xs font-bold text-[#5A6070]">
          Family code (from student)
          <input
            ref={codeRef}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Enter code"
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
        <div
          className="rounded-xl px-4 py-3 space-y-1"
          style={{ backgroundColor: '#EEF6EE' }}
        >
          <p className="text-sm font-bold text-[#1A1A1A]">
            {family.students.map((s) => s.firstName).filter(Boolean).join(', ') || 'Family'}
            <span className="font-normal text-[#5A6070]"> · code {family.coveFamilyCode}</span>
          </p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: '#085508' }}>
            Balance: ${Number(family.balance).toFixed(2)}
          </p>
          {!family.hasCard ? (
            <p className="text-xs text-amber-800">No card loaded yet — parent must load online first.</p>
          ) : null}
        </div>
      ) : null}

      {family?.hasCard ? (
        <>
          <div>
            <p className="text-xs font-bold text-[#5A6070] mb-2 flex items-center gap-1">
              <ScanBarcode className="w-3.5 h-3.5" /> Scan product barcode (phone)
            </p>
            <CoveCameraScanner onScan={onProductScan} label="Open camera to scan product" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
              Or tap product
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={`${p.id}:${p.variantId || ''}`}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="text-left rounded-xl border border-[#E8E4DC] px-3 py-2.5 hover:border-[#085508] hover:bg-[#FAFCF9]"
                >
                  <p className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2">
                    {p.name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#085508' }}>
                    ${p.price.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E8E4DC] p-3 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">This order</p>
            {cart.length === 0 ? (
              <p className="text-sm text-[#5A6070]">Scan or tap what they asked for.</p>
            ) : (
              <ul className="space-y-1.5">
                {cart.map((l) => (
                  <li
                    key={lineKey(l.productId, l.variantId)}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {l.qty}× {l.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold tabular-nums">
                        ${(l.price * l.qty).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 font-semibold"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter(
                              (x) =>
                                lineKey(x.productId, x.variantId) !==
                                lineKey(l.productId, l.variantId)
                            )
                          )
                        }
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="rounded-lg bg-[#FAFCF9] border border-[#E8E4DC] px-3 py-2 text-sm space-y-0.5">
              <p>
                Order total:{' '}
                <span className="font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
              </p>
              <p>
                On card now:{' '}
                <span className="font-bold tabular-nums">${balance.toFixed(2)}</span>
              </p>
              <p style={{ color: remainingAfter < 0 ? '#b91c1c' : '#085508' }}>
                Left after this purchase:{' '}
                <span className="font-bold tabular-nums">
                  {remainingAfter < 0 ? 'Not enough' : `$${remainingAfter.toFixed(2)}`}
                </span>
              </p>
              <p className="text-[11px] text-[#5A6070]">
                Tell the student these numbers if they ask before you charge.
              </p>
            </div>

            <Button
              disabled={busy || !cart.length || remainingAfter < 0}
              onClick={() => void checkout()}
              className="w-full text-white text-base py-6 font-bold"
              style={{ backgroundColor: '#085508' }}
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                `Charge $${cartTotal.toFixed(2)}`
              )}
            </Button>
          </div>
        </>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {status ? <p className="text-xs font-semibold text-green-700">{status}</p> : null}
    </section>
  )
}
