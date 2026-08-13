'use client'

import { useCallback, useEffect, useState } from 'react'
import { ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  optionName: 'Flavor',
  variants: [] as VariantEdit[],
  useVariants: false,
}

/**
 * Manage Cove snack products entirely from Staff. Creates/updates Wix Catalog
 * (including photos + flavor/size variants) and keeps /cove allowlist + inventory in sync.
 */
export function StaffCoveProductsPanel() {
  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [edits, setEdits] = useState<Record<string, ProductEdit>>({})
  const [uploadingId, setUploadingId] = useState<string | null>(null)

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
          ? ` Square Stand: added ${d.squareSync.createdSkus.join(', ')} — refresh Library on the iPad.`
          : d.squareSync?.skipped && d.squareSync?.reason === 'already on Square'
            ? ' Already on Square Stand.'
            : d.squareSync?.ok === false
              ? ` Square sync note: ${d.squareSync.reason || 'failed'} — run sync script if needed.`
              : d.squareSync?.reason === 'variants missing SKU'
                ? ' Add a SKU so Stand can sync inventory.'
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
          ? ` Square Stand: added ${d.squareSync.createdSkus.join(', ')} — refresh Library on the iPad.`
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

  return (
    <section
      id="cove-products"
      className="scroll-mt-28 rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-5"
    >
      <div>
        <h2 className="text-lg font-bold">Cove products</h2>
        <p className="text-xs text-[#5A6070] mt-1">
          Add snacks, photos, flavors/sizes, and restock here. No Wix Dashboard needed. “On Cove”
          controls the visitor menu; barcodes feed the register scanner.
        </p>
      </div>

      <div className="rounded-xl border border-[#D4E8D4] bg-[#FAFCF9] p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">Add product</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name (e.g. Takis)"
            className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm sm:col-span-2"
          />
          {!form.useVariants ? (
            <>
              <input
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Price $"
                inputMode="decimal"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="Qty on hand"
                inputMode="numeric"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="Barcode / SKU"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-mono"
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
          <div className="space-y-2 rounded-lg border border-[#E8E4DC] bg-white p-3">
            <input
              value={form.optionName}
              onChange={(e) => setForm((f) => ({ ...f, optionName: e.target.value }))}
              placeholder="Option name (Flavor, Size…)"
              className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm w-full max-w-xs"
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
                  className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                  className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                  className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                  placeholder="Barcode"
                  className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm font-mono"
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

        <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
          <input
            type="checkbox"
            checked={form.showOnCove}
            onChange={(e) => setForm((f) => ({ ...f, showOnCove: e.target.checked }))}
          />
          Show on /cove (visitor menu)
        </label>
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
          style={{ backgroundColor: '#085508' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
          Add product
        </Button>
      </div>

      <div className="space-y-4">
        {products.map((p) => {
          const e = edits[p.id]
          if (!e) return null
          return (
            <div
              key={p.id}
              className="rounded-xl border border-[#F0EDE8] p-4 space-y-3"
            >
              <div className="flex flex-wrap gap-3 items-start">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-[#F5F3EF] border border-[#E8E4DC] shrink-0">
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
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[#E8E4DC] px-2 py-1.5 hover:bg-[#FAFCF9]">
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
                  className="flex-1 min-w-[10rem] border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm font-semibold"
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
                  On Cove
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
                    className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                    className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
                  />
                  <input
                    value={e.sku}
                    onChange={(ev) =>
                      setEdits((prev) => ({
                        ...prev,
                        [p.id]: { ...e, sku: ev.target.value },
                      }))
                    }
                    placeholder="Barcode"
                    className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm font-mono"
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
                    className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm max-w-xs"
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
                        className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                        className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                        className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm"
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
                        placeholder="Barcode"
                        className="border border-[#E8E4DC] rounded px-2 py-1.5 text-sm font-mono"
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
