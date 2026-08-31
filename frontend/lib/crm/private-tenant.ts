/**
 * Commons platform tenants are private: site only after Better Auth login.
 * Edge-safe (no Postgres). Demo Riverside stays public.
 */
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'

/** Paths anyone may hit without a session on COMMONS_PLATFORM. */
export function isCommonsPublicPath(pathname: string): boolean {
  if (pathname === '/login' || pathname.startsWith('/login/')) return true
  if (pathname.startsWith('/api/id')) return true
  if (pathname.startsWith('/api/cron/')) return true
  // Provisioning UI + API. still require COMMONS_PROVISION_SECRET in the route.
  if (pathname === '/trial' || pathname.startsWith('/trial/')) return true
  if (pathname === '/trial-locked' || pathname.startsWith('/trial-locked/')) return true
  if (pathname === '/api/commons/trial/start') return true
  if (pathname === '/api/commons/host-status') return true
  if (pathname === '/signups' || pathname.startsWith('/signups/')) return true
  if (pathname.startsWith('/api/signups/')) return true
  return false
}

/** True when this Host is a private trial vanity (pass Host on unified stacks). */
export function commonsRequiresLogin(host?: string): boolean {
  return isCommonsPlatformHost(host)
}
