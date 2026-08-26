'use client'

import { useEffect, type ReactNode } from 'react'
import { setClientBrandFace, brandFaceFromTrial, type PublicBrandFace } from '@/lib/demo/brand'
import type { TrialBrand } from '@/lib/crm/trial-packs'

/** Applies prospect pack chrome on the demo app (client vanillaize + CSS vars). */
export function BrandPackShell({
  brand,
  slug,
  children,
}: {
  brand: TrialBrand | null
  slug: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!brand) {
      setClientBrandFace(null)
      return () => setClientBrandFace(null)
    }
    const face: PublicBrandFace = brandFaceFromTrial(brand)
    setClientBrandFace(face)
    const root = document.documentElement
    root.dataset.pto = slug || 'riverside'
    if (brand.colors?.primary) root.style.setProperty('--brand-green', brand.colors.primary)
    if (brand.colors?.dark) root.style.setProperty('--brand-dark', brand.colors.dark)
    if (brand.colors?.accent) root.style.setProperty('--brand-accent', brand.colors.accent)
    if (brand.colors?.warm) root.style.setProperty('--brand-warm', brand.colors.warm)
    if (brand.colors?.soft) root.style.setProperty('--brand-soft', brand.colors.soft)
    return () => {
      setClientBrandFace(null)
    }
  }, [brand, slug])

  return <>{children}</>
}
