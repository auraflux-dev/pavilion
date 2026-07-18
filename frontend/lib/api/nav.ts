/**
 * Navigation links — fetched from Wix CMS NavLinks collection.
 * Admins manage in: Wix Dashboard → Content Manager → Navigation Links
 *
 * Admins can rename labels, reorder, and toggle visibility.
 * hrefs are internal paths only (e.g. /programs) — no external URLs.
 */

export interface NavLink {
  id: string
  label: string
  href: string
  sortOrder: number
  showInNav: boolean
  showInFooter: boolean
  active: boolean
}

interface WixDataItem {
  id?: string
  data?: {
    label?: string
    href?: string
    sortOrder?: number
    showInNav?: boolean
    showInFooter?: boolean
    active?: boolean
  }
}

async function fetchNavLinks(): Promise<NavLink[]> {
  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return []

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'NavLinks',
        query: {
          filter: { active: { $eq: true } },
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 30 },
        },
      }),
      next: { revalidate: 60 },
    })

    if (!res.ok) return []
    const data = await res.json()
    return (data.dataItems ?? []).map((item: WixDataItem) => ({
      id:           item.id ?? '',
      label:        item.data?.label        ?? '',
      href:         item.data?.href         ?? '/',
      sortOrder:    item.data?.sortOrder    ?? 99,
      showInNav:    item.data?.showInNav    ?? true,
      showInFooter: item.data?.showInFooter ?? false,
      active:       item.data?.active       ?? true,
    }))
  } catch {
    return []
  }
}

// Fallback used if CMS is unreachable — site still navigable (off-season defaults)
const FALLBACK_NAV: NavLink[] = [
  { id: 'f7', label: 'Membership', href: '/membership', sortOrder: 1, showInNav: true, showInFooter: true, active: true },
  { id: 'f4', label: 'The Cove', href: '/cove', sortOrder: 2, showInNav: true, showInFooter: true, active: true },
  { id: 'f6', label: 'Volunteer', href: '/volunteer', sortOrder: 3, showInNav: true, showInFooter: true, active: true },
  { id: 'f3', label: 'Fundraising', href: '/fundraising', sortOrder: 4, showInNav: false, showInFooter: true, active: true },
  { id: 'f8', label: 'Board', href: '/board', sortOrder: 5, showInNav: false, showInFooter: true, active: true },
  { id: 'f10', label: 'Meetings', href: '/meetings', sortOrder: 6, showInNav: false, showInFooter: true, active: true },
  { id: 'f9', label: 'Parent Login', href: '/auth/login', sortOrder: 7, showInNav: false, showInFooter: true, active: true },
  // In-session only (shown when schoolInSession=true)
  { id: 'f1', label: 'Programs', href: '/programs', sortOrder: 10, showInNav: true, showInFooter: true, active: true },
  { id: 'f2', label: 'Events', href: '/events', sortOrder: 11, showInNav: true, showInFooter: true, active: true },
]

function normalizeCommerceNav(links: NavLink[]): NavLink[] {
  const commerce = links.filter(
    (l) => l.href === '/store' || l.href === '/spirit-wear' || l.href === '/cove',
  )
  const rest = links.filter(
    (l) => l.href !== '/store' && l.href !== '/spirit-wear' && l.href !== '/cove',
  )
  if (commerce.length === 0) return rest

  const cove: NavLink = {
    id: commerce[0].id || 'cove',
    label: 'The Cove',
    href: '/cove',
    sortOrder: Math.min(...commerce.map((l) => l.sortOrder)),
    showInNav: commerce.some((l) => l.showInNav),
    showInFooter: commerce.some((l) => l.showInFooter),
    active: true,
  }
  return [...rest, cove].sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getNavLinks(): Promise<NavLink[]> {
  const { isSchoolInSession, OFF_SEASON_HIDDEN_PATHS } = await import('@/lib/api/visitor-season')
  const inSession = await isSchoolInSession()
  const raw = await fetchNavLinks()
  const links = normalizeCommerceNav(raw.length > 0 ? raw : FALLBACK_NAV)
  if (inSession) return links
  return links.filter((l) => !OFF_SEASON_HIDDEN_PATHS.has(l.href))
}

export async function getTopNavLinks(): Promise<NavLink[]> {
  const links = await getNavLinks()
  return links.filter(l => l.showInNav)
}

export async function getFooterLinks(): Promise<NavLink[]> {
  const links = await getNavLinks()
  return links.filter(l => l.showInFooter)
}
