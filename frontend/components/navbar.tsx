import { getTopNavLinks } from '@/lib/api/nav'
import { NavbarClient } from './navbar-client'
import { PortalReturnBar } from '@/components/portal-return-bar'

export async function Navbar() {
  const links = await getTopNavLinks()
  return (
    <>
      <NavbarClient links={links} />
      {/* Logged-in members: escape hatch back to portal on every public page */}
      <PortalReturnBar />
    </>
  )
}
