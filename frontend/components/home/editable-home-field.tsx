'use client'

import { EditableCopy } from '@/components/cms/editable-copy'
import type { PageContentField } from '@/lib/cms/inline-edit-target'

type Props = {
  field: PageContentField
  value: string
  className?: string
}

/** Inline-edit a home PageContent field (eyebrow, title, body, ctaLabel). */
export function EditableHomeField({ field, value, className }: Props) {
  return (
    <EditableCopy
      target={{ type: 'pageField', page: 'home', field }}
      value={value}
      className={className}
    />
  )
}
