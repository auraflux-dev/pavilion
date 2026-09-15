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
  | 'blog'
  | 'seo'
  | 'strategy'
  | 'diagnostics'
  | 'social-growth'
  | 'ads'
  | 'health'
  | 'help'

export const PLATFORM_WORKSPACE_IDS: PlatformWorkspace[] = [
  'home',
  'tenants',
  'tenant',
  'modules',
  'onboarding',
  'support',
  'blog',
  'seo',
  'strategy',
  'diagnostics',
  'social-growth',
  'ads',
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
  blog: 'Blog',
  seo: 'SEO',
  strategy: 'Brand',
  diagnostics: 'Diagnostics',
  'social-growth': 'Social',
  ads: 'Ads',
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
    workspaces: ['tenants', 'modules', 'onboarding', 'support', 'blog'],
  },
  {
    id: 'grow',
    label: 'Marketing tools',
    blurb: 'SEO and brand strategy for the company host. Social and Ads later.',
    workspaces: ['seo', 'strategy', 'blog', 'social-growth', 'ads'],
  },
  {
    id: 'ops',
    label: 'Ops',
    blurb: 'Deploy, connectors, and SEO/brand env probes.',
    workspaces: ['health', 'diagnostics'],
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
  blog: 'Marketing blog for this product (check Modules per customer to enable)',
  seo: 'Search Console rankings, technical crawl, content seeds',
  strategy: 'Generate, approve, and export brand-guidelines.md',
  diagnostics: 'SEO and brand env probes',
  'social-growth': 'Coming soon. Direct Meta later. Approval-heavy for PTO groups.',
  ads: 'Coming soon. Not in this phase.',
  health: 'Demo deploy and connector summary',
  help: 'Platform knowledge base',
}

export function parsePlatformWorkspace(raw: string | null): PlatformWorkspace | null {
  if (!raw) return null
  return (PLATFORM_WORKSPACE_IDS as string[]).includes(raw) ? (raw as PlatformWorkspace) : null
}
