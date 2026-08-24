/**
 * Catalog of PageContent.page keys and string override keys by surface.
 * Staff → Page CSS & strings uses this list. Code defaults remain the fallback.
 */

import { HOME_STRING_DEFAULTS, PORTAL_NOTICE_DEFAULTS } from '@/lib/defaults/site-string-defaults'

export type SiteStringSurface = 'visitor' | 'member' | 'staff' | 'legal'

export type SitePageThemeEntry = {
  page: string
  surface: SiteStringSurface
  /** Public route or staff workspace hint */
  route: string
  /** What the standard PageContent fields control */
  fields: string
  /** Example string override keys (key|text in stringOverrides) */
  stringKeys?: string[]
}

/** Every PageContent row that can carry customCss + stringOverrides. */
export const SITE_PAGE_THEME_REGISTRY: SitePageThemeEntry[] = [
  { page: 'home', surface: 'visitor', route: '/', fields: 'hero title/body', stringKeys: ['video.eyebrow', 'video.title', 'video.body'] },
  { page: 'home-volunteer', surface: 'visitor', route: '/', fields: 'volunteer block' },
  { page: 'home-community', surface: 'visitor', route: '/', fields: 'community strip' },
  { page: 'membership', surface: 'visitor', route: '/membership', fields: 'hero + section copy' },
  { page: 'programs', surface: 'visitor', route: '/programs', fields: 'catalog hero' },
  { page: 'events', surface: 'visitor', route: '/events', fields: 'events hero' },
  { page: 'volunteer', surface: 'visitor', route: '/volunteer', fields: 'volunteer hero' },
  { page: 'board', surface: 'visitor', route: '/board', fields: 'board hero' },
  { page: 'contact', surface: 'visitor', route: '/contact', fields: 'contact hero' },
  { page: 'meetings', surface: 'visitor', route: '/meetings', fields: 'meetings hero' },
  { page: 'newsletter', surface: 'visitor', route: '/newsletter', fields: 'newsletter hero' },
  { page: 'fundraising', surface: 'visitor', route: '/fundraising', fields: 'fundraising hero' },
  { page: 'store', surface: 'visitor', route: '/cove', fields: 'Cove store hero' },
  { page: 'store-how', surface: 'visitor', route: '/cove', fields: 'how it works' },
  { page: 'store-cta', surface: 'visitor', route: '/cove', fields: 'store CTA strip' },
  { page: 'spirit-wear', surface: 'visitor', route: '/cove/spirit-wear', fields: 'spirit wear hero' },
  { page: 'home-strings', surface: 'visitor', route: '/', fields: 'video + donate promos', stringKeys: Object.keys(HOME_STRING_DEFAULTS) },
  { page: 'portal-notices', surface: 'member', route: '/member-portal', fields: 'banners and loading hints', stringKeys: Object.keys(PORTAL_NOTICE_DEFAULTS) },
  { page: 'member-portal', surface: 'member', route: '/member-portal', fields: 'portal hero' },
  {
    page: 'portal',
    surface: 'member',
    route: '/member-portal',
    fields: 'free/paid account blurbs',
    stringKeys: ['paidTitle', 'paidBody', 'freeTitle', 'freeBody'],
  },
  {
    page: 'portal-hub',
    surface: 'member',
    route: '/member-portal',
    fields: 'quadrant titles, tabs, CTAs (~40 keys)',
    stringKeys: ['studentsTitle', 'calendarTitle', 'addStudentCta', 'refresh'],
  },
  { page: 'portal-help', surface: 'member', route: '/member-portal/help', fields: 'FAQ accordion (question|answer bullets)' },
  {
    page: 'staff-portal',
    surface: 'staff',
    route: '/staff',
    fields: 'staff shell chrome',
    stringKeys: ['home.title', 'content.label', 'help.title'],
  },
]

export function registryPagesForSurface(surface: SiteStringSurface | 'all'): SitePageThemeEntry[] {
  if (surface === 'all') return SITE_PAGE_THEME_REGISTRY
  return SITE_PAGE_THEME_REGISTRY.filter((e) => e.surface === surface)
}
