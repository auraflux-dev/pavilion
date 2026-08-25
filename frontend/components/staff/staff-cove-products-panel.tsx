'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  STAFF_FILTER_CARD,
  STAFF_FILTER_CARD_TITLE,
  STAFF_FILTER_INPUT,
  STAFF_FILTER_LABEL,
  STAFF_FILTER_SELECT,
} from '@/lib/staff/staff-filter-ui'

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
  sku: string
  quantity: number | null
  onCove: boolean
  onSpirit: boolean
  visible: boolean
  image?: string
  optionName?: string
  variants: Variant[]
}

type VariantEdit = {
  id?: string
  label: string
  price: string
  quantity: string
  sku: string
}

type ProductEdit = {
  name: string
  price: string
  quantity: string
  sku: string
  onCove: boolean
  onSpirit: boolean
  optionName: string
  variants: VariantEdit[]
  showVariants: boolean
}

const emptyForm = {
  name: '',
  price: '',
  quantity: '',
  sku: '',
  showOnCove: true,
  showOnSpirit: false,
  optionName: 'Flavor',
  variants: [] as VariantEdit[],
  useVariants: false,
}

/**
 * Manage Cove snacks and Spirit Wear from one Staff catalog. Creates/updates Wix
 * Catalog (photos, variants) and keeps storeProductIds + spiritWearProductIds + inventory in sync.
 */
type ProductSort = 'name-asc' | 'name-desc' | 'qty-asc' | 'qty-desc' | 'price-asc' | 'price-desc'
type ProductScope = 'all' | 'on-cove' | 'spirit' | 'off-menus' | 'low-stock'

function productSortQty(p: Product): number | null {
  const fromVariants = (p.variants ?? [])
    .map((v) => v.quantity)
    .filter((q): q is number => q != null && Number.isFinite(q))
  if (fromVariants.length > 0) return fromVariants.reduce((sum, n) => sum + n, 0)
  return p.quantity != null && Number.isFinite(p.quantity) ? p.quantity : null
}

function compareNullableNumber(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return (a - b) * dir
}

function compareProducts(a: Product, b: Product, sort: ProductSort): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  switch (sort) {
    case 'name-asc':
      return byName || a.id.localeCompare(b.id)
    case 'name-desc':
      return -byName || a.id.localeCompare(b.id)
    case 'price-asc':
      return a.price - b.price || byName
    case 'price-desc':
      return b.price - a.price || byName
    case 'qty-asc':
      return compareNullableNumber(productSortQty(a), productSortQty(b), 1) || byName
    case 'qty-desc':
      return compareNullableNumber(productSortQty(a), productSortQty(b), -1) || byName
    default:
      return byName
  }
}

