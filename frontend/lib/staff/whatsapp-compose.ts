/**
 * WhatsApp helpers for staff → grade groups.
 * Meta does not offer a simple "post to group" API; we open invite links
 * and prepare copyable message text for the staffer to paste in-app.
 */

export type GradeWhatsAppLinks = {
  grade6: string
  grade7: string
  grade8: string
}

export type WhatsAppGrade = '6' | '7' | '8' | 'all'

export function pickGradeLink(links: GradeWhatsAppLinks, grade: WhatsAppGrade): string {
  if (grade === '6') return links.grade6
  if (grade === '7') return links.grade7
  if (grade === '8') return links.grade8
  return ''
}

export function listConfiguredGradeLinks(links: GradeWhatsAppLinks): {
  grade: '6' | '7' | '8'
  url: string
}[] {
  return (
    [
      { grade: '6' as const, url: links.grade6 },
      { grade: '7' as const, url: links.grade7 },
      { grade: '8' as const, url: links.grade8 },
    ] as const
  ).filter((g) => Boolean(g.url.trim()))
}

/** Personal share (not group). opens WhatsApp with prefilled text. */
export function buildWaMeShareUrl(message: string): string {
  const text = message.trim()
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function buildWhatsAppGroupPlan(
  links: GradeWhatsAppLinks,
  grade: WhatsAppGrade,
  message: string,
): {
  message: string
  openUrls: string[]
  instructions: string
  waMeShare: string
} {
  const msg = message.trim()
  const configured = listConfiguredGradeLinks(links)
  const openUrls =
    grade === 'all'
      ? configured.map((g) => g.url)
      : [pickGradeLink(links, grade)].filter(Boolean)

  const missing =
    grade === 'all'
      ? (['6', '7', '8'] as const).filter((g) => !pickGradeLink(links, g))
      : pickGradeLink(links, grade)
        ? []
        : [grade]

  const instructions = [
    openUrls.length
      ? `Open the grade WhatsApp group${openUrls.length > 1 ? 's' : ''}, then paste your message.`
      : 'No WhatsApp invite link configured for this grade in Site Settings.',
    missing.length
      ? `Missing invite links for grade(s): ${missing.join(', ')}. Add announcement{6th|7th|8th}Link in Site Settings.`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    message: msg,
    openUrls,
    instructions,
    waMeShare: buildWaMeShareUrl(msg),
  }
}
