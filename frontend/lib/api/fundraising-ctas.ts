/**
 * Fundraising CTAs. "How Can You Contribute?" cards on /fundraising.
 * Admins manage in: Wix Dashboard → Content Manager → Fundraising CTAs
 */

import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { humanizePublicCopy } from '@/lib/copy/humanize-public-copy'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'

export interface FundraisingCTA {
  id: string
  title: string
  description: string
  ctaLabel: string
  href: string
  icon: string
  sortOrder: number
  active: boolean
}

interface WixDataItem {
  id?: string
  data?: {
    title?: string
    description?: string
    ctaLabel?: string
    href?: string
    icon?: string
    sortOrder?: number
    active?: boolean
  }
}

/** Stone Hill defaults when CMS is empty. */
const FALLBACK_CTAS: FundraisingCTA[] = [
  {
    id: 'f1',
    title: 'Become a Member',
    description:
      'Join for $50 or $100. The single biggest thing you can do for SHMS PTO students.',
    ctaLabel: 'Join',
    href: '/membership',
    icon: 'Star',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'f2',
    title: 'Load the Cove Digital Card',
    description:
      'Load $20 to $50 onto your family Cove Digital Card. They spend, PTO earns.',
    ctaLabel: 'Load Card',
    href: '/cove',
    icon: 'ShoppingBag',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'f3',
    title: 'Volunteer',
    description: 'Give an hour at the store window or help at an event.',
    ctaLabel: 'Sign Up',
    href: '/volunteer',
    icon: 'Users',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'f4',
    title: 'Spread the Word',
    description: 'Tell other SHMS PTO families. More members means more programs.',
    ctaLabel: 'Share',
    href: '/membership',
    icon: 'Heart',
    sortOrder: 4,
    active: true,
  },
  {
    id: 'f5',
    title: 'Run for Charity (school code SHMS)',
    description:
      'Best Runners 1K & 5K on Sep 13 at Rock Ridge. Adults $30. Kids $20. Use code SHMS so Stone Hill receives 100% of your registration fee.',
    ctaLabel: 'Register with code SHMS',
    href: '/events/run-for-charity-1k-5k-best-runners-code-shms#register',
    icon: 'Ticket',
    sortOrder: 5,
    active: true,
  },
]

/** Pavilion demo: Riverside-native cards. Not a string-replaced SHMS list. */
const DEMO_CTAS: FundraisingCTA[] = [
  {
    id: 'd1',
    title: 'Become a Member',
    description: `Join for $40 or $75. Membership keeps ${DEMO_BRAND.school} programs and events funded.`,
    ctaLabel: 'Join',
    href: '/membership',
    icon: 'Star',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'd2',
    title: `Load a ${DEMO_BRAND.card}`,
    description: `Add $20 to $50 to your family ${DEMO_BRAND.card}. Kids spend at ${DEMO_BRAND.store}. The PTO keeps the margin.`,
    ctaLabel: 'Load Card',
    href: '/perch',
    icon: 'ShoppingBag',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'd3',
    title: 'Volunteer',
    description: `Take a shift at ${DEMO_BRAND.store} or help at a school night.`,
    ctaLabel: 'Sign Up',
    href: '/volunteer',
    icon: 'Users',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'd4',
    title: 'Spread the Word',
    description: `Invite another ${DEMO_BRAND.short} family. More members means more enrichment.`,
    ctaLabel: 'Share',
    href: '/membership',
    icon: 'Heart',
    sortOrder: 4,
    active: true,
  },
  {
    id: 'd5',
    title: 'Make a Gift',
    description: `One-time gifts fund classroom extras and community nights at ${DEMO_BRAND.school}.`,
    ctaLabel: 'Donate',
    href: '/fundraising#donate',
    icon: 'Ticket',
    sortOrder: 5,
    active: true,
  },
]

export async function getFundraisingCTAs(): Promise<FundraisingCTA[]> {
  if (isDemoInstance()) return DEMO_CTAS

  const apiKey = process.env.WIX_API_KEY
  const siteId = process.env.WIX_SITE_ID
  if (!apiKey || !siteId) return FALLBACK_CTAS

  try {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        'wix-site-id': siteId,
      },
      body: JSON.stringify({
        dataCollectionId: 'FundraisingCTAs',
        query: {
          filter: { active: { $eq: true } },
          sort: [{ fieldName: 'sortOrder', order: 'ASC' }],
          paging: { limit: 20 },
        },
      }),
      next: { revalidate: 300 },
    })

    if (!res.ok) return FALLBACK_CTAS

    const data = await res.json()
    const items = (data.dataItems ?? [])
      .map((item: WixDataItem) => ({
        id: item.id ?? '',
        title: humanizePublicCopy(String(item.data?.title ?? '').trim()),
        description: humanizePublicCopy(item.data?.description ?? ''),
        ctaLabel: humanizePublicCopy(item.data?.ctaLabel ?? 'Learn More'),
        href: item.data?.href ?? '/',
        icon: item.data?.icon ?? 'Star',
        sortOrder: item.data?.sortOrder ?? 99,
        active: item.data?.active ?? true,
      }))
      .filter(
        (item: FundraisingCTA) =>
          item.title &&
          !isCmsQaItem(item.title, item.description, item.ctaLabel, item.href),
      )

    return items.length > 0 ? items : FALLBACK_CTAS
  } catch {
    return FALLBACK_CTAS
  }
}
