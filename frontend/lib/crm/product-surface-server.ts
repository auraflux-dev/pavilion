import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import {
  isDemoProductHost,
  isTrialVanityHost,
  normalizeProductHost,
  PAVILION_SURFACE_HEADER,
  type ProductSurface,
} from '@/lib/crm/product-host'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'

export { PAVILION_SURFACE_HEADER }

function hostFromHeaders(h: Headers): string {
  return normalizeProductHost(
    h.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      h.get('host')?.trim() ||
      '',
  )
}

/** Per-request surface from middleware header or Host. */
export const resolveRequestSurface = cache(async (): Promise<ProductSurface> => {
  const h = await headers()
  const injected = h.get(PAVILION_SURFACE_HEADER)
  if (injected === 'demo' || injected === 'trial' || injected === 'shared' || injected === 'other') {
    return injected
  }
  const host = hostFromHeaders(h)
  if (isDemoProductHost(host)) return 'demo'
  if (isTrialVanityHost(host)) return 'trial'
  if (!host) {
    if (
      (process.env.DEMO_INSTANCE === 'true' || process.env.NEXT_PUBLIC_DEMO_INSTANCE === 'true') &&
      !isPavilionProductPlatform()
    ) {
      return 'demo'
    }
    if (isPavilionProductPlatform()) return 'shared'
  }
  return 'other'
})

export async function isDemoRequestSurface(): Promise<boolean> {
  return (await resolveRequestSurface()) === 'demo'
}

export async function isTrialRequestSurface(): Promise<boolean> {
  return (await resolveRequestSurface()) === 'trial'
}

export async function requestHost(): Promise<string> {
  const h = await headers()
  return hostFromHeaders(h)
}
