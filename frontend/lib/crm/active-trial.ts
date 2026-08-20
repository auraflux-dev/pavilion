import { trialPackForSlug, type TrialBrand, type TrialPack } from '@/lib/crm/trial-packs'

export function isCommonsPlatform(): boolean {
  return (
    process.env.COMMONS_PLATFORM === 'true' ||
    process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true'
  )
}

export function activeTrialPackSlug(): string {
  return (
    process.env.COMMONS_TRIAL_PACK ||
    process.env.NEXT_PUBLIC_COMMONS_TRIAL_PACK ||
    ''
  ).trim()
}

export function getActiveTrialPack(): TrialPack | null {
  if (!isCommonsPlatform()) return null
  const slug = activeTrialPackSlug()
  return slug ? trialPackForSlug(slug) : null
}

/** Chrome / metadata brand for the active private trial (null off platform). */
export function getActiveTrialBrand(): TrialBrand | null {
  return getActiveTrialPack()?.brand ?? null
}
