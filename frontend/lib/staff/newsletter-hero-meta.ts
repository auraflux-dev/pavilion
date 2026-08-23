/** Hero graphic metadata for newsletter emails (PNG upload; legacy Canva fields optional). */
export type NewsletterHeroMeta = {
  canvaDesignId?: string
  canvaTitle?: string
  canvaEditUrl?: string
  canvaViewUrl?: string
  canvaThumbnailUrl?: string
  heroImageUrl?: string
  heroImageKey?: string
  pageImageUrls?: string[]
}

/** @deprecated use NewsletterHeroMeta */
export type NewsletterCanvaMeta = NewsletterHeroMeta
