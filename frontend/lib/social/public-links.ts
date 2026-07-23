/**
 * Public Facebook / Instagram profile URLs for site footers.
 * Site Settings can override; empty CMS values fall back here.
 */
export const DEFAULT_SOCIAL_FACEBOOK = 'https://www.facebook.com/stonehillmspto/'
export const DEFAULT_SOCIAL_INSTAGRAM = 'https://www.instagram.com/stonehillmspto'

export function resolveSocialLink(
  value: string | undefined | null,
  fallback: string,
): string {
  const trimmed = (value ?? '').trim()
  return trimmed || fallback
}
