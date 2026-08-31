/**
 * Pavilion demo / tour URLs for marketing and sales.
 * Public browse needs no code. /review is for staff + member portal depth.
 */

import { PAVILION_DEMO_HOST } from '@/lib/crm/product-host'

const DEMO_ORIGIN =
  (process.env.NEXT_PUBLIC_PAVILION_DEMO_ORIGIN || `https://${PAVILION_DEMO_HOST}`).replace(
    /\/$/,
    '',
  )

/** Always-on public demo (visitor pages, no review gate). */
export const PAVILION_DEMO_URL = DEMO_ORIGIN

/** Review join page (user enters code, or sales pre-fills ?code=). */
export const PAVILION_DEMO_REVIEW_URL = `${DEMO_ORIGIN}/review`

export function pavilionDemoTourUrl(opts?: {
  code?: string
  brand?: string
}): string {
  const url = new URL(`${DEMO_ORIGIN}/review`)
  const code = opts?.code?.trim()
  const brand = opts?.brand?.trim()
  if (code) url.searchParams.set('code', code)
  if (brand) url.searchParams.set('brand', brand)
  return url.toString()
}

export function pavilionTrialUrl(slug: string): string {
  const suffix =
    process.env.NEXT_PUBLIC_PAVILION_TRIAL_DOMAIN_SUFFIX ||
    process.env.NEXT_PUBLIC_COMMONS_TEMP_DOMAIN_SUFFIX ||
    'onpavilion.com'
  return `https://${slug.trim().toLowerCase()}.${suffix.replace(/^\./, '')}`
}
