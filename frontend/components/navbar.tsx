import { getTopNavLinks } from '@/lib/api/nav'
import { publicBrandFace } from '@/lib/demo/brand'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { NavbarClient } from './navbar-client'

export async function Navbar() {
  const links = await getTopNavLinks()
  const { getActiveBrandPack } = await import('@/lib/crm/active-trial-server')
  const { brandFaceFromTrial } = await import('@/lib/demo/brand')
  const pack = await getActiveBrandPack()
  const brand = pack ? brandFaceFromTrial(pack.brand) : publicBrandFace()
  const { isDemoRequestSurface } = await import('@/lib/crm/product-surface-server')
  const demoSurface = await isDemoRequestSurface()
  const mode = demoSurface ? 'demo' : isCommonsPlatform() ? 'commons' : 'stone-hill'
  return (
    <NavbarClient
      links={links}
      brand={{
        school: brand.school,
        short: brand.short,
        pto: brand.pto,
        cheer: brand.cheer,
        logoPath: brand.logoPath,
      }}
      mode={mode}
    />
  )
}
