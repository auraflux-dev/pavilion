import { isDemoInstance } from '@/lib/demo/instance'
import { isPavilionProductPlatform } from '@/lib/crm/platform-env'
import { trialPackForSlug, type TrialBrand } from '@/lib/crm/trial-packs'

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
  logoPath: '/demo/mark.png',
  tiers: {
    reef: 'Member',
    lagoon: 'Family',
    tide: 'Patron',
    faculty: 'Faculty',
  },
} as const

export type PublicBrandFace = {
  school: string
  pto: string
  short: string
  mascot: string
  mascotPlural: string
  cheer: string
  store: string
  card: string
  cardPlural: string
  town: string
  district: string
  host: string
  logoPath: string
  tiers: {
    reef: string
    lagoon: string
    tide: string
    faculty: string
  }
}

const STONE_HILL_BRAND: PublicBrandFace = {
  school: 'Stone Hill Middle School',
  pto: 'Stone Hill Middle School PTO',
  short: 'SHMS PTO',
  mascot: 'Stingray',
  mascotPlural: 'Stingrays',
  cheer: 'Go Stingrays!',
  store: 'The Cove',
  card: 'Cove Digital Card',
  cardPlural: 'Cove Digital Cards',
  town: 'Ashburn',
  district: 'Loudoun County Public Schools',
  host: 'shmspto.org',
  logoPath: '/shms-logo.png',
  tiers: {
    reef: 'Reef',
    lagoon: 'Lagoon',
    tide: 'Tide',
    faculty: 'Faculty',
  },
}

export function brandFaceFromTrial(b: TrialBrand): PublicBrandFace {
  return {
    school: b.school,
    pto: b.pto,
    short: b.short,
    mascot: 'Champion',
    mascotPlural: 'Champions',
    cheer: b.cheer,
    store: b.store,
    card: b.card,
    cardPlural: `${b.card}s`,
    town: b.town,
    district: `${b.town} schools`,
    host: b.host,
    logoPath: b.logoPath,
    tiers: {
      reef: 'Member',
      lagoon: 'Family',
      tide: 'Patron',
      faculty: 'Faculty',
    },
  }
}

/** Client override when a prospect brand pack is active on demo. */
let clientBrandFace: PublicBrandFace | null = null

export function setClientBrandFace(face: PublicBrandFace | null) {
  clientBrandFace = face
}

/** Active visitor chrome brand: demo, prospect pack, or Stone Hill. */
export function publicBrandFace(): PublicBrandFace {
  if (clientBrandFace) return clientBrandFace
  // Env-configured pack only here (client-safe). Session org packs resolve on the server.
  const slug = (
    process.env.NEXT_PUBLIC_COMMONS_BRAND_PACK ||
    process.env.COMMONS_BRAND_PACK ||
    process.env.NEXT_PUBLIC_COMMONS_TRIAL_PACK ||
    process.env.COMMONS_TRIAL_PACK ||
    ''
  ).trim()
  const onProduct = isDemoInstance() || isPavilionProductPlatform()
  if (slug && onProduct) {
    const pack = trialPackForSlug(slug)
    if (pack) return brandFaceFromTrial(pack.brand)
  }
  if (isDemoInstance()) return DEMO_BRAND
  if (isPavilionProductPlatform()) return DEMO_BRAND
  return STONE_HILL_BRAND
}

/** Demo or any Commons/Pavilion surface (trial or pre-trial). */
/** Client-only: set by CommonsSurfaceProvider when the shell is enabled. */
let clientPavilionSurface = false

export function setClientPavilionSurface(enabled: boolean) {
  clientPavilionSurface = enabled
}

export function isPavilionSurface(): boolean {
  return isDemoInstance() || isPavilionProductPlatform() || clientPavilionSurface
}

export function demoStorePath(): string {
  if (isDemoInstance()) return '/perch'
  if (isPavilionProductPlatform()) return '/membership'
  return '/cove'
}

