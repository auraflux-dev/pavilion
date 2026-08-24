/** Inline copy edit targets (admin browse + save to CMS). */

export type PageContentField =
  | 'eyebrow'
  | 'title'
  | 'body'
  | 'sectionTitle'
  | 'sectionBody'
  | 'ctaLabel'
  | 'ctaHref'
  | 'bullets'

export type InlineEditTarget =
  | { type: 'pageField'; page: string; field: PageContentField }
  | { type: 'stringOverride'; page: string; key: string }

export function inlineEditTargetId(target: InlineEditTarget): string {
  if (target.type === 'pageField') return `page:${target.page}:${target.field}`
  return `str:${target.page}:${target.key}`
}
