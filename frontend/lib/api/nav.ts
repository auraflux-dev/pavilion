/**
 * Navigation links. fetched from Wix CMS NavLinks collection.
 * Admins manage in: Wix Dashboard → Content Manager → Navigation Links
 *
 * Admins can rename labels, reorder, and toggle visibility.
 * hrefs are internal paths only (e.g. /programs). no external URLs.
 */

import { MEMBERSHIP_CHOOSE_PATH } from '@/lib/membership-links'
import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { demoStorePath, vanillaizeIfDemo } from '@/lib/demo/brand'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { isDemoProductHost } from '@/lib/crm/product-host'
import { requestHost } from '@/lib/crm/product-surface-server'
import { fetchWithRetry } from '@/lib/fetch-with-retry'
import { canViewProgramsCatalogNow } from '@/lib/programs/public-access'

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
    const res = await fetchWithRetry('https://www.wixapis.com/wix-data/v2/items/query', {
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
 return (data.dataItems ?? [])
 .map((item: WixDataItem) => ({
 id: item.id ?? '',
 label: item.data?.label ?? '',
 href: item.data?.href ?? '/',
 sortOrder: item.data?.sortOrder ?? 99,
 showInNav: item.data?.showInNav ?? true,
 showInFooter: item.data?.showInFooter ?? false,
 active: item.data?.active ?? true,
 }))
 .filter((link: NavLink) => link.label && !isCmsQaItem(link.label, link.href))
 } catch {
 return []
 }
}

// Fallback used if CMS is unreachable. site still navigable
const FALLBACK_NAV: NavLink[] = [
 { id: 'f0', label: 'Home', href: '/', sortOrder: 0, showInNav: true, showInFooter: true, active: true },
  { id: 'f1', label: 'Programs', href: '/programs', sortOrder: 1, showInNav: true, showInFooter: true, active: true },
  { id: 'f2', label: 'Events', href: '/events', sortOrder: 2, showInNav: true, showInFooter: true, active: true },
  { id: 'f7', label: 'Membership', href: '/membership', sortOrder: 3, showInNav: true, showInFooter: true, active: true },
  { id: 'f4', label: 'The Cove', href: '/cove', sortOrder: 4, showInNav: true, showInFooter: true, active: true },
  { id: 'f6', label: 'Volunteer', href: '/volunteer', sortOrder: 5, showInNav: true, showInFooter: true, active: true },
  { id: 'f3', label: 'Fundraising', href: '/fundraising', sortOrder: 6, showInNav: true, showInFooter: true, active: true },
  { id: 'f8', label: 'Board', href: '/board', sortOrder: 7, showInNav: true, showInFooter: true, active: true },
  { id: 'f10', label: 'Meetings', href: '/meetings', sortOrder: 8, showInNav: true, showInFooter: true, active: true },
  { id: 'f9', label: 'Become a member', href: MEMBERSHIP_CHOOSE_PATH, sortOrder: 9, showInNav: false, showInFooter: true, active: true },
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
 label: isDemoInstance() ? DEMO_BRAND.store : 'The Cove',
    href: demoStorePath(),
 sortOrder: Math.min(...commerce.map((l) => l.sortOrder)),
 showInNav: commerce.some((l) => l.showInNav),
 showInFooter: commerce.some((l) => l.showInFooter),
 active: true,
 }
 return [...rest, cove].sort((a, b) => a.sortOrder - b.sortOrder)
}

function ensureHomeLink(links: NavLink[]): NavLink[] {
 if (links.some((l) => l.href === '/' || l.label.toLowerCase() === 'home')) {
 return links
 .map((l) =>
 l.href === '/' || l.label.toLowerCase() === 'home'
 ? { ...l, label: 'Home', href: '/', showInNav: true, active: true, sortOrder: Math.min(0, l.sortOrder) }
 : l,
 )
 .sort((a, b) => a.sortOrder - b.sortOrder)
 }
 return [
 {
 id: 'home',
 label: 'Home',
 href: '/',
 sortOrder: 0,
 showInNav: true,
 showInFooter: true,
 active: true,
 },
 ...links,
 ].sort((a, b) => a.sortOrder - b.sortOrder)
}

async function servingDemoNav(): Promise<boolean> {
  const host = await requestHost()
  if (host) return isDemoProductHost(host)
  const { isDemoInstance } = await import('@/lib/demo/instance')
  return isDemoInstance()
}

export async function getNavLinks(): Promise<NavLink[]> {
 const { getActiveTrialPack } = await import('@/lib/crm/active-trial')
 const brandPack = getActiveTrialPack()
 if (brandPack?.nav?.length) return brandPack.nav.map((l) => ({ ...l }))

 try {
   const { pavilionCmsEnabled, resolveCmsOrganizationId, listCmsNavLinks } =
     await import('@/lib/cms/store')
   if (pavilionCmsEnabled()) {
     const orgId = await resolveCmsOrganizationId()
     if (orgId) {
       const cmsNav = await listCmsNavLinks(orgId, true)
       if (cmsNav.length) {
         const links = ensureHomeLink(
           normalizeCommerceNav(
             cmsNav.filter((link) => !isCmsQaItem(link.label, link.href)),
           ),
         )
         return links.map((l) => ({ ...l, label: vanillaizeIfDemo(l.label) }))
       }
     }
   }
 } catch {
   // fall through
 }

 if (await servingDemoNav()) {
   const { DEMO_NAV } = await import('@/lib/demo/content')
   return DEMO_NAV.map((l) => ({ ...l }))
 }
 const raw = await fetchNavLinks()
 // Always use CMS active links; home sections still gate Programs/Events via schoolInSession.
 const links = ensureHomeLink(normalizeCommerceNav(raw.length > 0 ? raw : FALLBACK_NAV))
 return links.map((l) => ({ ...l, label: vanillaizeIfDemo(l.label) }))
}

async function hideProgramsNavWhileDark(links: NavLink[]): Promise<NavLink[]> {
  const access = await canViewProgramsCatalogNow()
  // Parents: hide until unlock. Staff/preview: keep Programs in nav for dry runs.
  if (access.allowed) return links
  return links.filter((l) => {
    const href = String(l.href ?? '').split('?')[0].replace(/\/$/, '') || '/'
    return href !== '/programs' && !href.startsWith('/programs/')
  })
}

export async function getTopNavLinks(): Promise<NavLink[]> {
 const links = await getNavLinks()
 return hideProgramsNavWhileDark(links.filter(l => l.showInNav))
}

export async function getFooterLinks(): Promise<NavLink[]> {
 const links = await getNavLinks()
 return hideProgramsNavWhileDark(links.filter(l => l.showInFooter))
}
