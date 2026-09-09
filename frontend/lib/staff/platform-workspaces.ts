/**
 * Platform Staff workspaces (fleet). Same shell as Client Staff, different catalog.
 */
export type PlatformWorkspace =
  | 'home'
  | 'tenants'
  | 'tenant'
  | 'modules'
  | 'onboarding'
  | 'support'
  | 'health'
  | 'help'

export const PLATFORM_WORKSPACE_IDS: PlatformWorkspace[] = [
  'home',
  'tenants',
  'tenant',
  'modules',
  'onboarding',
  'support',
  'health',
  'help',
]

export const PLATFORM_WORKSPACE_LABEL: Record<PlatformWorkspace, string> = {
  home: 'Home',
  tenants: 'Tenants',
  tenant: 'Tenant',
  modules: 'Modules',
  onboarding: 'Onboarding',
  support: 'Support',
  health: 'Health',
  help: 'Help',
}

export type PlatformWorkspaceGroup = {
  id: string
  label: string
  blurb: string
  workspaces: PlatformWorkspace[]
}

export const PLATFORM_WORKSPACE_GROUPS: PlatformWorkspaceGroup[] = [
  {
    id: 'fleet',
    label: 'Fleet',
    blurb: 'Tenants, go-live, and day-to-day platform work.',
    workspaces: ['tenants', 'modules', 'onboarding', 'support'],
  },
  {
    id: 'ops',
    label: 'Ops',
    blurb: 'Deploy and connector health.',
    workspaces: ['health'],
  },
  {
    id: 'help',
    label: 'Help',
    blurb: 'How Platform Staff serves schools.',
    workspaces: ['help'],
  },
]

export const PLATFORM_WORKSPACE_BLURB: Partial<Record<PlatformWorkspace, string>> = {
  tenants: 'Search trials and customer orgs',
  tenant: 'One org: connectors, brand, notes',
  modules: 'Check/uncheck product modules for this org',
  onboarding: 'Sales → trial → go-live ladder',
  support: 'Cross-tenant asks (no school PII)',
  health: 'Demo deploy and connector summary',
  help: 'Platform knowledge base',
}

export function parsePlatformWorkspace(raw: string | null): PlatformWorkspace | null {
  if (!raw) return null
  return (PLATFORM_WORKSPACE_IDS as string[]).includes(raw) ? (raw as PlatformWorkspace) : null
}
