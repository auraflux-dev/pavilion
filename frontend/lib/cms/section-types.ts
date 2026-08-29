/**
 * Section library for Pavilion CMS page builder (demo/trial only).
 */
import { z } from 'zod'

export const SECTION_TYPES = [
  'hero',
  'richText',
  'bullets',
  'cta',
  'media',
  'pdfList',
  'gridCards',
  'contact',
  'spacer',
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

export const COMPOSABLE_PAGES = [
  { slug: 'home', label: 'Home', href: '/' },
  { slug: 'membership', label: 'Membership', href: '/membership' },
  { slug: 'volunteer', label: 'Volunteer', href: '/volunteer' },
  { slug: 'board', label: 'Board', href: '/board' },
  { slug: 'contact', label: 'Contact', href: '/contact' },
  { slug: 'fundraising', label: 'Fundraising', href: '/fundraising' },
  { slug: 'events', label: 'Events', href: '/events' },
  { slug: 'programs', label: 'Programs', href: '/programs' },
  { slug: 'cove', label: 'Store', href: '/cove' },
  { slug: 'newsletter', label: 'Newsletter', href: '/newsletter' },
  { slug: 'meetings', label: 'Meetings', href: '/meetings' },
  { slug: 'privacy', label: 'Privacy', href: '/privacy' },
  { slug: 'terms', label: 'Terms', href: '/terms' },
  { slug: 'photo-release', label: 'Photo release', href: '/photo-release' },
  { slug: 'data-security', label: 'Data security', href: '/data-security' },
] as const

export type ComposablePageSlug = (typeof COMPOSABLE_PAGES)[number]['slug']

const ctaSchema = z.object({
  label: z.string().default(''),
  href: z.string().default(''),
})

export const heroDataSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().default(''),
  body: z.string().default(''),
  ctaLabel: z.string().default(''),
  ctaHref: z.string().default(''),
  imageUrl: z.string().default(''),
  imageAlt: z.string().default(''),
})

export const richTextDataSchema = z.object({
  title: z.string().default(''),
  body: z.string().default(''),
})

export const bulletsDataSchema = z.object({
  title: z.string().default(''),
  items: z.array(z.string()).default([]),
})

export const ctaDataSchema = z.object({
  title: z.string().default(''),
  body: z.string().default(''),
  label: z.string().default(''),
  href: z.string().default(''),
})

export const mediaDataSchema = z.object({
  url: z.string().default(''),
  alt: z.string().default(''),
  caption: z.string().default(''),
})

export const pdfListDataSchema = z.object({
  title: z.string().default(''),
  items: z
    .array(
      z.object({
        label: z.string().default(''),
        url: z.string().default(''),
      }),
    )
    .default([]),
})

export const gridCardsDataSchema = z.object({
  title: z.string().default(''),
  cards: z
    .array(
      z.object({
        title: z.string().default(''),
        body: z.string().default(''),
        href: z.string().default(''),
        imageUrl: z.string().default(''),
      }),
    )
    .default([]),
})

export const contactDataSchema = z.object({
  title: z.string().default(''),
  body: z.string().default(''),
  mailto: z.string().default(''),
  formKey: z.string().default('contact'),
})

export const spacerDataSchema = z.object({
  size: z.enum(['sm', 'md', 'lg']).default('md'),
})

export type HeroSectionData = z.infer<typeof heroDataSchema>
export type RichTextSectionData = z.infer<typeof richTextDataSchema>
export type BulletsSectionData = z.infer<typeof bulletsDataSchema>
export type CtaSectionData = z.infer<typeof ctaDataSchema>
export type MediaSectionData = z.infer<typeof mediaDataSchema>
export type PdfListSectionData = z.infer<typeof pdfListDataSchema>
export type GridCardsSectionData = z.infer<typeof gridCardsDataSchema>
export type ContactSectionData = z.infer<typeof contactDataSchema>
export type SpacerSectionData = z.infer<typeof spacerDataSchema>

export type SectionDataMap = {
  hero: HeroSectionData
  richText: RichTextSectionData
  bullets: BulletsSectionData
  cta: CtaSectionData
  media: MediaSectionData
  pdfList: PdfListSectionData
  gridCards: GridCardsSectionData
  contact: ContactSectionData
  spacer: SpacerSectionData
}

export const SECTION_TYPE_META: Record<
  SectionType,
  { label: string; description: string; defaultData: SectionDataMap[SectionType] }
> = {
  hero: {
    label: 'Hero',
    description: 'Page hero with title, body, CTA, and image',
    defaultData: heroDataSchema.parse({}),
  },
  richText: {
    label: 'Text',
    description: 'Title and body copy',
    defaultData: richTextDataSchema.parse({}),
  },
  bullets: {
    label: 'Bullets',
    description: 'Title plus a list of items',
    defaultData: bulletsDataSchema.parse({}),
  },
  cta: {
    label: 'Call to action',
    description: 'Banner with button',
    defaultData: ctaDataSchema.parse({}),
  },
  media: {
    label: 'Media',
    description: 'Image or graphic block',
    defaultData: mediaDataSchema.parse({}),
  },
  pdfList: {
    label: 'PDF downloads',
    description: 'List of download links',
    defaultData: pdfListDataSchema.parse({}),
  },
  gridCards: {
    label: 'Card grid',
    description: 'Two to three cards',
    defaultData: gridCardsDataSchema.parse({ cards: [] }),
  },
  contact: {
    label: 'Contact',
    description: 'Inquiry block with mailto or form key',
    defaultData: contactDataSchema.parse({}),
  },
  spacer: {
    label: 'Spacer',
    description: 'Vertical space',
    defaultData: spacerDataSchema.parse({}),
  },
}

const schemaByType: Record<SectionType, z.ZodTypeAny> = {
  hero: heroDataSchema,
  richText: richTextDataSchema,
  bullets: bulletsDataSchema,
  cta: ctaDataSchema,
  media: mediaDataSchema,
  pdfList: pdfListDataSchema,
  gridCards: gridCardsDataSchema,
  contact: contactDataSchema,
  spacer: spacerDataSchema,
}

export function isSectionType(value: string): value is SectionType {
  return (SECTION_TYPES as readonly string[]).includes(value)
}

export function parseSectionData(type: SectionType, raw: unknown): SectionDataMap[SectionType] {
  const schema = schemaByType[type]
  const parsed = schema.safeParse(typeof raw === 'object' && raw ? raw : {})
  if (parsed.success) return parsed.data as SectionDataMap[SectionType]
  return SECTION_TYPE_META[type].defaultData
}

export function emptySectionData(type: SectionType): SectionDataMap[SectionType] {
  return SECTION_TYPE_META[type].defaultData
}

/** Brand font allowlist (CSS font-family values). */
export const BRAND_FONT_OPTIONS = [
  { id: '', label: 'Default (theme)' },
  { id: 'Nunito, system-ui, sans-serif', label: 'Nunito' },
  { id: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { id: 'Merriweather, Georgia, serif', label: 'Merriweather' },
  { id: 'Georgia, Times New Roman, serif', label: 'Georgia' },
  { id: 'system-ui, sans-serif', label: 'System UI' },
] as const

void ctaSchema
