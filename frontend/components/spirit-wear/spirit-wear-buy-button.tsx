'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePathname } from 'next/navigation'
import { Lock, Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { addToCartKeepShopping, buyNowGoCheckout } from '@/lib/cart/buy-actions'

type CatalogVariant = {
  id: string
  label: string
  price: number
  sku: string
}

type CatalogDetail = {
  id: string
  name: string
  price: number
  optionName?: string
  variants: CatalogVariant[]
}

interface Props {
  productId: string
  /** List price from catalog (server-rendered). */
  price: number
  productName?: string
  disabled?: boolean
}

/** Cove / spirit buys. free or paid member, own CC in portal via Square. */
export function SpiritWearBuyButton({ productId, price, productName, disabled }: Props) {
  const { status } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [detail, setDetail] = useState<CatalogDetail | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [error, setError] = useState('')

  const selected =
    detail?.variants.find((v) => v.id === selectedVariantId) ??
    detail?.variants[0] ??
    null
  const chargeAmount = selected?.price ?? price
  const chargeTitle = selected
    ? `${productName || detail?.name || vanillaizeIfDemo('The Cove')}. ${selected.label}`
    : productName || vanillaizeIfDemo('The Cove')

  async function startBuy() {
    setError('')
    setLoadingVariants(true)
    try {
      const res = await fetch(`/api/catalog/product/${encodeURIComponent(productId)}`)
      const data = (await res.json().catch(() => ({}))) as CatalogDetail & {
        error?: string
      }
      if (!res.ok) {
        setError(data.error || 'Could not load options')
        return
      }
      setDetail(data)
      const variants = data.variants ?? []
      if (variants.length > 1) {
        setSelectedVariantId(variants[0]?.id ?? '')
        setPickerOpen(true)
        return
      }
      setSelectedVariantId(variants[0]?.id ?? '')
      buyNow(variants[0]?.id ?? '', data)
    } catch {
      setError('Could not load options')
    } finally {
      setLoadingVariants(false)
    }
  }

  function productLine(variantId: string, catalog: CatalogDetail | null = detail) {
    const selectedRow =
      catalog?.variants.find((v) => v.id === variantId) ?? catalog?.variants[0] ?? null
    const lineAmount = selectedRow?.price ?? price
    const lineTitle = selectedRow
      ? `${productName || catalog?.name || vanillaizeIfDemo('The Cove')}. ${selectedRow.label}`
      : productName || vanillaizeIfDemo('The Cove')
    return {
      kind: 'product' as const,
      title: lineTitle,
      amount: lineAmount,
      href: pathname || '/cove',
      productId,
      variantId: variantId || undefined,
    }
  }

  function addToCartOnly(variantId: string, catalog: CatalogDetail | null = detail) {
    addToCartKeepShopping(productLine(variantId, catalog))
    setPickerOpen(false)
  }

  function buyNow(variantId: string, catalog: CatalogDetail | null = detail) {
    buyNowGoCheckout(productLine(variantId, catalog), router)
    setPickerOpen(false)
  }

  function continueBuyNow() {
    if (!selectedVariantId && (detail?.variants.length ?? 0) > 1) {
      setError('Choose a color')
      return
    }
    buyNow(selectedVariantId)
  }

  function continueAddToCart() {
    if (!selectedVariantId && (detail?.variants.length ?? 0) > 1) {
      setError('Choose a color')
      return
    }
    addToCartOnly(selectedVariantId)
  }

  function closeAll() {
    setPickerOpen(false)
    setError('')
  }

  if (disabled) {
    return (
      <span className="inline-flex w-full sm:w-auto justify-center text-xs font-bold px-3 py-2 rounded-full text-[#5A6070] bg-[#F0EDE8]">
        Unavailable
      </span>
    )
  }

  if (status === 'loading') {
    return (
      <span
        className="inline-flex w-full sm:w-auto justify-center text-xs font-bold px-3 py-2 rounded-full text-white/70"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        …
      </span>
    )
  }

  if (status === 'visitor') {
    const returnTo = encodeURIComponent(pathname)
    return (
      <a
        href={`/auth/join?returnTo=${returnTo}`}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border-2 transition-colors whitespace-nowrap"
        style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}
        title="Create a free parent account or log in to buy"
      >
        <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Log in
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void startBuy()}
        disabled={loadingVariants}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full transition-colors text-white disabled:opacity-70 whitespace-nowrap"
        style={{ backgroundColor: 'var(--brand-green)' }}
      >
        {loadingVariants ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : null}
        Buy now
      </button>
      {error && !pickerOpen ? (
        <p className="mt-1 text-[11px] text-red-700">{error}</p>
      ) : null}

      {pickerOpen && detail ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`spirit-variant-${productId.slice(0, 8)}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAll()
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-[var(--border)] p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2
                  id={`spirit-variant-${productId.slice(0, 8)}`}
                  className="text-base font-bold text-[#1A1C23]"
                >
                  {productName || detail.name}
                </h2>
                <p className="text-sm text-[#5A6070] mt-0.5">
                  Choose {detail.optionName?.toLowerCase() || 'an option'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAll}
                className="p-1 rounded-full text-[#5A6070] hover:bg-[#F0EDE8]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {detail.variants.map((v) => {
                const active = v.id === selectedVariantId
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(v.id)
                      setError('')
                    }}
                    className={`px-3 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                      active
                        ? 'text-white border-transparent'
                        : 'text-[#1A1C23] border-[#D8D2C8] bg-white hover:border-[var(--brand-green)]'
                    }`}
                    style={active ? { backgroundColor: 'var(--brand-green)' } : undefined}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>

            {error ? <p className="mb-3 text-xs text-red-700">{error}</p> : null}

            <button
              type="button"
              onClick={continueBuyNow}
              className="w-full text-sm font-bold py-2.5 rounded-full text-white mb-2"
              style={{ backgroundColor: 'var(--brand-green)' }}
            >
              Buy now · ${chargeAmount.toFixed(2)}
            </button>
            <button
              type="button"
              onClick={continueAddToCart}
              className="w-full text-sm font-bold py-2.5 rounded-full border-2 border-[var(--brand-green)] text-[var(--brand-green)] bg-white"
            >
              Add to cart · ${chargeAmount.toFixed(2)}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
