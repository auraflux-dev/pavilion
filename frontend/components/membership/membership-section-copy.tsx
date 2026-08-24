'use client'

import { CmsField } from '@/components/cms/cms-field'

export function MembershipSectionCopy({
  sectionTitle,
  sectionBody,
  headingId,
}: {
  sectionTitle: string
  sectionBody: string
  headingId?: string
}) {
  return (
    <div className="text-center mb-12">
      <h2
        id={headingId}
        className="text-3xl font-bold text-[#1A1A1A] mb-3"
      >
        <CmsField page="membership" field="sectionTitle" value={sectionTitle} />
      </h2>
      <p className="text-[#5A6070] max-w-xl mx-auto whitespace-pre-line">
        <CmsField page="membership" field="sectionBody" value={sectionBody} inlineTarget />
      </p>
    </div>
  )
}
