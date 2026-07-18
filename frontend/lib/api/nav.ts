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

// Fallback used if CMS is unreachable — site still navigable
const FALLBACK_NAV: NavLink[] = [
  { id: 'f1', label: 'Programs', href: '/programs', sortOrder: 1, showInNav: true, showInFooter: true, active: true },
  { id: 'f2', label: 'Events', href: '/events', sortOrder: 2, showInNav: true, showInFooter: true, active: true },
  { id: 'f7', label: 'Membership', href: '/membership', sortOrder: 3, showInNav: true, showInFooter: true, active: true },
  { id: 'f4', label: 'Store', href: '/store', sortOrder: 4, showInNav: true, showInFooter: true, active: true },
  { id: 'f6', label: 'Volunteer', href: '/volunteer', sortOrder: 5, showInNav: true, showInFooter: true, active: true },
  // Footer / More — kept off the top bar to reduce clutter
  { id: 'f3', label: 'Fundraising', href: '/fundraising', sortOrder: 6, showInNav: false, showInFooter: true, active: true },
  { id: 'f5', label: 'Spirit Wear', href: '/spirit-wear', sortOrder: 7, showInNav: false, showInFooter: true, active: true },
  { id: 'f8', label: 'Board', href: '/board', sortOrder: 8, showInNav: false, showInFooter: true, active: true },
  { id: 'f10', label: 'Meetings', href: '/meetings', sortOrder: 9, showInNav: false, showInFooter: true, active: true },
  { id: 'f9', label: 'Parent Login', href: '/auth/login', sortOrder: 10, showInNav: false, showInFooter: true, active: true },
]

export async function getNavLinks(): Promise<NavLink[]> {
  const links = await fetchNavLinks()
  return links.length > 0 ? links : FALLBACK_NAV
}

export async function getTopNavLinks(): Promise<NavLink[]> {
  const links = await getNavLinks()
  return links.filter(l => l.showInNav)
}

export async function getFooterLinks(): Promise<NavLink[]> {
  const links = await getNavLinks()
  return links.filter(l => l.showInFooter)
}
