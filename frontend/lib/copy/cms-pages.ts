/** PageContent.stringOverrides bundles loaded with each visitor chrome page. */
export const VISITOR_CMS_BUNDLES: Record<string, string[]> = {
  home: ['home-strings', 'home-community', 'rfc-promo', 'donate-form'],
  membership: ['donate-form'],
  programs: ['program-strings'],
  events: ['events-strings'],
  volunteer: [],
  board: [],
  contact: ['contact-form'],
  meetings: [],
  newsletter: ['newsletter-signup', 'newsletter-page'],
  fundraising: ['fundraising-strings', 'donate-form'],
  store: [],
  legal: ['legal-shell'],
  survey: ['survey-strings'],
  'member-portal': ['portal-forms', 'portal-notices', 'portal-hub'],
}

export function cmsBundlesForPage(pageKey: string, extra: string[] = []): string[] {
  const base = VISITOR_CMS_BUNDLES[pageKey] ?? []
  return [...new Set([...base, ...extra])]
}