export function vanillaizeCopy(input: string, brand: PublicBrandFace = DEMO_BRAND): string {
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

  s = s
    .replace(/SHMSREEF\d+/g, 'RIVERSIDEMEMBER10')
    .replace(/SHMSLAGOON\d+/g, 'RIVERSIDEFAMILY15')
    .replace(/SHMSTIDE\d+/g, 'RIVERSIDEPATRON20')
    .replace(/SHMSCOVE(?::\d+)?/gi, 'RIVERSIDEPERCH')
    .replace(/\bCove Digital Cards\b/g, brand.cardPlural)
    .replace(/\bCove Digital Card\b/g, brand.card)
    .replace(/\bFamily Cove code\b/gi, `${brand.card} code`)
    .replace(/\bFamily Cove\b/gi, brand.card)
    .replace(/\bShop The Cove\b/gi, `Shop ${brand.store}`)
    .replace(/\bThe Cove shop\b/gi, brand.store)
    .replace(/\bFamily Cove Digital Card\b/gi, brand.card)
    .replace(/\bStone Hill Middle School PTO\b/gi, brand.pto)
    .replace(/\bStone Hill Middle School\b/gi, brand.school)
    .replace(/\bStone Hill\b/gi, brand.short.replace(/\s*PTO$/i, '').trim() || brand.town)
    .replace(/\bSHMS PTO\b/g, brand.short)
    .replace(/\/cove\b/gi, brand.store === 'The Perch' ? '/perch' : brand.store === 'The Cove' ? '/cove' : '/membership')
    .replace(/\bThe Cove\b/g, brand.store)
    .replace(/\bCove QR\b/g, `${brand.card} QR`)
    .replace(/\bCove features locked\b/gi, 'Store features locked')
    .replace(/\bunlock Cove\b/gi, `unlock ${brand.store}`)
    .replace(/\bunlock the Cove\b/gi, `unlock ${brand.store}`)
    .replace(/\bduring Cove hours\b/gi, `during ${brand.store} hours`)
    .replace(/\bCove \/ retail\b/gi, `${brand.store} / retail`)
    .replace(/\bCove register\b/gi, `${brand.store} register`)
    .replace(/\bCove \/ marketing copy\b/gi, `${brand.store} / marketing copy`)
    .replace(/\bCharge Cove\b/gi, `Charge ${brand.store}`)
    .replace(/\bCove hours\b/gi, `${brand.store} hours`)
    .replace(/\bCove\b/g, brand.store)
    .replace(/\ba The Perch\b/g, 'a Perch')
    .replace(/\bthe The Perch\b/g, 'the Perch')
    .replace(/\band The The Perch\b/g, 'and The Perch')
    .replace(/\bGo Stingrays!/gi, brand.cheer)
    .replace(/\bStingrays\b/gi, brand.mascotPlural)
    .replace(/\bStingray\b/gi, brand.mascot)
    .replace(/\bSHMS led\b/g, 'School led')
    .replace(/\bPTO\/SHMS\b/g, 'PTO/School')
    .replace(/\bSHMS\b/g, brand.short)
    .replace(/\bLagoon\b/g, brand.tiers.lagoon)
    .replace(/\bReef\b/g, brand.tiers.reef)
    .replace(/\bTide\b/g, brand.tiers.tide)
    .replace(/\bLoudoun County Public Schools\b/gi, brand.district)
    .replace(/\bRock Ridge High School\b/gi, `${brand.school}`)
    .replace(/\bAshburn, Virginia\b/gi, `${brand.town}`)
    .replace(/\bAshburn\b/gi, brand.town)
    .replace(/\bLCPS\b/g, brand.district)
    .replace(/\bCampus Store\b/g, brand.store)
    .replace(/\bCampus Card\b/g, brand.card)
    .replace(/your town/gi, brand.town)
    .replace(/your school district/gi, brand.district)
    .replace(/\bNorthern Virginia\b/gi, brand.town)
    .replace(/\bNOVA Math Tournament\b/gi, `${brand.town} Math Tournament`)
    .replace(/\bNOVA Math\b/gi, `${brand.town} Math`)
    .replace(/\bMath meet\b/gi, 'Fairhaven Math Tournament')
    .replace(/\bMoneyMinder\b/gi, 'the budget books')
    .replace(/\bBank of America\b/gi, 'the operating bank')
    .replace(/\bBoA\b/g, 'bank')
    .replace(/shmspto\.org/gi, brand.host)
    .replace(/@shmspto\b/gi, `@${brand.host}`)
    // Keep authored newlines (copy-line-breaks rule). Only collapse spaces/tabs.
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/ +\./g, '.')
    .trim()

  return s.replace(/«D(\d+)»/g, (_, i) => protectedChunks[Number(i)] ?? '')
}

export function vanillaizeIfDemo(input: string): string {
  if (!isPavilionSurface()) return input
  return vanillaizeCopy(input, publicBrandFace())
}

export function vanillaizeRecord(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[key] = vanillaizeCopy(value)
  }
  return out
}

export function vanillaizeDeep<T>(input: T): T {
  if (!isPavilionSurface()) return input
  const face = publicBrandFace()
  if (typeof input === 'string') return vanillaizeCopy(input, face) as T
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
  if (!key || key === 'free') return 'Free'
  if (isPavilionSurface()) {
    const face = publicBrandFace()
    const mapped = face.tiers[key as keyof typeof face.tiers]
    return mapped || vanillaizeCopy(tier, face)
  }
  return key.charAt(0).toUpperCase() + key.slice(1)
}
