'use client'

import { CmsString } from '@/components/cms/cms-string'

type Props = {
  page: string
  eyebrow?: string
  title: string
  body?: string
  eyebrowKey?: string
  titleKey?: string
  bodyKey?: string
  headingId?: string
}

/** Section header wired to CMS stringOverrides + admin inline edit. */
export function CmsSectionHeader({
  page,
  eyebrow,
  title,
  body,
  eyebrowKey = 'eyebrow',
  titleKey = 'title',
  bodyKey = 'body',
  headingId,
}: Props) {
  return (
    <>
      {eyebrow ? (
        <div
          className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          <CmsString page={page} k={eyebrowKey} fallback={eyebrow} className="text-white" />
        </div>
      ) : null}
      <h2 id={headingId} className="text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
        <CmsString page={page} k={titleKey} fallback={title} />
      </h2>
      {body ? (
        <p className="mt-3 text-[#5A6070] leading-relaxed whitespace-pre-line">
          <CmsString page={page} k={bodyKey} fallback={body} />
        </p>
      ) : null}
    </>
  )
}