export function StaffCoveProductsPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [edits, setEdits] = useState<Record<string, ProductEdit>>({})
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<ProductSort>('name-asc')
  const [scope, setScope] = useState<ProductScope>('all')
  /** One open editor at a time (same Staff collapse rule as Programs). */
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setError('')
    const r = await fetch('/api/staff/cove/products')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    const list = (d.products ?? []) as Product[]
    setProducts(list)
    const next: Record<string, ProductEdit> = {}
    for (const p of list) {
      const variants =
        p.variants?.length > 0
          ? p.variants.map((v) => ({
              id: v.id,
              label: v.label === 'Default' ? '' : v.label,
              price: String(v.price),
              quantity: v.quantity == null ? '' : String(v.quantity),
              sku: v.sku ?? '',
            }))
          : [
              {
                id: p.variants?.[0]?.id,
                label: '',
                price: String(p.price),
                quantity: p.quantity == null ? '' : String(p.quantity),
                sku: p.sku ?? '',
              },
            ]
      next[p.id] = {
        name: p.name,
        price: String(p.price),
        quantity: p.quantity == null ? '' : String(p.quantity),
        sku: p.sku ?? '',
        onCove: p.onCove,
        onSpirit: Boolean(p.onSpirit),
        optionName: p.optionName || 'Flavor',
        variants,
        showVariants: (p.variants?.length ?? 0) > 1 || Boolean(p.optionName),
      }
    }
    setEdits(next)
  }, [])

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function createProduct() {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        showOnCove: form.showOnCove,
        showOnSpirit: form.showOnSpirit,
      }
      if (form.useVariants && form.variants.length > 0) {
        payload.optionName = form.optionName || 'Flavor'
        payload.variants = form.variants.map((v) => ({
          label: v.label,
          price: parseFloat(v.price),
          quantity: parseInt(v.quantity || '0', 10),
          sku: v.sku,
        }))
        payload.price = parseFloat(form.variants[0]?.price || form.price || '0')
        payload.quantity = parseInt(form.variants[0]?.quantity || '0', 10)
      } else {
        payload.price = parseFloat(form.price)
        payload.quantity = parseInt(form.quantity || '0', 10)
        payload.sku = form.sku
      }

      const r = await fetch('/api/staff/cove/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Create failed')
      setForm(emptyForm)
      const syncNote =
        d.squareSync?.createdSkus?.length
          ? ` Square Stand: added ${d.squareSync.createdSkus.join(', ')}. Refresh Library on the iPad.`
          : d.squareSync?.skipped && d.squareSync?.reason === 'already on Square'
            ? ' Already on Square Stand.'
            : d.squareSync?.ok === false
              ? ` Square sync note: ${d.squareSync.reason || 'failed'}. Run sync script if needed.`
              : d.squareSync?.reason === 'variants missing SKU'
                ? ' SKU was missing. Try Save again (SKUs auto-fill from the name).'
                : ''
      setStatus(`Added “${d.product.name}”. Live on /cove within a few minutes.${syncNote}`)

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveProduct(id: string) {
    const e = edits[id]
    if (!e) return
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const payload: Record<string, unknown> = {
        id,
        name: e.name,
        showOnCove: e.onCove,
        showOnSpirit: e.onSpirit,
      }
      if (e.showVariants) {
        const variants = e.variants.filter((v) => v.label.trim() || e.variants.length === 1)
        payload.optionName = e.optionName || 'Flavor'
        payload.variants = variants.map((v) => ({
          id: v.id,
          label: v.label.trim() || 'Default',
          price: parseFloat(v.price),
          quantity: v.quantity === '' ? 0 : parseInt(v.quantity, 10),
          sku: v.sku,
        }))
      } else {
        payload.price = parseFloat(e.price)
        payload.quantity = e.quantity === '' ? undefined : parseInt(e.quantity, 10)
        payload.sku = e.sku
      }

      const r = await fetch('/api/staff/cove/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      const syncNote =
        d.squareSync?.createdSkus?.length
          ? ` Square Stand: added ${d.squareSync.createdSkus.join(', ')}. Refresh Library on the iPad.`
          : d.squareSync?.skipped && d.squareSync?.reason === 'already on Square'
            ? ' Already on Square Stand.'
            : d.squareSync?.ok === false
              ? ` Square sync note: ${d.squareSync.reason || 'failed'}.`
              : ''
      setStatus(`Saved “${d.product.name}”.${syncNote}`)

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeProduct(id: string, name: string) {
    if (
      !window.confirm(
        `Remove “${name}” from the Cove catalog?\n\nThis deletes it from Wix and Staff. Square Stand may still show it until you remove it in Square Library.`
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Remove failed')
      if (expandedId === id) setExpandedId(null)
      setStatus(`Removed “${name}”.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  async function uploadPhoto(id: string, file: File | null) {
    if (!file) return
    setUploadingId(id)
    setError('')
    setStatus('')
    try {
      const body = new FormData()
      body.set('productId', id)
      body.set('file', file)
      const r = await fetch('/api/staff/cove/products/image', {
        method: 'POST',
        body,
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Upload failed')
      setStatus(`Photo updated for “${d.product.name}”.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingId(null)
    }
  }

  async function backfillMissingSkus() {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await fetch('/api/staff/cove/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backfillSkus: true }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Backfill failed')
      const n = d.backfill?.updated?.length ?? 0
      setStatus(
        n === 0
          ? 'All products already have SKUs.'
          : `Assigned SKUs on ${n} product${n === 1 ? '' : 's'} and synced Square Stand where possible.`
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBusy(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = products.filter((p) => {
      if (scope === 'on-cove' && !p.onCove) return false
      if (scope === 'spirit' && !p.onSpirit) return false
      if (scope === 'off-menus' && (p.onCove || p.onSpirit)) return false
      if (scope === 'low-stock') {
        const qty = productSortQty(p)
        const low =
          qty == null
            ? (p.variants ?? []).some((v) => v.quantity != null && v.quantity <= 5)
            : qty <= 5
        if (!low) return false
      }
      if (!needle) return true
      const hay = [p.name, p.sku, ...(p.variants ?? []).flatMap((v) => [v.label, v.sku])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
    return [...list].sort((a, b) => compareProducts(a, b, sort))
  }, [products, q, sort, scope])

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [sort, scope, q])

  return (
    <section
      id="cove-products"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Cove catalog · snacks &amp; spirit wear</h2>
          <p className="text-xs text-[#5A6070] mt-1">
            One list for store snacks and spirit wear. Open <strong>Show editor</strong> to change
            price, photo, variants, and where it appears: <strong>On Cove</strong> (/cove snacks) and{' '}
            <strong>On Spirit Wear</strong> (/cove/spirit-wear + Spirit register). Leave SKU blank;
            we generate one from the name for Square Stand.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void backfillMissingSkus()}
          className="shrink-0"
        >
          Fill missing SKUs
        </Button>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className={`flex-1 ${STAFF_FILTER_CARD}`}>
          <p className={STAFF_FILTER_CARD_TITLE}>Search</p>
          <label className={STAFF_FILTER_LABEL}>
            Lookup
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, SKU, flavor / size"
              autoComplete="off"
              name="staff-cove-product-lookup"
              className={STAFF_FILTER_INPUT}
            />
          </label>
          <p className="text-[11px] text-[#5A6070]">
            {filteredProducts.length}
            {filteredProducts.length !== products.length ? ` of ${products.length}` : ''} products
            {busy ? ' · Loading…' : ''}
          </p>
        </div>
        <div className="xl:w-52 shrink-0 space-y-3">
          <div className={STAFF_FILTER_CARD}>
            <label className={STAFF_FILTER_LABEL}>
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as ProductSort)}
                className={STAFF_FILTER_SELECT}
                aria-label="Sort products"
              >
                <option value="name-asc">Name A to Z</option>
                <option value="name-desc">Name Z to A</option>
                <option value="qty-asc">Qty low to high</option>
                <option value="qty-desc">Qty high to low</option>
                <option value="price-asc">Price low to high</option>
                <option value="price-desc">Price high to low</option>
              </select>
            </label>
          </div>
          <div className={STAFF_FILTER_CARD}>
            <label className={STAFF_FILTER_LABEL}>
              Filter
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ProductScope)}
                className={STAFF_FILTER_SELECT}
                aria-label="Filter products"
              >
                <option value="all">All products</option>
                <option value="on-cove">On Cove snacks</option>
                <option value="spirit">On Spirit Wear</option>
                <option value="off-menus">Not on either menu</option>
                <option value="low-stock">Low stock (5 or fewer)</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <details className="rounded-xl border border-[var(--brand-line)] bg-white group">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#5A6070] flex items-center justify-between gap-2">
          <span className="normal-case tracking-normal">Show add product</span>
          <span className="text-[11px] font-bold normal-case tracking-normal group-open:hidden">
            Show
          </span>
          <span className="text-[11px] font-bold normal-case tracking-normal hidden group-open:inline">
            Hide
          </span>
        </summary>
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name (e.g. Takis)"
            className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
          />
          {!form.useVariants ? (
            <>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Price $"
                inputMode="decimal"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="Qty on hand"
                inputMode="numeric"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="SKU (auto from name)"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono"
                title="Leave blank. We generate from the product name"
              />
            </>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
          <input
            type="checkbox"
            checked={form.useVariants}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                useVariants: e.target.checked,
                variants: e.target.checked
                  ? f.variants.length
                    ? f.variants
                    : [
                        { label: '', price: f.price || '', quantity: f.quantity || '', sku: f.sku || '' },
                        { label: '', price: f.price || '', quantity: '', sku: '' },
                      ]
                  : [],
              }))
            }
          />
          Multiple flavors / sizes (variants)
        </label>

        {form.useVariants ? (
          <div className="space-y-2 rounded-lg border border-[var(--border)] bg-white p-3">
            <input
              value={form.optionName}
              onChange={(e) => setForm((f) => ({ ...f, optionName: e.target.value }))}
              placeholder="Option name (Flavor, Size…)"
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm w-full max-w-xs"
            />
            {form.variants.map((v, idx) => (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input
                  value={v.label}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((row, i) =>
                        i === idx ? { ...row, label: e.target.value } : row
                      ),
                    }))
                  }
                  placeholder="Label (Fuego)"
                  className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                />
                <input
                  value={v.price}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((row, i) =>
                        i === idx ? { ...row, price: e.target.value } : row
                      ),
                    }))
                  }
                  placeholder="Price"
                  inputMode="decimal"
                  className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                />
                <input
                  value={v.quantity}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((row, i) =>
                        i === idx ? { ...row, quantity: e.target.value } : row
                      ),
                    }))
                  }
                  placeholder="Qty"
                  inputMode="numeric"
                  className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                />
                <input
                  value={v.sku}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.map((row, i) =>
                        i === idx ? { ...row, sku: e.target.value } : row
                      ),
                    }))
                  }
                  placeholder="SKU (auto)"
                  className="border border-[var(--border)] rounded px-2 py-1.5 text-sm font-mono"
                />
                <button
                  type="button"
                  className="text-xs text-red-600 flex items-center gap-1"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      variants: f.variants.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  variants: [...f.variants, { label: '', price: '', quantity: '', sku: '' }],
                }))
              }
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add flavor / size
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={form.showOnCove}
              onChange={(e) => setForm((f) => ({ ...f, showOnCove: e.target.checked }))}
            />
            On Cove snacks (/cove)
          </label>
          <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={form.showOnSpirit}
              onChange={(e) => setForm((f) => ({ ...f, showOnSpirit: e.target.checked }))}
            />
            On Spirit Wear
          </label>
        </div>
        <Button
          disabled={
            busy ||
            !form.name.trim() ||
            (form.useVariants
              ? form.variants.filter((v) => v.label.trim() && v.price).length < 1
              : !form.price)
          }
          onClick={() => void createProduct()}
          className="text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          Add product
        </Button>
        </div>
      </details>

      <div ref={listRef} className="max-h-[480px] overflow-auto space-y-3 pr-1">
        <p className="text-xs text-[#5A6070]">
          Compact list · open <strong>Show editor</strong> on one product at a time.
        </p>
        {filteredProducts.length === 0 ? (
          <p className="p-4 text-sm text-[#5A6070] border border-[var(--border)] rounded-lg">
            No products match these filters.
          </p>
        ) : null}
        {filteredProducts.map((p) => {
          const e = edits[p.id]
          if (!e) return null
          const open = expandedId === p.id
          const qtyLabel =
            p.quantity == null ? 'qty —' : `qty ${p.quantity}`
          return (
            <div
              key={p.id}
              className="rounded-xl border border-[var(--border)] bg-white p-3 space-y-3"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F5F3EF] border border-[var(--border)] shrink-0">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-[#5A6070]">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#5A6070] flex flex-wrap gap-x-2">
                      <span>${p.price.toFixed(2)}</span>
                      <span>{qtyLabel}</span>
                      <span>{p.onCove ? 'Cove' : null}</span>
                      <span>{p.onSpirit ? 'Spirit' : null}</span>
                      {!p.onCove && !p.onSpirit ? <span>Off menus</span> : null}
                      {(p.variants?.length ?? 0) > 1 ? (
                        <span>{p.variants.length} variants</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-bold"
                    style={{ color: 'var(--brand-green)' }}
                    aria-expanded={open}
                    onClick={() => setExpandedId(open ? null : p.id)}
                  >
                    {open ? (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {open ? 'Hide editor' : 'Show editor'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600"
                    disabled={busy}
                    onClick={() => void removeProduct(p.id, p.name)}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    Remove
                  </button>
                </div>
              </div>

              {open ? (
              <>
              <div className="flex flex-wrap gap-3 items-start border-t border-[var(--border)] pt-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F5F3EF] border border-[var(--border)] shrink-0">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-[#5A6070]">
                      No photo
                    </div>
                  )}
                </div>
                <label className="text-xs cursor-pointer">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 hover:bg-white">
                    {uploadingId === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5" />
                    )}
                    Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={busy || uploadingId === p.id}
                    onChange={(ev) => {
                      const file = ev.target.files?.[0] ?? null
                      ev.target.value = ''
                      void uploadPhoto(p.id, file)
                    }}
                  />
                </label>
                <input
                  value={e.name}
                  onChange={(ev) =>
                    setEdits((prev) => ({
                      ...prev,
                      [p.id]: { ...e, name: ev.target.value },
                    }))
                  }
                  className="flex-1 min-w-[10rem] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-semibold"
                />
                <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={e.onCove}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, onCove: ev.target.checked },
                      }))
                    }
                  />
                  On Cove snacks
                </label>
                <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={e.onSpirit}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, onSpirit: ev.target.checked },
                      }))
                    }
                  />
                  On Spirit Wear
                </label>
                <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={e.showVariants}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: {
                          ...e,
                          showVariants: ev.target.checked,
                          variants: ev.target.checked
                            ? e.variants.length > 1
                              ? e.variants
                              : [
                                  {
                                    id: e.variants[0]?.id,
                                    label: e.variants[0]?.label || '',
                                    price: e.price,
                                    quantity: e.quantity,
                                    sku: e.sku,
                                  },
                                  { label: '', price: e.price, quantity: '', sku: '' },
                                ]
                            : e.variants.slice(0, 1),
                        },
                      }))
                    }
                  />
                  Variants
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void saveProduct(p.id)}
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
              </div>

              {!e.showVariants ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <input
                    value={e.price}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, price: ev.target.value },
                      }))
                    }
                    placeholder="Price"
                    className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    value={e.quantity}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, quantity: ev.target.value },
                      }))
                    }
                    placeholder="Qty"
                    className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    value={e.sku}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, sku: ev.target.value },
                      }))
                    }
                    placeholder="SKU (auto)"
                    className="border border-[var(--border)] rounded px-2 py-1.5 text-sm font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    value={e.optionName}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, optionName: ev.target.value },
                      }))
                    }
                    placeholder="Option name"
                    className="border border-[var(--border)] rounded px-2 py-1.5 text-sm max-w-xs"
                  />
                  {e.variants.map((v, idx) => (
                    <div key={v.id || idx} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <input
                        value={v.label}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...e,
                              variants: e.variants.map((row, i) =>
                                i === idx ? { ...row, label: ev.target.value } : row
                              ),
                            },
                          }))
                        }
                        placeholder="Flavor / size"
                        className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        value={v.price}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...e,
                              variants: e.variants.map((row, i) =>
                                i === idx ? { ...row, price: ev.target.value } : row
                              ),
                            },
                          }))
                        }
                        placeholder="Price"
                        className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        value={v.quantity}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...e,
                              variants: e.variants.map((row, i) =>
                                i === idx ? { ...row, quantity: ev.target.value } : row
                              ),
                            },
                          }))
                        }
                        placeholder="Qty"
                        className="border border-[var(--border)] rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        value={v.sku}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...e,
                              variants: e.variants.map((row, i) =>
                                i === idx ? { ...row, sku: ev.target.value } : row
                              ),
                            },
                          }))
                        }
                        placeholder="SKU (auto)"
                        className="border border-[var(--border)] rounded px-2 py-1.5 text-sm font-mono"
                      />
                      <button
                        type="button"
                        className="text-xs text-red-600 text-left"
                        onClick={() =>
                          setEdits((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...e,
                              variants: e.variants.filter((_, i) => i !== idx),
                            },
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: {
                          ...e,
                          variants: [
                            ...e.variants,
                            { label: '', price: e.price, quantity: '', sku: '' },
                          ],
                        },
                      }))
                    }
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add variant
                  </Button>
                </div>
              )}
              </>
              ) : null}
            </div>
          )
        })}
        {products.length === 0 ? (
          <p className="text-sm text-[#5A6070] py-4">No products yet. Add the first snack above.</p>
        ) : null}
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {status ? <p className="text-xs font-semibold text-green-700">{status}</p> : null}
    </section>
  )
}
