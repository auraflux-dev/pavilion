import type { StaffWorkspace } from '@/lib/audience'
import { isDemoInstance, isPublicDemoInstance } from '@/lib/demo/instance'

/** Staff workspaces that look like live SHMS money, mail, or POS. Hidden on the sample demo. */
export const COMMONS_DEMO_HIDDEN_WORKSPACES: StaffWorkspace[] = [
  'inbox',
  'calendar',
  'docs',
  'payments',
  'retail',
  'discounts',
  'newsletter',
  'canva',
  'timesheets',
  'social',
]

/** Hidden on Commons trial/platform until Square OAuth is connected. */
export const COMMONS_COMMERCE_GATED_WORKSPACES: StaffWorkspace[] = [
  'payments',
  'retail',
  'discounts',
  'budget',
  'timesheets',
]

/** Paths that must 404 or stay stubbed on the sample demo (not a trial tenant). */
export const COMMONS_DEMO_HIDDEN_PATHS = [
  '/staff/in-person',
  '/api/staff/terminal',
  '/api/gift-card',
  '/api/checkout/pay',
  '/api/checkout/paypal',
  '/api/wix-auth-proxy',
  '/api/webhooks/square',
  '/api/webhooks/cheddarup',
  '/api/webhooks/wix-orders',
]

export const COMMONS_DEMO_ALLOWED_STAFF_GET = [
  '/api/staff/me',
  '/api/staff/onboarding',
  '/api/staff/site-settings',
  '/api/staff/page-content',
  '/api/staff/page-sections',
  '/api/staff/site-brand',
  '/api/staff/cms-media/upload',
  '/api/staff/activity',
  '/api/commons/surface',
  '/api/commons/trial/status',
  '/api/commons/domain',
  '/api/commons/sync-status',
]

export function isDemoSurface(): boolean {
  return isPublicDemoInstance() || isDemoInstance()
}

/** @deprecated Prefer useLiveCommerceGate() in client components. */
export function hideLiveCommerceUi(): boolean {
  return isDemoSurface()
}

export function filterSurfaceWorkspaces(ids: StaffWorkspace[]): StaffWorkspace[] {
  return [...new Set(ids)]
}

export function filterCommonsDemoWorkspaces(ids: StaffWorkspace[]): StaffWorkspace[] {
  if (!isDemoSurface()) return ids
  const hidden = new Set(COMMONS_DEMO_HIDDEN_WORKSPACES)
  return ids.filter((id) => !hidden.has(id))
}

export function filterHiddenStaffWorkspaces(
  ids: StaffWorkspace[],
  extraHidden: StaffWorkspace[],
): StaffWorkspace[] {
  const hidden = new Set(extraHidden)
  return ids.filter((id) => !hidden.has(id))
}

export function isCommonsDemoHiddenPath(pathname: string): boolean {
  return COMMONS_DEMO_HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}
