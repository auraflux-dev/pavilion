/**
 * Fundraising CTAs. "How Can You Contribute?" cards on /fundraising.
 * Admins manage in: Wix Dashboard → Content Manager → Fundraising CTAs
 */

import { isCmsQaItem } from '@/lib/cms/is-cms-qa-item'
import { humanizePublicCopy } from '@/lib/copy/humanize-public-copy'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { publicBrandFace } from '@/lib/demo/brand'
import { isDemoInstance } from '@/lib/demo/instance'
import { MEMBERSHIP_CHOOSE_PATH } from '@/lib/membership-links'

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
    href: MEMBERSHIP_CHOOSE_PATH,
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
    href: MEMBERSHIP_CHOOSE_PATH,
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
    href: 'https://bestrunners.org/register/signup?ref=SHMS',
    icon: 'Ticket',
    sortOrder: 5,
    active: true,
  },
]

/** Pavilion / trial: brand-native cards. No Run for Charity (SHMS-only). */
function pavilionCtas(): FundraisingCTA[] {
  const b = publicBrandFace()
  return [
    {
      id: 'd1',
      title: 'Become a Member',
      description: `Join for $40 or $75. Membership keeps ${b.school} programs and events funded.`,
      ctaLabel: 'Join',
      href: MEMBERSHIP_CHOOSE_PATH,
      icon: 'Star',
      sortOrder: 1,
      active: true,
    },
    {
      id: 'd2',
      title: `Load a ${b.card}`,
      description: `Add $20 to $50 onto a ${b.card}. Kids spend at ${b.store}. The PTO keeps the margin.`,
      ctaLabel: 'Load Card',
      href: b.store === 'The Perch' ? '/perch' : MEMBERSHIP_CHOOSE_PATH,
      icon: 'ShoppingBag',
      sortOrder: 2,
      active: true,
    },
    {
      id: 'd3',
      title: 'Volunteer',
      description: `Take a shift at ${b.store} or help at a school night.`,
      ctaLabel: 'Sign Up',
      href: '/volunteer',
      icon: 'Users',
      sortOrder: 3,
      active: true,
    },
    {
      id: 'd4',
      title: 'Spread the Word',
      description: `Invite another ${b.short} family. More members means more enrichment.`,
      ctaLabel: 'Share',
      href: MEMBERSHIP_CHOOSE_PATH,
      icon: 'Heart',
      sortOrder: 4,
      active: true,
    },
    {
      id: 'd5',
      title: 'Make a Gift',
      description: `One-time gifts fund classroom extras and community nights at ${b.school}.`,
      ctaLabel: 'Donate',
      href: '/fundraising#donate',
      icon: 'Ticket',
      sortOrder: 5,
      active: true,
    },
  ]
}

export async function getFundraisingCTAs(): Promise<FundraisingCTA[]> {
  if (isDemoInstance() || isCommonsPlatform()) return pavilionCtas()

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
