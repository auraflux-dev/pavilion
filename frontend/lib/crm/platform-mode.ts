/**
 * Platform Staff mode cookie: fleet console vs serving Client Staff for one org.
 */
export const PLATFORM_MODE_COOKIE = 'pavilion_platform_mode'

export type PlatformMode = 'platform' | 'client'

export function parsePlatformMode(raw: string | undefined | null): PlatformMode {
  const v = String(raw || '').trim().toLowerCase()
  if (v === 'client' || v === '0' || v === 'school') return 'client'
  if (v === 'platform' || v === '1' || v === 'fleet') return 'platform'
  return 'platform'
}

/** When cookie is missing: public demo stays Client Staff; real platform owners start in fleet. */
export function resolvePlatformMode(
  cookieRaw: string | undefined | null,
  opts: { publicDemo?: boolean },
): PlatformMode {
  const raw = String(cookieRaw || '').trim()
  if (raw) return parsePlatformMode(raw)
  if (opts.publicDemo) return 'client'
  return 'platform'
}

export function isPlatformFleetMode(raw: string | undefined | null): boolean {
  return parsePlatformMode(raw) === 'platform'
}
