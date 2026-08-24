'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CoveCameraScanner, parseCoveScan } from '@/components/staff/cove-camera-scanner'
import { trackPurchase } from '@/lib/ga'

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
 * How paying? → Stand (cash+card+Cove gift card) / Cove backup / External logger.
 */
export function StaffCoveRegister() {
  type VenueMode = 'event' | 'window'
  type PayLane = 'stand' | 'cove' | 'external' | 'pickup'
  type ExternalTender = 'zelle' | 'paypal' | 'phone_square' | 'other'

  const [venueMode, setVenueMode] = useState<VenueMode>(() => {
    if (typeof window === 'undefined') return 'event'
    return window.localStorage.getItem('cove-venue-mode') === 'window' ? 'window' : 'event'
  })
  const [payLane, setPayLane] = useState<PayLane | null>(null)
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
  const [externalTender, setExternalTender] = useState<ExternalTender>('zelle')
  const [externalAmount, setExternalAmount] = useState('')
  const [externalNote, setExternalNote] = useState('')
  const [variantPicker, setVariantPicker] = useState<Product | null>(null)
  const [demandDraft, setDemandDraft] = useState<{
    product: Product
    variant: NonNullable<Product['variants']>[number]
  } | null>(null)
  const [demandParentName, setDemandParentName] = useState('')
  const [demandParentEmail, setDemandParentEmail] = useState('')
  const [demandParentPhone, setDemandParentPhone] = useState('')
  const [demandQty, setDemandQty] = useState('1')
  const [demandEventNote, setDemandEventNote] = useState('')
  const [demandNotes, setDemandNotes] = useState('')
  /** Opt-in when Cove balance is short: apply available Cove, then Stand for the rest. */
  const [allowPartialCove, setAllowPartialCove] = useState(false)
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
  }, [loadProducts])

  useEffect(() => {
    try {
      window.localStorage.setItem('cove-venue-mode', venueMode)
    } catch {
      /* ignore */
    }
  }, [venueMode])

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
  const needsCart = payLane === 'cove'
  const canUseCove =
    payLane === 'cove' &&
    mode === 'member' &&
    Boolean(family?.hasCard) &&
    Number(family?.balance ?? 0) > 0

  function chooseLane(lane: PayLane) {
    setPayLane(lane)
    setError('')
    setStatus('')
    setCart([])
    if (lane === 'stand') {
      setMode('idle')
      setFamily(null)
      setStatus('Stand: Cash/Card, Gift card (Photos QR), or search Customer → Card on File (PIN/passcode). Staff Charge Cove is backup only.')
      return
    }
    if (lane === 'pickup') {
      setMode('idle')
      setFamily(null)
      setStatus('Paid in portal/site. Pickup only. Do not use Stand or Charge Cove.')
      return
    }
    if (lane === 'cove') {
      setMode('idle')
      setFamily(null)
      setStatus('Backup only: when Stand Card on File fails or customer has no Cove gift card loaded yet.')
      setTimeout(() => codeRef.current?.focus(), 50)
      return
    }
    if (lane === 'external') {
      setMode('guest')
      setFamily(null)
      setStatus('External pay: amount + method. Optional email for join.')
    }
  }

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
        setStatus('Member found. No Cove card. Use Square Stand (cash or card).')
        setError('')
        return
      }
      if (!r.ok) throw new Error(d.error ?? 'Lookup failed')
      setFamily(d)
      setMode('member')
      setCode(trimmed)
      const refreshmentsPerk = Boolean(d.paidMember)
      setStatus(
        refreshmentsPerk
          ? 'Lagoon/Tide perk (code ends in 9): refreshments free · no charge'
          : d.hasCard
            ? `Cove balance $${Number(d.balance).toFixed(2)}`
            : 'Member found. No Cove balance (use Square Stand)',
      )
    } catch (err) {
      setFamily(null)
      setMode('idle')
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setBusy(false)
    }
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
      setError('Look up a family first.')
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
      setError('Look up a family first.')
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
    if (!v) {
      setError('That option was not found.')
      return
    }
    if (!v.available) {
      openDemandForVariant(product, v)
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
    const short = remainingAfter < 0
    if (short && !allowPartialCove) {
      setError(
        'Cove balance is short. Check “Apply available Cove, then collect the rest on Square Stand” to continue, or remove items.',
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
          allowPartial: short && allowPartialCove,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Checkout failed')
      const remainder = Number(d.remainderDue ?? 0)
      trackPurchase({
        transactionId: `cove-balance-${Date.now()}`,
        value: Number(d.coveCharged ?? d.total),
        items: [
          {
            item_name: 'Cove snack window',
            item_category: 'cove',
            price: Number(d.coveCharged ?? d.total),
            quantity: 1,
          },
        ],
        surface: 'staff',
        paymentType: remainder > 0 ? 'cove_then_stand' : 'cove_balance',
      })
      setStatus(
        remainder > 0
          ? `Cove charged $${Number(d.coveCharged).toFixed(2)}. Collect $${remainder.toFixed(2)} on Square Stand as a custom amount. Do not re-ring these items.`
          : `Cove charged $${Number(d.total).toFixed(2)}. New balance $${Number(d.newBalance).toFixed(2)}.`,
      )
      resetSale()
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(false)
    }
  }

  async function logExternal() {
    const amount = Math.round(Number(externalAmount) * 100) / 100
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender: externalTender,
          amount,
          lines: cart.length ? cartPayload() : undefined,
          note: externalNote || undefined,
          guestEmail: guestEmail || undefined,
          guestPhone: guestPhone || undefined,
          guestName: guestName || undefined,
          sendJoinInvite: sendJoinInvite && Boolean(guestEmail.trim()),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not log payment')
      trackPurchase({
        transactionId: String(d.paymentId || `cove-ext-${Date.now()}`),
        value: Number(d.total),
        items: [
          {
            item_name: 'Cove in-person sale',
            item_category: 'cove',
            price: Number(d.total),
            quantity: 1,
          },
        ],
        surface: 'staff',
        paymentType: String(d.tender || 'external'),
      })
      const inviteNote = d.invite?.emailed
        ? ' Join invite emailed.'
        : d.invite?.error
          ? ` Invite: ${d.invite.error}`
          : ''
      setStatus(
        `Logged ${externalTender.replace('_', ' ')} $${Number(d.total).toFixed(2)}.${inviteNote}`,
      )
      setExternalAmount('')
      setExternalNote('')
      resetSale()
      await loadProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log payment')
    } finally {
      setBusy(false)
    }
  }

  function openDemandForVariant(
    product: Product,
    variant: NonNullable<Product['variants']>[number],
  ) {
    const familyName =
      family?.students
        ?.map((s) => [s.firstName, s.lastName].filter(Boolean).join(' '))
        .filter(Boolean)
        .join(', ') || ''
    setDemandParentName(guestName || familyName || '')
    setDemandParentEmail(guestEmail || family?.parentEmail || '')
    setDemandParentPhone(guestPhone || '')
    setDemandQty('1')
    setDemandNotes('')
    setDemandDraft({ product, variant })
    setVariantPicker(null)
    setError('')
  }

  async function submitDemand() {
    if (!demandDraft) return
    const parentName = demandParentName.trim()
    if (!parentName) {
      setError('Parent name is required to log size demand.')
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName,
          parentEmail: demandParentEmail.trim(),
          parentPhone: demandParentPhone.trim(),
          coveFamilyCode: family?.coveFamilyCode || '',
          productId: demandDraft.product.id,
          productName: demandDraft.product.name,
          variantId: demandDraft.variant.id,
          sizeLabel: demandDraft.variant.label,
          sku: demandDraft.variant.sku || '',
          qty: Number(demandQty) || 1,
          eventNote: demandEventNote.trim(),
          notes: demandNotes.trim(),
          source: 'register',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not log demand')
      setStatus(
        `Logged demand: ${demandDraft.product.name} · ${demandDraft.variant.label}`,
      )
      setDemandDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log demand')
    } finally {
      setBusy(false)
    }
  }

  function resetSale() {
    setFamily(null)
    setMode(payLane === 'external' ? 'guest' : 'idle')
    setCart([])
    setCode('')
    setGuestEmail('')
    setGuestPhone('')
    setGuestName('')
    setProductQuery('')
    setLetterFilter('All')
    setCategoryFilter('All')
    setAllowPartialCove(false)
    if (payLane === 'cove') codeRef.current?.focus()
  }

  function clearSession() {
    setPayLane(null)
    setFamily(null)
    setMode('idle')
    setCart([])
    setCode('')
    setGuestEmail('')
    setGuestPhone('')
    setGuestName('')
    setExternalAmount('')
    setExternalNote('')
    setProductQuery('')
    setLetterFilter('All')
    setCategoryFilter('All')
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
    const out =
      product.available === false ||
      (product.quantity != null && product.quantity <= 0 && !(product.variants?.length))
    return (
      <div
        className={`rounded-xl border-2 overflow-hidden flex flex-col ${
          inCart ? 'border-[var(--brand-green)] bg-[var(--brand-soft)]' : 'border-[var(--border)] bg-white'
        } ${out ? 'opacity-50' : ''} ${compact ? 'min-w-[8.5rem] w-[8.5rem]' : ''}`}
      >
        <button
          type="button"
          disabled={out || !selling}
          onClick={() => requestAdd(product)}
          className="text-left flex-1 disabled:cursor-not-allowed"
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt=""
              className={`w-full object-cover ${compact ? 'h-16' : 'h-24'}`}
            />
          ) : (
            <div
              className={`w-full ${compact ? 'h-16' : 'h-24'} bg-[#F5F7F4] flex items-center justify-center text-[#5A6070] text-xs`}
            >
              {product.category}
            </div>
          )}
          <div className="px-2 pt-2 pb-1">
            {product.dealLabel ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {product.dealLabel}
              </p>
            ) : null}
            <p className={`font-bold text-[#1A1A1A] leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
              {product.name}
            </p>
            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-green)' }}>
              ${product.price.toFixed(2)}
              {qty > 0 ? (
                <span className="ml-1 text-[#5A6070] font-semibold">· {qty}</span>
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
            className="h-9 w-9 rounded-lg border border-[var(--border)] flex items-center justify-center disabled:opacity-30"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold tabular-nums w-6 text-center">{qty}</span>
          <button
            type="button"
            aria-label={`More ${product.name}`}
            disabled={!selling}
            onClick={() => requestAdd(product)}
            className="h-9 w-9 rounded-lg border border-[var(--border)] flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: inCart ? 'var(--brand-soft)' : undefined }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  const laneBtn = (lane: PayLane, label: string, hint: string) => (
    <button
      key={lane}
      type="button"
      onClick={() => chooseLane(lane)}
      className={`rounded-xl border-2 px-3 py-3 text-left transition-colors ${
        payLane === lane
          ? 'border-[var(--brand-green)] bg-[var(--brand-soft)]'
          : 'border-[var(--border)] bg-white hover:border-[var(--brand-green)]/50'
      }`}
    >
      <p className="text-sm font-bold text-[#1A1A1A]">{label}</p>
      <p className="text-[11px] text-[#5A6070] mt-0.5 leading-snug">{hint}</p>
    </button>
  )

  return (
    <section
      id="cove-register"
      className="scroll-mt-28 rounded-xl border-2 border-[var(--brand-green)] bg-white p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" style={{ color: 'var(--brand-green)' }} />
          In-person sales
        </h2>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {(
            [
              { id: 'event' as const, label: 'Event' },
              { id: 'window' as const, label: 'Window' },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVenueMode(v.id)}
              className={`px-3 py-1.5 text-xs font-bold ${
                venueMode === v.id
                  ? 'bg-[var(--brand-green)] text-white'
                  : 'bg-white text-[#5A6070]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-[#5A6070] leading-relaxed rounded-lg bg-[#FAFCF9] border border-[var(--border)] px-3 py-2">
        {venueMode === 'event'
          ? 'Event mode: Stand owns cash + card + Cove gift-card scan · Staff Charge Cove is backup · portal paid → Pickup only. Join QR optional after sale.'
          : 'Window mode: Stand for cash/card/Cove Wallet · Staff Charge Cove only if no Wallet · portal checkout → Pickup only.'}
        {' · '}
        <span className="font-semibold text-[var(--brand-dark)]">
          Optional. Buy first, join anytime
        </span>
      </p>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070] mb-2">
          How paying?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {laneBtn(
            'stand',
            'Cash · card · Cove on Stand',
            'Stand: Cash/Card · Gift card (Photos QR) · or Customer Card on File (PIN/passcode)',
          )}
          {laneBtn('cove', 'Cove backup (Staff)', 'Only if Stand Card on File fails / no gift card')}
          {laneBtn('external', 'External (AM)', 'Zelle · PayPal · phone · no Stand')}
        </div>
        <button
          type="button"
          onClick={() => chooseLane('pickup')}
          className={`mt-2 text-xs font-bold underline ${
            payLane === 'pickup' ? 'text-[var(--brand-green)]' : 'text-[#5A6070]'
          }`}
        >
          Paid in portal / site checkout → Pickup only
        </button>
        {payLane ? (
          <Button type="button" variant="outline" size="sm" className="ml-3 mt-2" onClick={clearSession}>
            <X className="w-3.5 h-3.5 mr-1" /> Change lane
          </Button>
        ) : null}
      </div>

      {payLane === 'stand' ? (
        <div className="rounded-xl border-2 border-[var(--brand-dark)] bg-[#F5F7F4] p-4 space-y-2">
          <p className="text-sm font-bold text-[#1A1A1A]">Use Square Stand (all in-person tenders)</p>
          <ol className="text-sm text-[#5A6070] list-decimal pl-5 space-y-1">
            <li>Ring snacks / spirit on Stand</li>
            <li>
              Cash or Card, or Gift card (Photos QR). Or search Customer by 6-digit/passcode →{' '}
              <strong>Card on File</strong>
            </li>
            <li>Stop. Do not also Charge Cove in Staff</li>
          </ol>
          <p className="text-xs text-[#5A6070]">
            Card on File needs a Cove load in the portal. &quot;Unable to load cards&quot; → cash/card or
            Staff backup below. Portal-paid orders → Pickup only.
          </p>
        </div>
      ) : null}

      {payLane === 'pickup' ? (
        <div className="rounded-xl border border-[var(--border)] bg-[#FAFCF9] p-4">
          <p className="text-sm text-[#5A6070]">
            No new charge.{' '}
            <a href="#cove-store-pickups" className="font-bold underline" style={{ color: 'var(--brand-green)' }}>
              Open today&apos;s store pickups
            </a>
          </p>
        </div>
      ) : null}

      {payLane === 'external' ? (
        <div className="rounded-xl border-2 border-[var(--brand-green)] p-4 space-y-3 bg-[#FAFCF9]">
          <p className="text-sm font-bold text-[#1A1A1A]">External pay logger</p>
          <p className="text-xs text-[#5A6070]">
            Morning / no Stand: log money that landed outside cash drawer or Stand.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'zelle' as const, label: 'Zelle' },
                { id: 'paypal' as const, label: 'PayPal' },
                { id: 'phone_square' as const, label: 'Phone Square' },
                { id: 'other' as const, label: 'Other' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setExternalTender(t.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold border ${
                  externalTender === t.id
                    ? 'border-[var(--brand-green)] bg-[var(--brand-soft)] text-[var(--brand-green)]'
                    : 'border-[var(--border)] text-[#5A6070]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#5A6070]">
              Amount ($)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={externalAmount}
                onChange={(e) => setExternalAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border-2 border-[var(--brand-green)] px-3 py-3 text-xl font-bold tabular-nums"
                placeholder="0.00"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070]">
              Note (optional)
              <input
                value={externalNote}
                onChange={(e) => setExternalNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-3 text-sm"
                placeholder="Open House AM · spiritwear"
              />
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-bold text-[#5A6070]">
              Name (optional)
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070]">
              Email (join invite)
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-[#5A6070]">
              Phone
              <input
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#5A6070]">
            <input
              type="checkbox"
              checked={sendJoinInvite}
              onChange={(e) => setSendJoinInvite(e.target.checked)}
            />
            Email free join link if email provided
          </label>
          <Button
            disabled={busy || !externalAmount}
            onClick={() => void logExternal()}
            className="text-white text-base px-8 py-6 font-bold"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : `Log ${externalTender.replace('_', ' ')}`}
          </Button>
        </div>
      ) : null}

      {payLane === 'cove' ? (
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
                className="mt-1 w-full border-2 border-[var(--brand-green)] rounded-lg px-3 py-3 text-xl font-mono tracking-widest"
              />
            </label>
            <Button
              type="submit"
              disabled={busy || code.trim().length < 4}
              className="text-white py-3"
              style={{ backgroundColor: 'var(--brand-green)' }}
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
      ) : null}

      {mode === 'member' && family ? (
        <div className="rounded-xl px-4 py-3 space-y-1" style={{ backgroundColor: 'var(--brand-soft)' }}>
          <p className="text-sm font-bold text-[#1A1A1A]">
            {family.students
              .map((s) => [s.firstName, s.lastName].filter(Boolean).join(' ').trim())
              .filter(Boolean)
              .join(', ') ||
              family.parentEmail ||
              'Family'}
            <span className="font-normal text-[#5A6070]"> · code {family.coveFamilyCode}</span>
            {family.paidMember ? (
              <span className="ml-2 text-amber-900 font-bold">· perk · free food</span>
            ) : null}
          </p>
          {family.hasCard ? (
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--brand-green)' }}>
              Cove Digital Card: ${Number(family.balance).toFixed(2)}
            </p>
          ) : (
            <p className="text-sm font-bold text-amber-900">
              No Cove card. Use Square Stand (cash or card).
            </p>
          )}
        </div>
      ) : null}



      {needsCart && selling ? (
        <>
          <div className="sticky top-0 z-[5] -mx-1 px-1 py-2 bg-white/95 backdrop-blur-sm space-y-2 border-b border-[var(--border)]">
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
                className="mt-1 w-full rounded-xl border-2 border-[var(--brand-green)] px-3 py-3 text-base font-semibold text-[#1A1A1A]"
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
                      ? 'border-[var(--brand-green)] bg-[var(--brand-soft)] text-[var(--brand-green)]'
                      : 'border-[var(--border)] text-[#5A6070]'
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
                    ? 'border-[var(--brand-green)] bg-[var(--brand-soft)] text-[var(--brand-green)]'
                    : 'border-[var(--border)] text-[#5A6070]'
                }`}
              >
                A-Z
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
                      ? 'border-[var(--brand-green)] bg-[var(--brand-soft)] text-[var(--brand-green)]'
                      : 'border-[var(--border)] text-[#5A6070]'
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
                  style={{ color: 'var(--brand-green)' }}
                >
                  Stock setup
                </a>
              </p>
            ) : null}
          </div>

          <div className="sticky bottom-2 z-10 rounded-2xl border-2 border-[var(--brand-green)] bg-white shadow-lg p-3 space-y-3">
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
                <p className="text-xs" style={{ color: remainingAfter < 0 ? '#b91c1c' : 'var(--brand-green)' }}>
                  {remainingAfter < 0
                    ? `Cove covers $${balance.toFixed(2)}. Remainder $${Math.abs(remainingAfter).toFixed(2)} on Square Stand.`
                    : `Cove left after charge: $${remainingAfter.toFixed(2)}`}
                </p>
              ) : null}
            </div>

            {cart.length === 0 ? (
              <p className="text-xs text-[#5A6070]">Tap a product tile to add it.</p>
            ) : (
              <>
                {payLane === 'cove' && canUseCove ? (
                  <div className="space-y-2">
                    {remainingAfter < 0 ? (
                      <label className="flex items-start gap-2 text-xs text-[#1A1A1A]">
                        <input
                          type="checkbox"
                          checked={allowPartialCove}
                          onChange={(e) => setAllowPartialCove(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span className="whitespace-pre-line">
                          Optional. Apply available Cove (${balance.toFixed(2)}), then collect $
                          {Math.abs(remainingAfter).toFixed(2)} on Square Stand.
                          Leave unchecked if you will use Stand only for the full cart.
                        </span>
                      </label>
                    ) : null}
                    <Button
                      disabled={busy || (remainingAfter < 0 && !allowPartialCove)}
                      onClick={() => void chargeCove()}
                      className="text-white text-base px-8 py-6 font-bold w-full sm:w-auto"
                      style={{ backgroundColor: 'var(--brand-green)' }}
                    >
                      {busy ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : remainingAfter < 0 ? (
                        `Charge Cove $${balance.toFixed(2)}, then Stand $${Math.abs(remainingAfter).toFixed(2)}`
                      ) : (
                        `Charge Cove $${cartTotal.toFixed(2)}`
                      )}
                    </Button>
                  </div>
                ) : null}

                {payLane === 'cove' && !canUseCove ? (
                  <p className="text-xs text-amber-900 font-semibold">
                    Need Cove balance to charge here. Switch to Square Stand (cash, card, or load Cove online).
                  </p>
                ) : null}

                <ul className="flex flex-wrap gap-2 text-xs text-[#5A6070]">
                  {cart.map((l) => (
                    <li
                      key={lineKey(l.productId, l.variantId)}
                      className="rounded-full bg-[#FAFCF9] border border-[var(--border)] px-2.5 py-1"
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
              {(variantPicker.variants ?? []).map((v) => {
                const oos = !v.available
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() =>
                      oos
                        ? openDemandForVariant(variantPicker, v)
                        : addVariant(variantPicker, v.id)
                    }
                    className={`rounded-xl border px-3 py-3 text-left hover:border-[var(--brand-green)] ${
                      oos
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    <p className="text-sm font-bold text-[#1A1A1A]">{v.label}</p>
                    {oos ? (
                      <p className="text-xs font-bold mt-0.5 text-amber-800">
                        Out of stock · tap to log demand
                      </p>
                    ) : (
                      <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--brand-green)' }}>
                        ${v.price.toFixed(2)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {demandDraft ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Log size demand"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">
                  Log demand · {demandDraft.product.name}
                </p>
                <p className="text-xs text-[#5A6070]">
                  Size {demandDraft.variant.label} is out of stock. Capture who wants it for the
                  next order.
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-bold underline text-[#5A6070]"
                onClick={() => setDemandDraft(null)}
              >
                Cancel
              </button>
            </div>
            <label className="block text-xs font-bold text-[#5A6070] space-y-1">
              Parent name *
              <input
                value={demandParentName}
                onChange={(e) => setDemandParentName(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-[#5A6070] space-y-1">
                Email
                <input
                  type="email"
                  value={demandParentEmail}
                  onChange={(e) => setDemandParentEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-normal text-[#1A1A1A]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5A6070] space-y-1">
                Phone
                <input
                  value={demandParentPhone}
                  onChange={(e) => setDemandParentPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-normal text-[#1A1A1A]"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-[#5A6070] space-y-1">
                Qty
                <input
                  type="number"
                  min={1}
                  value={demandQty}
                  onChange={(e) => setDemandQty(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-normal text-[#1A1A1A]"
                />
              </label>
              <label className="block text-xs font-bold text-[#5A6070] space-y-1">
                Event / table
                <input
                  value={demandEventNote}
                  onChange={(e) => setDemandEventNote(e.target.value)}
                  placeholder="Open House"
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-normal text-[#1A1A1A]"
                />
              </label>
            </div>
            <label className="block text-xs font-bold text-[#5A6070] space-y-1">
              Notes
              <input
                value={demandNotes}
                onChange={(e) => setDemandNotes(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-normal text-[#1A1A1A]"
              />
            </label>
            <Button
              type="button"
              disabled={busy}
              className="w-full text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
              onClick={() => void submitDemand()}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save size demand
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
