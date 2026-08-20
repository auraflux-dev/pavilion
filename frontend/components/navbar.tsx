import { getTopNavLinks } from '@/lib/api/nav'
import { publicBrandFace } from '@/lib/demo/brand'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { isDemoInstance } from '@/lib/demo/instance'
import { NavbarClient } from './navbar-client'

export async function Navbar() {
  const links = await getTopNavLinks()
  const brand = publicBrandFace()
  const mode = isDemoInstance() ? 'demo' : isCommonsPlatform() ? 'commons' : 'stone-hill'
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
