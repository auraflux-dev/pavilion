import { getTopNavLinks } from '@/lib/api/nav'
import { NavbarClient } from './navbar-client'

export async function Navbar() {
  const links = await getTopNavLinks()
  return <NavbarClient links={links} />
}
