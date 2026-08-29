/**
 * Resolve CMS site brand for layout (demo/trial page builder only).
 */
import 'server-only'
import { cmsPageBuilderEnabled } from '@/lib/cms/page-builder-flag'
import type { CmsSiteBrand } from '@/lib/cms/store'

export type LayoutBrandOverride = {
  cssVars: Record<string, string>
  logoUrl: string
  faviconUrl: string
  fontSans: string
  fontDisplay: string
  ptoName: string
  schoolName: string
  cheer: string
}

export async function resolveCmsLayoutBrand(): Promise<LayoutBrandOverride | null> {
  if (!cmsPageBuilderEnabled()) return null
  try {
    const { ensureCommonsReady } = await import('@/lib/crm/migrate')
    await ensureCommonsReady()
    const { resolveCmsOrganizationId, getCmsSiteBrand } = await import('@/lib/cms/store')
    const orgId = await resolveCmsOrganizationId()
    if (!orgId) return null
    const brand = await getCmsSiteBrand(orgId)
    if (!brand) return null
    return brandToLayoutOverride(brand)
  } catch {
    return null
  }
}

function brandToLayoutOverride(brand: CmsSiteBrand): LayoutBrandOverride | null {
  const hasAny =
    brand.logoUrl ||
    brand.faviconUrl ||
    brand.colorPrimary ||
    brand.colorDark ||
    brand.colorAccent ||
    brand.colorWarm ||
    brand.colorSoft ||
    brand.fontSans ||
    brand.fontDisplay ||
    brand.ptoName ||
    brand.schoolName ||
    brand.cheer
  if (!hasAny) return null

  const cssVars: Record<string, string> = {}
  if (brand.colorPrimary) cssVars['--brand-green'] = brand.colorPrimary
  if (brand.colorDark) cssVars['--brand-dark'] = brand.colorDark
  if (brand.colorAccent) cssVars['--brand-accent'] = brand.colorAccent
  if (brand.colorWarm) cssVars['--brand-warm'] = brand.colorWarm
  if (brand.colorSoft) cssVars['--brand-soft'] = brand.colorSoft
  if (brand.fontSans) cssVars['--font-sans-override'] = brand.fontSans
  if (brand.fontDisplay) cssVars['--font-display-override'] = brand.fontDisplay

  return {
    cssVars,
    logoUrl: brand.logoUrl,
    faviconUrl: brand.faviconUrl,
    fontSans: brand.fontSans,
    fontDisplay: brand.fontDisplay,
    ptoName: brand.ptoName,
    schoolName: brand.schoolName,
    cheer: brand.cheer,
  }
}
