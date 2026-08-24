'use client'

import { EditableString } from '@/components/cms/editable-string'

type Props = {
  page: string
  stringKey: string
  value: string
  className?: string
  inlineTarget?: boolean
}

/** Shorthand for stringOverrides inline edit. */
export function EditableStringField({ page, stringKey, value, className, inlineTarget }: Props) {
  return (
    <EditableString
      page={page}
      stringKey={stringKey}
      value={value}
      className={className}
      inlineTarget={inlineTarget}
    />
  )
}
