'use client'

import type { PageContentField } from '@/lib/cms/inline-edit-target'
import { EditableCopy } from '@/components/cms/editable-copy'

type Props = {
  /** PageContent.page (Staff → Page copy / theme). */
  page: string
  field: PageContentField
  value: string
  className?: string
  inlineTarget?: boolean
}

/**
 * One PageContent hero/section field: Staff Page copy + admin inline edit share the same CMS row.
 */
export function CmsField({ page, field, value, className, inlineTarget }: Props) {
  return (
    <EditableCopy
      target={{ type: 'pageField', page, field }}
      value={value}
      className={className}
      inlineTarget={inlineTarget}
    />
  )
}
