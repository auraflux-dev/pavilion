'use client'

import { useEffect, type ReactNode } from 'react'
import { setClientBrandFace, brandFaceFromTrial, DEMO_BRAND, type PublicBrandFace } from '@/lib/demo/brand'
import type { TrialBrand } from '@/lib/crm/trial-packs'

export type CmsBrandClientOverride = {
  logoUrl?: string
  ptoName?: string
  schoolName?: string
  cheer?: string
  colors?: {
    primary?: string
    dark?: string
    accent?: string
    warm?: string
    soft?: string
  }
  fontSans?: string
}

/** Applies prospect pack chrome on the demo app (client vanillaize + CSS vars). */
export function BrandPackShell({
  brand,
  slug,
  cmsBrand,
  children,
}: {
  brand: TrialBrand | null
  slug: string
  cmsBrand?: CmsBrandClientOverride | null
  children: ReactNode
}) {
  useEffect(() => {
    const base: PublicBrandFace = brand
      ? brandFaceFromTrial(brand)
      : DEMO_BRAND

    const face: PublicBrandFace = {
      ...base,
      ...(cmsBrand?.logoUrl ? { logoPath: cmsBrand.logoUrl } : {}),
      ...(cmsBrand?.ptoName
        ? { pto: cmsBrand.ptoName, short: cmsBrand.ptoName.replace(/\s+PTO$/i, ' PTO') || cmsBrand.ptoName }
        : {}),
      ...(cmsBrand?.schoolName ? { school: cmsBrand.schoolName } : {}),
      ...(cmsBrand?.cheer ? { cheer: cmsBrand.cheer } : {}),
    }

    const hasCmsFace =
      Boolean(cmsBrand?.logoUrl || cmsBrand?.ptoName || cmsBrand?.schoolName || cmsBrand?.cheer)
    if (brand || hasCmsFace) {
      setClientBrandFace(face)
    } else {
      setClientBrandFace(null)
    }

    const root = document.documentElement
    root.dataset.pto = slug || 'riverside'
    const colors = {
      primary: cmsBrand?.colors?.primary || brand?.colors?.primary,
      dark: cmsBrand?.colors?.dark || brand?.colors?.dark,
      accent: cmsBrand?.colors?.accent || brand?.colors?.accent,
      warm: cmsBrand?.colors?.warm || brand?.colors?.warm,
      soft: cmsBrand?.colors?.soft || brand?.colors?.soft,
    }
    if (colors.primary) root.style.setProperty('--brand-green', colors.primary)
    if (colors.dark) root.style.setProperty('--brand-dark', colors.dark)
    if (colors.accent) root.style.setProperty('--brand-accent', colors.accent)
    if (colors.warm) root.style.setProperty('--brand-warm', colors.warm)
    if (colors.soft) root.style.setProperty('--brand-soft', colors.soft)
    if (cmsBrand?.fontSans) {
      root.style.setProperty('--font-sans-override', cmsBrand.fontSans)
      root.style.fontFamily = cmsBrand.fontSans
    }

    return () => {
      setClientBrandFace(null)
    }
  }, [brand, slug, cmsBrand])

  return <>{children}</>
}
