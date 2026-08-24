'use client'

import { EditableCopy } from '@/components/cms/editable-copy'

type Props = {
  page: string
  stringKey: string
  value: string
  className?: string
  inlineTarget?: boolean
}

/** Inline-edit a PageContent stringOverrides key (program-strings, donate-form, etc.). */
export function EditableString({ page, stringKey, value, className, inlineTarget }: Props) {
  return (
    <EditableCopy
      target={{ type: 'stringOverride', page, key: stringKey }}
      value={value}
      className={className}
      inlineTarget={inlineTarget}
    />
  )
}
