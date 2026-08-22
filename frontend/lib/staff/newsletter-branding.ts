/**
 * Newsletter header/footer copy (SiteSettings). Marketing edits in Staff → Site settings.
 */

export const NEWSLETTER_BRANDING_DEFAULTS = {
  newsletterHeaderTitle: 'SHMS PTO',
  newsletterFooterText:
    'Stone Hill Middle School PTO\nwww.shmspto.org · Reply to this email with questions',
} as const

export type NewsletterBranding = {
  headerTitle: string
  footerLines: string[]
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
  return {
    headerTitle,
    footerLines: footerLines.length
      ? footerLines
      : NEWSLETTER_BRANDING_DEFAULTS.newsletterFooterText.split('\n'),
  }
}

export async function loadNewsletterBrandingFromKeys(
  load: (key: string) => Promise<string>,
): Promise<NewsletterBranding> {
  const [headerTitle, footerText] = await Promise.all([
    load('newsletterHeaderTitle'),
    load('newsletterFooterText'),
  ])
  return parseNewsletterBranding({
    get: (key, fallback) => {
      if (key === 'newsletterHeaderTitle') return headerTitle || fallback || ''
      if (key === 'newsletterFooterText') return footerText || fallback || ''
      return fallback ?? ''
    },
  })
}
