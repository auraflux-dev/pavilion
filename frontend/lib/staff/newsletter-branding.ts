/**
 * Newsletter header/footer copy (SiteSettings). VP Marketing edits in Staff → Newsletter → Email branding.
 */

export const NEWSLETTER_BRANDING_DEFAULTS = {
  newsletterHeaderTitle: 'SHMS PTO',
  /** Editable once in Site settings. Unsubscribe + postal address are added automatically. */
  newsletterFooterText: 'Stone Hill Middle School PTO\nwww.shmspto.org',
  newsletterHeaderLogoUrl: '',
  newsletterCustomCss: '',
} as const

export type NewsletterBranding = {
  headerTitle: string
  footerLines: string[]
  headerLogoUrl: string
  customCss: string
}

const EMAIL_ASSET_ORIGIN = 'https://www.shmspto.org'
const DEFAULT_EMAIL_HEADER_LOGO_PATH = '/shms-logo.png'

/** Resolve header logo for HTML email (absolute URL). Custom SiteSettings value wins when set. */
export function resolveEmailHeaderLogoUrl(
  headerLogoUrl: string | undefined | null,
  origin: string,
): string {
  const trimmed = String(headerLogoUrl ?? '').trim()
  const base = origin.replace(/\/$/, '')
  if (trimmed) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
  }
  // Demo/trial: prefer site origin logo when no custom header is set.
  if (/commons-pto|onpavilion|localhost|127\.0\.0\.1/i.test(base)) {
    return `${base}/demo/mark.png`
  }
  return `${EMAIL_ASSET_ORIGIN}${DEFAULT_EMAIL_HEADER_LOGO_PATH}`
}

export function parseNewsletterBranding(settings: {
  get: (key: string, fallback?: string) => string
}): NewsletterBranding {
  const headerTitle =
    settings.get('newsletterHeaderTitle', NEWSLETTER_BRANDING_DEFAULTS.newsletterHeaderTitle).trim() ||
    NEWSLETTER_BRANDING_DEFAULTS.newsletterHeaderTitle
  const footerRaw =
    settings.get('newsletterFooterText', NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText).trim() ||
    NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText
  const footerLines = footerRaw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const headerLogoUrl = settings.get('newsletterHeaderLogoUrl', '').trim()
  const customCss = settings.get('newsletterCustomCss', '').trim()
  return {
    headerTitle,
    footerLines: footerLines.length
      ? footerLines
      : NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText.split('\n'),
    headerLogoUrl,
    customCss,
  }
}

export async function loadNewsletterBrandingFromKeys(
  load: (key: string) => Promise<string>,
): Promise<NewsletterBranding> {
  const [headerTitle, footerText, headerLogoUrl, customCss] = await Promise.all([
    load('newsletterHeaderTitle'),
    load('newsletterFooterText'),
    load('newsletterHeaderLogoUrl'),
    load('newsletterCustomCss'),
  ])
  return parseNewsletterBranding({
    get: (key, fallback) => {
      if (key === 'newsletterHeaderTitle') return headerTitle || fallback || ''
      if (key === 'newsletterFooterText') return footerText || fallback || ''
      if (key === 'newsletterHeaderLogoUrl') return headerLogoUrl || fallback || ''
      if (key === 'newsletterCustomCss') return customCss || fallback || ''
      return fallback ?? ''
    },
  })
}
