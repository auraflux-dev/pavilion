'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Minus, Plus, ShoppingCart, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoveCameraScanner, parseCoveScan } from '@/components/staff/cove-camera-scanner'

type Family = {
  parentEmail: string
  coveFamilyCode: string
  balance: number
  hasCard: boolean
  gan?: string
  paidMember?: boolean
  membershipTier?: string
  paidMemberCode?: boolean
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
  optionName?: string
  variants?: Array<{
    id: string
    label: string
    price: number
    sku: string
    quantity: number | null
    available: boolean
  }>
}

type CartLine = {
  productId: string
  variantId: string
  name: string
  price: number
  qty: number
}

type SessionMode = 'idle' | 'member' | 'guest'

function lineKey(productId: string, variantId: string) {
  return `${productId}:${variantId || ''}`
}

function normalizeLookupInput(raw: string): string {
  const parsed = parseCoveScan(raw)
  if (parsed?.kind === 'family') return parsed.code
  const trimmed = raw.trim()
  if (/^(?:SHMSCOVE:|shmscove\/|cove:)/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length >= 4) return digits
  }
  const hasLetters = /[a-z]/i.test(trimmed)
  if (hasLetters) return trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')
  return trimmed.replace(/\D/g, '')
}

/**
 * In-person sales (window + event tables).
 * Member QR/passcode OR Guest → tap products (snacks + spirit) → Cove card / Square card / cash.
 */
