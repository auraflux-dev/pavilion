import Link from 'next/link'
import type { PageSectionView } from '@/lib/api/page-sections'
import {
  parseSectionData,
  type ContactSectionData,
  type CtaSectionData,
  type GridCardsSectionData,
  type HeroSectionData,
  type MediaSectionData,
  type PdfListSectionData,
  type BulletsSectionData,
  type RichTextSectionData,
  type SpacerSectionData,
} from '@/lib/cms/section-types'

function SectionHero({ data }: { data: HeroSectionData }) {
  return (
    <section className="relative w-full overflow-hidden bg-[var(--brand-soft)]">
      {data.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.imageUrl}
          alt={data.imageAlt || ''}
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      ) : null}
      <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
        {data.eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-green)]">
            {data.eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-4xl font-bold text-[var(--brand-dark)] sm:text-5xl whitespace-pre-line">
          {data.title || 'Untitled'}
        </h1>
        {data.body ? (
          <p className="mt-4 max-w-2xl text-lg text-[#5A6070] whitespace-pre-line">{data.body}</p>
        ) : null}
        {data.ctaLabel && data.ctaHref ? (
          <Link
            href={data.ctaHref}
            className="mt-8 inline-flex rounded-md bg-[var(--brand-green)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {data.ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

function SectionRichText({ data }: { data: RichTextSectionData }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {data.title ? (
        <h2 className="text-2xl font-bold text-[var(--brand-dark)] whitespace-pre-line">
          {data.title}
        </h2>
      ) : null}
      {data.body ? (
        <p className="mt-3 text-[#5A6070] whitespace-pre-line">{data.body}</p>
      ) : null}
    </section>
  )
}

function SectionBullets({ data }: { data: BulletsSectionData }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {data.title ? (
        <h2 className="text-2xl font-bold text-[var(--brand-dark)]">{data.title}</h2>
      ) : null}
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[#5A6070]">
        {data.items.map((item, i) => (
          <li key={i} className="whitespace-pre-line">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SectionCta({ data }: { data: CtaSectionData }) {
  return (
    <section className="bg-[var(--brand-green)] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl text-center">
        {data.title ? <h2 className="text-2xl font-bold whitespace-pre-line">{data.title}</h2> : null}
        {data.body ? <p className="mt-3 whitespace-pre-line opacity-95">{data.body}</p> : null}
        {data.label && data.href ? (
          <Link
            href={data.href}
            className="mt-6 inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[var(--brand-green)]"
          >
            {data.label}
          </Link>
        ) : null}
      </div>
    </section>
  )
}

function SectionMedia({ data }: { data: MediaSectionData }) {
  if (!data.url) return null
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.url} alt={data.alt || ''} className="w-full rounded-lg object-cover" />
      {data.caption ? (
        <p className="mt-2 text-center text-sm text-[#5A6070]">{data.caption}</p>
      ) : null}
    </section>
  )
}

function SectionPdfList({ data }: { data: PdfListSectionData }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {data.title ? (
        <h2 className="text-2xl font-bold text-[var(--brand-dark)]">{data.title}</h2>
      ) : null}
      <ul className="mt-4 space-y-2">
        {data.items.map((item, i) => (
          <li key={i}>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--brand-green)] underline"
              >
                {item.label || 'Download'}
              </a>
            ) : (
              <span className="text-[#5A6070]">{item.label}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SectionGridCards({ data }: { data: GridCardsSectionData }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {data.title ? (
        <h2 className="mb-6 text-2xl font-bold text-[var(--brand-dark)]">{data.title}</h2>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((card, i) => {
          const inner = (
            <>
              {card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.imageUrl} alt="" className="mb-3 h-36 w-full rounded object-cover" />
              ) : null}
              <h3 className="font-bold text-[var(--brand-dark)]">{card.title}</h3>
              {card.body ? (
                <p className="mt-2 text-sm text-[#5A6070] whitespace-pre-line">{card.body}</p>
              ) : null}
            </>
          )
          return card.href ? (
            <Link key={i} href={card.href} className="block rounded-lg border border-[var(--brand-line)] p-4">
              {inner}
            </Link>
          ) : (
            <div key={i} className="rounded-lg border border-[var(--brand-line)] p-4">
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SectionContact({ data }: { data: ContactSectionData }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      {data.title ? (
        <h2 className="text-2xl font-bold text-[var(--brand-dark)]">{data.title}</h2>
      ) : null}
      {data.body ? <p className="mt-3 text-[#5A6070] whitespace-pre-line">{data.body}</p> : null}
      {data.mailto ? (
        <a
          href={`mailto:${data.mailto}`}
          className="mt-4 inline-flex font-semibold text-[var(--brand-green)] underline"
        >
          {data.mailto}
        </a>
      ) : data.formKey ? (
        <p className="mt-4 text-sm text-[#5A6070]">
          Use the contact form on this page ({data.formKey}).
        </p>
      ) : null}
    </section>
  )
}

function SectionSpacer({ data }: { data: SpacerSectionData }) {
  const h = data.size === 'sm' ? 'h-8' : data.size === 'lg' ? 'h-24' : 'h-14'
  return <div className={h} aria-hidden />
}

export function PageSectionBlock({ section }: { section: PageSectionView }) {
  switch (section.type) {
    case 'hero':
      return <SectionHero data={parseSectionData('hero', section.data) as HeroSectionData} />
    case 'richText':
      return (
        <SectionRichText data={parseSectionData('richText', section.data) as RichTextSectionData} />
      )
    case 'bullets':
      return (
        <SectionBullets data={parseSectionData('bullets', section.data) as BulletsSectionData} />
      )
    case 'cta':
      return <SectionCta data={parseSectionData('cta', section.data) as CtaSectionData} />
    case 'media':
      return <SectionMedia data={parseSectionData('media', section.data) as MediaSectionData} />
    case 'pdfList':
      return (
        <SectionPdfList data={parseSectionData('pdfList', section.data) as PdfListSectionData} />
      )
    case 'gridCards':
      return (
        <SectionGridCards
          data={parseSectionData('gridCards', section.data) as GridCardsSectionData}
        />
      )
    case 'contact':
      return (
        <SectionContact data={parseSectionData('contact', section.data) as ContactSectionData} />
      )
    case 'spacer':
      return <SectionSpacer data={parseSectionData('spacer', section.data) as SpacerSectionData} />
    default:
      return null
  }
}

export function PageSectionsRenderer({ sections }: { sections: PageSectionView[] }) {
  return (
    <>
      {sections.map((section) => (
        <PageSectionBlock key={section.id} section={section} />
      ))}
    </>
  )
}
