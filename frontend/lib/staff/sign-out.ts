/**
 * Staff sign-out for Pavilion / Brand Staff.
 * Demo and commons platform must not depend on Wix logout URLs.
 */
import { clearAuthCache } from '@/lib/hooks/use-auth'
import { isDemoProductHost } from '@/lib/crm/product-host'

export async function staffSignOut(opts?: { returnTo?: string }): Promise<void> {
  clearAuthCache()
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    /* still leave the page */
  }

  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const demoOrPlatform =
    isDemoProductHost(host) ||
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_PAVILION_PLATFORM === 'true'

  if (demoOrPlatform) {
    window.location.href = opts?.returnTo || '/review'
    return
  }

  try {
    const { createVisitorClient } = await import('@/lib/wix-oauth-client')
    const client = createVisitorClient()
    const { logoutUrl } = await client.auth.logout(window.location.origin + '/')
    window.location.href = logoutUrl || '/'
  } catch {
    window.location.href = '/'
  }
}
