import { isDemoInstance } from '@/lib/demo/instance'

export const DEMO_BRAND = {
  school: 'Riverside Elementary School',
  pto: 'Riverside Elementary PTO',
  short: 'Riverside PTO',
  mascot: 'Hawk',
  mascotPlural: 'Hawks',
  cheer: 'Go Hawks!',
  store: 'The Perch',
  card: 'Perch Card',
  cardPlural: 'Perch Cards',
  town: 'Fairhaven',
  district: 'Fairhaven Public Schools',
  host: 'riversidepto.org',
  tiers: {
    reef: 'Member',
    lagoon: 'Family',
    tide: 'Patron',
    faculty: 'Faculty',
  },
} as const

export function vanillaizeCopy(input: string): string {
  if (typeof input !== 'string' || !input) return input
  let s = input

  const protectedChunks: string[] = []
  const protect = (re: RegExp) => {
    s = s.replace(re, (m) => {
      protectedChunks.push(m)
      return `«D${protectedChunks.length - 1}»`
    })
  }

  protect(/\/shms-[a-z0-9._-]+/gi)
  protect(/shms-logo/gi)
  protect(/SHMSREEF\d+/g)
  protect(/SHMSLAGOON\d+/g)
  protect(/SHMSTIDE\d+/g)
  protect(/SHMSCOVE(?::\d+)?/gi)

  s = s
    .replace(/\bCove Digital Cards\b/g, DEMO_BRAND.cardPlural)
    .replace(/\bCove Digital Card\b/g, DEMO_BRAND.card)
    .replace(/\bShop The Cove\b/gi, `Shop ${DEMO_BRAND.store}`)
    .replace(/\bThe Cove shop\b/gi, DEMO_BRAND.store)
    .replace(/\bFamily Cove Digital Card\b/gi, DEMO_BRAND.card)
    .replace(/\bStone Hill Middle School PTO\b/gi, DEMO_BRAND.pto)
    .replace(/\bStone Hill Middle School\b/gi, DEMO_BRAND.school)
    .replace(/\bStone Hill\b/gi, 'Riverside')
    .replace(/\bSHMS PTO\b/g, DEMO_BRAND.short)
    .replace(/\bThe Cove\b/g, DEMO_BRAND.store)
    .replace(/\bCove QR\b/g, `${DEMO_BRAND.card} QR`)
    .replace(/\bCove features locked\b/gi, 'Store features locked')
    .replace(/\bunlock Cove\b/gi, `unlock ${DEMO_BRAND.store}`)
    .replace(/\bunlock the Cove\b/gi, `unlock ${DEMO_BRAND.store}`)
    .replace(/\bGo Stingrays!/gi, DEMO_BRAND.cheer)
    .replace(/\bStingrays\b/gi, DEMO_BRAND.mascotPlural)
    .replace(/\bStingray\b/gi, DEMO_BRAND.mascot)
    .replace(/\bSHMS led\b/g, 'School led')
    .replace(/\bPTO\/SHMS\b/g, 'PTO/School')
    .replace(/\bSHMS\b/g, DEMO_BRAND.short)
    .replace(/\bLagoon\b/g, DEMO_BRAND.tiers.lagoon)
    .replace(/\bReef\b/g, DEMO_BRAND.tiers.reef)
    .replace(/\bTide\b/g, DEMO_BRAND.tiers.tide)
    .replace(/\bLoudoun County Public Schools\b/gi, DEMO_BRAND.district)
    .replace(/\bRock Ridge High School\b/gi, `${DEMO_BRAND.school}`)
    .replace(/\bAshburn, Virginia\b/gi, `${DEMO_BRAND.town}`)
    .replace(/\bAshburn\b/gi, DEMO_BRAND.town)
    .replace(/\bLCPS\b/g, DEMO_BRAND.district)
    .replace(/\bCampus Store\b/g, DEMO_BRAND.store)
    .replace(/\bCampus Card\b/g, DEMO_BRAND.card)
    .replace(/your town/gi, DEMO_BRAND.town)
    .replace(/your school district/gi, DEMO_BRAND.district)
    .replace(/\bNorthern Virginia\b/gi, DEMO_BRAND.town)
    .replace(/\bNOVA Math Tournament\b/gi, 'Math meet')
    .replace(/shmspto\.org/gi, DEMO_BRAND.host)
    .replace(/@shmspto\b/gi, `@${DEMO_BRAND.host}`)
    .replace(/\s{2,}/g, ' ')
    .trim()

  return s.replace(/«D(\d+)»/g, (_, i) => protectedChunks[Number(i)] ?? '')
}

export function vanillaizeIfDemo(input: string): string {
  return isDemoInstance() ? vanillaizeCopy(input) : input
}

export function vanillaizeRecord(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[key] = vanillaizeCopy(value)
  }
  return out
}

export function vanillaizeDeep<T>(input: T): T {
  if (!isDemoInstance()) return input
  if (typeof input === 'string') return vanillaizeCopy(input) as T
  if (Array.isArray(input)) return input.map((v) => vanillaizeDeep(v)) as T
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = vanillaizeDeep(value)
    }
    return out as T
  }
  return input
}

/** Catalog ids stay reef/lagoon/tide; demo UI shows Member/Family/Patron. */
export function displayMembershipTier(tier: string): string {
  const key = String(tier || '').trim().toLowerCase()
  if (!key || key === 'free') return key || 'free'
  if (!isDemoInstance()) return tier
  const mapped = DEMO_BRAND.tiers[key as keyof typeof DEMO_BRAND.tiers]
  return mapped || vanillaizeCopy(tier)
}
