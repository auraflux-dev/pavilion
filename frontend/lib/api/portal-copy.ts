/**
 * Assemble member-portal UI strings from PageContent rows `portal` + `portal-hub`.
 */
import { getPageContent } from '@/lib/api/page-content'
import {
  PORTAL_COPY_DEFAULTS,
  parseKeyedLines,
  type PortalCopy,
} from '@/lib/defaults/portal-copy'

function preferDefault(
  key: keyof PortalCopy,
  raw: string,
  stale: RegExp | RegExp[],
): string {
  const value = raw.trim()
  const patterns = Array.isArray(stale) ? stale : [stale]
  if (!value || patterns.some((re) => re.test(value))) {
    return PORTAL_COPY_DEFAULTS[key]
  }
  return value
}

export async function getPortalCopy(): Promise<PortalCopy> {
  const [portal, hub] = await Promise.all([
    getPageContent('portal'),
    getPageContent('portal-hub'),
  ])

  const keyed = parseKeyedLines(hub.bullets)
  const pick = (key: keyof PortalCopy) =>
    keyed[key]?.trim() || PORTAL_COPY_DEFAULTS[key]

  return {
    paidTitle: portal.sectionTitle || PORTAL_COPY_DEFAULTS.paidTitle,
    paidBody: portal.sectionBody || PORTAL_COPY_DEFAULTS.paidBody,
    freeTitle: portal.title || PORTAL_COPY_DEFAULTS.freeTitle,
    freeBody: portal.body || PORTAL_COPY_DEFAULTS.freeBody,
    emptyTitle: portal.bullets[0] || PORTAL_COPY_DEFAULTS.emptyTitle,
    emptyBody: portal.bullets[1] || PORTAL_COPY_DEFAULTS.emptyBody,
    upgradeBody: portal.bullets[2] || PORTAL_COPY_DEFAULTS.upgradeBody,

    calendarTitle: pick('calendarTitle'),
    accountTitle: pick('accountTitle'),
    studentsTitle: pick('studentsTitle'),
    storeTitle: pick('storeTitle'),
    tabCalendar: pick('tabCalendar'),
    tabMessages: pick('tabMessages'),
    signOut: pick('signOut'),
    refresh: pick('refresh'),
    loadError: pick('loadError'),
    calendarEmptyTitle: pick('calendarEmptyTitle'),
    calendarEmptyBody: pick('calendarEmptyBody'),
    calendarEmptyCta: pick('calendarEmptyCta'),
    messagesEmptyTitle: pick('messagesEmptyTitle'),
    messagesEmptyBody: preferDefault(
      'messagesEmptyBody',
      pick('messagesEmptyBody'),
      /—|–/,
    ),
    viewMemberships: pick('viewMemberships'),
    memberSince: pick('memberSince'),
    studentsLabel: pick('studentsLabel'),
    paidMembershipsLabel: pick('paidMembershipsLabel'),
    whatsappHeading: pick('whatsappHeading'),
    storeCardsLabel: pick('storeCardsLabel'),
    // Always prefer Current Balance — CMS still has "CMS balance total" from an old seed.
    storeCardsHint: preferDefault('storeCardsHint', pick('storeCardsHint'), [
      /cms/i,
      /balance total/i,
      /^programs\s*&\s*payments$/i,
    ]),
    recentBuysLabel: pick('recentBuysLabel'),
    recentBuysHint: preferDefault('recentBuysHint', pick('recentBuysHint'), [
      /^programs\s*&\s*payments$/i,
    ]),
    ctaLoadCard: pick('ctaLoadCard'),
    ctaSpiritWear: pick('ctaSpiritWear'),
    ctaPrograms: pick('ctaPrograms'),
    purchasesEmpty: preferDefault('purchasesEmpty', pick('purchasesEmpty'), /—|–/),
    addStudentCta: pick('addStudentCta'),
    addStudentTitle: pick('addStudentTitle'),
    firstNameLabel: pick('firstNameLabel'),
    lastNameLabel: pick('lastNameLabel'),
    gradeLabel: pick('gradeLabel'),
    addStudentSubmit: pick('addStudentSubmit'),
    cancel: pick('cancel'),
    addStudentError: pick('addStudentError'),
    // Old CMS said "Choose a student…" — family card is one balance for the household.
    loadCardHelp: preferDefault('loadCardHelp', pick('loadCardHelp'), [
      /choose a student/i,
      /—|–/,
    ]),
    paymentMethodsTitle: pick('paymentMethodsTitle'),
    paymentMethodsBody: preferDefault('paymentMethodsBody', pick('paymentMethodsBody'), [
      /—|–/,
      /Square-secured/i,
      /optional Square/i,
      /prepaid student store card/i,
    ]),
  }
}

export type { PortalCopy }