export function StaffCoveRegister() {
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<SessionMode>('idle')
  const [family, setFamily] = useState<Family | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [sendJoinInvite, setSendJoinInvite] = useState(true)
  const [payTab, setPayTab] = useState<'cove' | 'stand' | 'cash'>('cove')
  const [variantPicker, setVariantPicker] = useState<Product | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  const [productQuery, setProductQuery] = useState('')
  const [letterFilter, setLetterFilter] = useState<string>('All')
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Snacks' | 'Spirit'>('All')
  const productSearchRef = useRef<HTMLInputElement>(null)

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
        optionName: p.optionName,
        variants: p.variants,
      })),
    )
  }, [])

  useEffect(() => {
    void loadProducts().catch((err) =>
      setError(err instanceof Error ? err.message : 'Product load failed'),
    )
    codeRef.current?.focus()
  }, [loadProducts])

  const deals = useMemo(() => products.filter((p) => p.featured), [products])
  const regular = useMemo(() => products.filter((p) => !p.featured), [products])

  const lettersWithStock = useMemo(() => {
    const set = new Set<string>()
    for (const p of regular) {
      const ch = p.name.trim().charAt(0).toUpperCase()
      if (/[A-Z]/.test(ch)) set.add(ch)
    }
    return [...set].sort()
  }, [regular])

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    return regular.filter((p) => {
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      if (letterFilter !== 'All') {
        const ch = p.name.trim().charAt(0).toUpperCase()
        if (ch !== letterFilter) return false
      }
      return true
    })
  }, [regular, productQuery, letterFilter, categoryFilter])

  const categoryCounts = useMemo(() => {
    const snacks = regular.filter((p) => p.category === 'Snacks').length
    const spirit = regular.filter((p) => p.category === 'Spirit').length
    return { snacks, spirit }
  }, [regular])

  const filteredDeals = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return deals
    return deals.filter((p) => p.name.toLowerCase().includes(q))
  }, [deals, productQuery])

  const selling = mode === 'guest' || mode === 'member'
  const canUseCove =
    mode === 'member' && Boolean(family?.hasCard) && Number(family?.balance ?? 0) > 0

  useEffect(() => {
    if (!selling) return
    if (canUseCove) setPayTab('cove')
    else setPayTab('stand')
  }, [selling, canUseCove, family?.coveFamilyCode, mode])

  async function lookup(nextCode = code) {
    const trimmed = normalizeLookupInput(nextCode)
    const hasLetters = /[a-z]/i.test(trimmed)
    if (!hasLetters && trimmed.length < 4) {
      setError('Scan family QR, or type passcode / 6-digit.')
      return
    }
    if (hasLetters && trimmed.length < 6) {
      setError('Word passcode must be at least 6 letters or numbers.')
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
        setMode('member')
        setCode(trimmed)
        setStatus('Member found — no Cove card loaded. Take card or cash below.')
        setError('')
        return
      }
      if (!r.ok) throw new Error(d.error ?? 'Lookup failed')
      setFamily(d)
      setMode('member')
      setCode(trimmed)
      setStatus(
        d.hasCard
          ? `Cove balance $${Number(d.balance).toFixed(2)} — or take card / cash`
          : 'Member found — take card or cash (no Cove balance)',
      )
    } catch (err) {
      setFamily(null)
      setMode('idle')
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setBusy(false)
    }
  }

  function startGuest() {
    setMode('guest')
    setFamily(null)
    setCode('')
    setCart([])
    setError('')
    setStatus('Guest sale — inventory tracked. Optional email/phone for free join invite.')
    setPayTab('stand')
  }

  function onCameraScan(value: string) {
    const parsed = parseCoveScan(value)
    if (parsed?.kind === 'product') {
      setError('Scan the family’s Cove QR, not a product barcode.')
      return
    }
    const next = parsed?.kind === 'family' ? parsed.code : normalizeLookupInput(value)
    setCode(next)
    void lookup(next)
  }

  function setLineQty(product: Product, qty: number) {
    if (!selling) {
      setError('Look up a family or tap Guest first.')
      return
    }
    const variantId = product.variantId || ''
    const key = lineKey(product.id, variantId)
    const displayName =
      product.variants && product.variants.length > 1 && variantId
        ? `${product.name} · ${product.variants.find((v) => v.id === variantId)?.label || ''}`.trim()
        : product.name
    setCart((prev) => {
      const nextQty = Math.max(0, Math.floor(qty))
      if (nextQty <= 0) return prev.filter((l) => lineKey(l.productId, l.variantId) !== key)
      const existing = prev.find((l) => lineKey(l.productId, l.variantId) === key)
      if (existing) {
        return prev.map((l) =>
          lineKey(l.productId, l.variantId) === key ? { ...l, qty: nextQty } : l,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          name: displayName,
          price: product.price,
          qty: nextQty,
        },
      ]
    })
    setError('')
  }

  function requestAdd(product: Product) {
    if (!selling) {
      setError('Look up a family or tap Guest first.')
      return
    }
    if (product.variants && product.variants.length > 1) {
      setVariantPicker(product)
      return
    }
    bump(product, 1)
  }

  function addVariant(product: Product, variantId: string) {
    const v = product.variants?.find((x) => x.id === variantId)
    if (!v?.available && v?.quantity === 0) {
      setError('That option is out of stock.')
      return
    }
    setLineQty(
      {
        ...product,
        variantId: v?.id || variantId,
        price: v?.price ?? product.price,
        sku: v?.sku || product.sku,
      },
      (cart.find((l) => lineKey(l.productId, l.variantId) === lineKey(product.id, variantId))
        ?.qty ?? 0) + 1,
    )
    setVariantPicker(null)
  }

  function bump(product: Product, delta: number) {
    if (delta > 0 && product.variants && product.variants.length > 1) {
      setVariantPicker(product)
      return
    }
    if (delta < 0 && product.variants && product.variants.length > 1) {
      const line = [...cart].reverse().find((l) => l.productId === product.id)
      if (!line) return
      setLineQty(
        { ...product, variantId: line.variantId, price: line.price, name: line.name },
        line.qty - 1,
      )
      return
    }
    const variantId = product.variantId || ''
    const key = lineKey(product.id, variantId)
    const current = cart.find((l) => lineKey(l.productId, l.variantId) === key)?.qty ?? 0
    setLineQty(product, current + delta)
  }

  /** Total qty across all variants of a product (spirit tile badge). */
  function qtyForProduct(product: Product) {
    return cart
      .filter((l) => l.productId === product.id)
      .reduce((n, l) => n + l.qty, 0)
  }

  function qtyFor(product: Product) {
    if (product.variants && product.variants.length > 1) {
      return qtyForProduct(product)
    }
    return (
      cart.find(
        (l) => lineKey(l.productId, l.variantId) === lineKey(product.id, product.variantId || ''),
      )?.qty ?? 0
    )
  }

  const cartTotal = useMemo(
    () => Math.round(cart.reduce((sum, l) => sum + l.price * l.qty, 0) * 100) / 100,
    [cart],
  )
  const balance = family?.balance ?? 0
  const remainingAfter = Math.round((balance - cartTotal) * 100) / 100

  function cartPayload() {
    return cart.map((l) => ({
      productId: l.productId,
      variantId: l.variantId || undefined,
      qty: l.qty,
    }))
  }

  async function chargeCove() {
    if (!family?.hasCard || !cart.length) return
    if (remainingAfter < 0) {
      setError(
        `Not enough Cove balance ($${balance.toFixed(2)}). Use card or cash, or remove items.`,
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
          lines: cartPayload(),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Checkout failed')
      setStatus(
        `Cove card charged $${Number(d.total).toFixed(2)}. New balance $${Number(d.newBalance).toFixed(2)}.`,
      )
      resetSale()
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  async function chargeTender(tender: 'cash' | 'stand') {
    if (!cart.length) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender,
          code: mode === 'member' ? family?.coveFamilyCode || code : undefined,
          lines: cartPayload(),
          guestEmail: guestEmail || undefined,
          guestPhone: guestPhone || undefined,
          guestName: guestName || undefined,
          sendJoinInvite: mode === 'guest' && sendJoinInvite && Boolean(guestEmail.trim()),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Sale failed')
      const inviteNote = d.invite?.emailed
        ? ' Join invite emailed.'
        : d.invite?.smsText
          ? ` Text join: ${d.invite.smsText}`
          : d.invite?.error
            ? ` Invite: ${d.invite.error}`
            : ''
      const label = tender === 'stand' ? 'Stand / card' : 'Cash'
      setStatus(`${label} $${Number(d.total).toFixed(2)} — inventory updated.${inviteNote}`)
      resetSale()
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sale failed')
    } finally {
      setBusy(false)
    }
  }

  function resetSale() {
    setFamily(null)
    setMode('idle')
    setCart([])
    setCode('')
    setGuestEmail('')
    setGuestPhone('')
    setGuestName('')
    setProductQuery('')
    setLetterFilter('All')
    setCategoryFilter('All')
    codeRef.current?.focus()
  }

  function clearSession() {
    resetSale()
    setStatus('')
    setError('')
  }

  function ProductTile({
    product,
    compact = false,
  }: {
    product: Product
    compact?: boolean
  }) {
    const qty = qtyFor(product)
    const inCart = qty > 0
    return (
      <div
        className={`rounded-2xl border overflow-hidden flex flex-col ${
          inCart ? 'border-[#085508] ring-2 ring-[#085508]/25' : 'border-[#E8E4DC]'
        } bg-white ${compact ? 'min-w-[9.5rem] w-[9.5rem] shrink-0' : ''}`}
      >
        <button
          type="button"
          onClick={() => requestAdd(product)}
          disabled={!selling}
          className="text-left flex-1 disabled:opacity-50"
        >
          <div className={`${compact ? 'aspect-[4/3]' : 'aspect-square'} bg-[#FAFCF9] relative`}>
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
          <div className={compact ? 'p-2' : 'p-2.5'}>
            <p
              className={`font-bold text-[#1A1A1A] leading-snug line-clamp-2 ${
                compact ? 'text-xs min-h-[2rem]' : 'text-sm min-h-[2.5rem]'
              }`}
            >
              {product.name}
            </p>
            <p className="text-sm font-bold mt-1" style={{ color: '#085508' }}>
              ${product.price.toFixed(2)}
              {product.variants && product.variants.length > 1 ? (
                <span className="ml-1 text-[11px] font-semibold text-[#5A6070]">
                  · pick {product.optionName?.toLowerCase() || 'option'}
                </span>
              ) : null}
            </p>
          </div>
        </button>
        <div className="flex items-center justify-between gap-1 px-2 pb-2">
          <button
            type="button"
            aria-label={`Fewer ${product.name}`}
            disabled={!selling || qty <= 0}
            onClick={() => bump(product, -1)}
            className="h-9 w-9 rounded-lg border border-[#E8E4DC] flex items-center justify-center disabled:opacity-30"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tabular-nums w-6 text-center">{qty}</span>
          <button
            type="button"
            aria-label={`More ${product.name}`}
            disabled={!selling}
            onClick={() => requestAdd(product)}
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
    <section
      id="cove-register"
      className="scroll-mt-28 rounded-xl border-2 border-[#085508] bg-white p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: '#085508' }} />
          In-person sales
        </h2>
        <Button
          type="button"
          variant={mode === 'guest' ? 'default' : 'outline'}
          onClick={startGuest}
          className={mode === 'guest' ? 'text-white' : ''}
          style={mode === 'guest' ? { backgroundColor: '#0B3D0B' } : undefined}
        >
          <UserRound className="w-4 h-4 mr-1.5" />
          Guest
        </Button>
      </div>

      {mode !== 'guest' ? (
        <>
          <CoveCameraScanner onScan={onCameraScan} label="Scan family QR" />
          <form
            className="flex flex-wrap gap-2 items-end"
            onSubmit={(e) => {
              e.preventDefault()
              void lookup()
            }}
          >
            <label className="flex-1 min-w-[10rem] text-xs font-bold text-[#5A6070]">
              Passcode or 6-digit code
              <input
                ref={codeRef}
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 64))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void lookup()
                  }
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Passcode or 6-digit"
                className="mt-1 w-full border-2 border-[#085508] rounded-lg px-3 py-3 text-xl font-mono tracking-widest"
              />
            </label>
            <Button
              type="submit"
              disabled={busy || code.trim().length < 4}
              className="text-white py-3"
              style={{ backgroundColor: '#085508' }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look up'}
            </Button>
            {selling ? (
              <Button type="button" variant="outline" className="py-3" onClick={clearSession}>
                <X className="w-4 h-4 mr-1" /> Next
              </Button>
            ) : null}
          </form>
        </>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <p className="text-sm font-bold text-[#0B3D0B]">Guest checkout</p>
          <Button type="button" variant="outline" size="sm" onClick={clearSession}>
            <X className="w-4 h-4 mr-1" /> Cancel guest
          </Button>
        </div>
      )}

      {mode === 'member' && family ? (
        <div className="rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: '#EEF6EE' }}>
          <p className="text-sm font-bold text-[#1A1A1A]">
            {family.students
              .map((s) => [s.firstName, s.lastName].filter(Boolean).join(' ').trim())
              .filter(Boolean)
              .join(', ') ||
              family.parentEmail ||
              'Family'}
            <span className="font-normal text-[#5A6070]"> · code {family.coveFamilyCode}</span>
          </p>
          {family.hasCard ? (
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#085508' }}>
              Cove Digital Card: ${Number(family.balance).toFixed(2)}
            </p>
          ) : (
            <p className="text-sm font-bold text-amber-900">
              No Cove card on file — use card or cash (still tracks inventory).
            </p>
          )}
        </div>
      ) : null}

      {mode === 'guest' ? (
        <div className="grid gap-2 sm:grid-cols-3 rounded-xl border border-[#E8E4DC] p-3 bg-[#FAFCF9]">
          <label className="text-xs font-bold text-[#5A6070]">
            Name (optional)
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-bold text-[#5A6070]">
            Email (for free join)
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-2 py-2 text-sm"
              placeholder="parent@email.com"
            />
          </label>
          <label className="text-xs font-bold text-[#5A6070]">
            Phone (SMS copy)
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8E4DC] px-2 py-2 text-sm"
              placeholder="optional"
            />
          </label>
          <label className="sm:col-span-3 flex items-center gap-2 text-xs text-[#5A6070]">
            <input
              type="checkbox"
              checked={sendJoinInvite}
              onChange={(e) => setSendJoinInvite(e.target.checked)}
            />
            Email free join link after this sale (Open House / Friday follow-up)
          </label>
        </div>
      ) : null}

      {selling ? (
        <>
          <div className="sticky top-0 z-[5] -mx-1 px-1 py-2 bg-white/95 backdrop-blur-sm space-y-2 border-b border-[#E8E4DC]">
            <label className="block text-xs font-bold text-[#5A6070]">
              Find product
              <input
                ref={productSearchRef}
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value)
                  if (e.target.value.trim()) setLetterFilter('All')
                }}
                placeholder="Snacks, spirit, Takis, hoodie…"
                className="mt-1 w-full rounded-xl border-2 border-[#085508] px-3 py-3 text-base font-semibold text-[#1A1A1A]"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'All' as const, label: 'All' },
                  {
                    id: 'Snacks' as const,
                    label: `Snacks${categoryCounts.snacks ? ` (${categoryCounts.snacks})` : ''}`,
                  },
                  {
                    id: 'Spirit' as const,
                    label: `Spirit${categoryCounts.spirit ? ` (${categoryCounts.spirit})` : ''}`,
                  },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryFilter(c.id)}
                  className={`h-9 rounded-lg text-xs font-bold border px-3 ${
                    categoryFilter === c.id
                      ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                      : 'border-[#E8E4DC] text-[#5A6070]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setLetterFilter('All')}
                className={`min-w-9 h-9 rounded-lg text-xs font-bold border px-2 ${
                  letterFilter === 'All'
                    ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                    : 'border-[#E8E4DC] text-[#5A6070]'
                }`}
              >
                A–Z
              </button>
              {lettersWithStock.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => {
                    setLetterFilter(letter)
                    setProductQuery('')
                  }}
                  className={`min-w-9 h-9 rounded-lg text-xs font-bold border ${
                    letterFilter === letter
                      ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                      : 'border-[#E8E4DC] text-[#5A6070]'
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {filteredDeals.length > 0 && !productQuery.trim() && letterFilter === 'All' ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
                Weekly deals
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {filteredDeals.map((p) => (
                  <ProductTile
                    key={`deal:${lineKey(p.id, p.variantId)}`}
                    product={p}
                    compact
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
              {productQuery.trim() || letterFilter !== 'All'
                ? `${filteredProducts.length} match${filteredProducts.length === 1 ? '' : 'es'}`
                : 'Tap a product'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[32rem] overflow-y-auto pr-1">
              {filteredProducts.map((p) => (
                <ProductTile key={lineKey(p.id, p.variantId)} product={p} />
              ))}
              {productQuery.trim()
                ? filteredDeals.map((p) => (
                    <ProductTile key={`deal-q:${lineKey(p.id, p.variantId)}`} product={p} />
                  ))
                : null}
            </div>
            {filteredProducts.length === 0 &&
            !(productQuery.trim() && filteredDeals.length > 0) ? (
              <p className="text-sm text-[#5A6070] mt-2">
                No products match. Clear search or pick another letter.
              </p>
            ) : null}
            {products.length === 0 ? (
              <p className="text-sm text-[#5A6070]">
                No products.{' '}
                <a
                  href="#cove-stock-admin"
                  className="font-bold underline"
                  style={{ color: '#085508' }}
                >
                  Stock setup
                </a>
              </p>
            ) : null}
          </div>

          <div className="sticky bottom-2 z-10 rounded-2xl border-2 border-[#085508] bg-white shadow-lg p-3 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="text-sm">
                <p>
                  Order <span className="font-bold tabular-nums">${cartTotal.toFixed(2)}</span>
                  {cart.length ? (
                    <span className="text-[#5A6070]">
                      {' '}
                      · {cart.reduce((n, l) => n + l.qty, 0)} items
                    </span>
                  ) : null}
                </p>
                {canUseCove ? (
                  <p className="text-xs" style={{ color: remainingAfter < 0 ? '#b91c1c' : '#085508' }}>
                    Cove left after charge:{' '}
                    {remainingAfter < 0 ? 'Not enough' : `$${remainingAfter.toFixed(2)}`}
                  </p>
                ) : null}
              </div>
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-[#5A6070]">Tap a product tile to add it.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {canUseCove ? (
                    <button
                      type="button"
                      onClick={() => setPayTab('cove')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                        payTab === 'cove'
                          ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                          : 'border-[#E8E4DC] text-[#5A6070]'
                      }`}
                    >
                      Cove card
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPayTab('stand')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                      payTab === 'stand'
                        ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                        : 'border-[#E8E4DC] text-[#5A6070]'
                    }`}
                  >
                    Square Stand
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayTab('cash')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                      payTab === 'cash'
                        ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                        : 'border-[#E8E4DC] text-[#5A6070]'
                    }`}
                  >
                    Cash
                  </button>
                </div>

                {payTab === 'cove' && canUseCove ? (
                  <Button
                    disabled={busy || remainingAfter < 0}
                    onClick={() => void chargeCove()}
                    className="text-white text-base px-8 py-6 font-bold w-full sm:w-auto"
                    style={{ backgroundColor: '#085508' }}
                  >
                    {busy ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      `Charge Cove $${cartTotal.toFixed(2)}`
                    )}
                  </Button>
                ) : null}

                {payTab === 'stand' ? (
                  <div className="space-y-2 rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] p-3">
                    <p className="text-xs text-[#5A6070] leading-relaxed">
                      <strong>Preferred:</strong> ring this sale on the <strong>iPad Square Stand</strong>{' '}
                      (or phone Square app). Payment lands in Square; Staff picks it up via webhook
                      (Payments + inventory by SKU).
                    </p>
                    <p className="text-[11px] text-[#5A6070] leading-relaxed">
                      Backup if you already took card on Stand and need this cart recorded here:
                    </p>
                    <Button
                      disabled={busy || !cart.length}
                      onClick={() => void chargeTender('stand')}
                      className="text-white text-base px-8 py-6 font-bold w-full sm:w-auto"
                      style={{ backgroundColor: '#085508' }}
                    >
                      {busy ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        `Mark paid on Stand · $${cartTotal.toFixed(2)}`
                      )}
                    </Button>
                  </div>
                ) : null}

                {payTab === 'cash' ? (
                  <Button
                    disabled={busy}
                    onClick={() => void chargeTender('cash')}
                    className="text-white text-base px-8 py-6 font-bold w-full sm:w-auto"
                    style={{ backgroundColor: '#0B3D0B' }}
                  >
                    {busy ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      `Record cash $${cartTotal.toFixed(2)}`
                    )}
                  </Button>
                ) : null}

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
              </>
            )}
          </div>
        </>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {status ? <p className="text-xs font-semibold text-green-700">{status}</p> : null}

      {variantPicker ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Choose ${variantPicker.optionName || 'option'}`}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{variantPicker.name}</p>
                <p className="text-xs text-[#5A6070]">
                  Choose {variantPicker.optionName?.toLowerCase() || 'an option'}
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-bold underline text-[#5A6070]"
                onClick={() => setVariantPicker(null)}
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
              {(variantPicker.variants ?? []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={!v.available}
                  onClick={() => addVariant(variantPicker, v.id)}
                  className="rounded-xl border border-[#E8E4DC] px-3 py-3 text-left disabled:opacity-40 hover:border-[#085508]"
                >
                  <p className="text-sm font-bold text-[#1A1A1A]">{v.label}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: '#085508' }}>
                    ${v.price.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
