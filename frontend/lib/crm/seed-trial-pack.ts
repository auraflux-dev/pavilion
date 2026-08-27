/**
 * Attach a brand pack to a trial org (code packs until org CMS tables exist).
 * Sets organizations.brand_pack_slug so the shared stack skins that tenant.
 */
import { sql } from '@/lib/crm/db'
import {
  knownTrialPackSlugs,
  trialPackForSlug,
  vanillaTrialPack,
  type TrialPack,
} from '@/lib/crm/trial-packs'

export function resolveTrialPackSlug(opts: {
  slug: string
  brandPack?: string
  schoolName: string
  tempHost: string
}): { packSlug: string; pack: TrialPack } {
  const requested = (opts.brandPack || '').trim().toLowerCase()
  if (requested && trialPackForSlug(requested)) {
    return { packSlug: requested, pack: trialPackForSlug(requested)! }
  }
  if (trialPackForSlug(opts.slug)) {
    return { packSlug: opts.slug, pack: trialPackForSlug(opts.slug)! }
  }
  const pack = vanillaTrialPack({
    slug: opts.slug,
    schoolName: opts.schoolName,
    host: opts.tempHost,
  })
  return { packSlug: '', pack }
}

export async function seedTrialOrgBrandPack(opts: {
  orgId: string
  slug: string
  schoolName: string
  tempHost: string
  brandPack?: string
}): Promise<{ packSlug: string; pack: TrialPack }> {
  const { packSlug, pack } = resolveTrialPackSlug(opts)
  await sql(`update organizations set brand_pack_slug = $1 where id = $2`, [packSlug, opts.orgId])
  return { packSlug, pack }
}

export function listSeedablePackSlugs(): string[] {
  return knownTrialPackSlugs()
}
