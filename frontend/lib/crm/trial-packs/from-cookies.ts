import { cookies } from 'next/headers'
import { trialPackForSlug, type TrialPack } from '@/lib/crm/trial-packs'

export const COMMONS_TRIAL_SLUG_COOKIE = 'commons_trial_slug'

export async function loadTrialPackFromCookies(): Promise<TrialPack | null> {
  if (process.env.COMMONS_PLATFORM !== 'true') return null
  try {
    const jar = await cookies()
    const slug = jar.get(COMMONS_TRIAL_SLUG_COOKIE)?.value || ''
    return trialPackForSlug(slug)
  } catch {
    return null
  }
}
