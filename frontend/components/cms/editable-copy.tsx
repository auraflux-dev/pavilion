'use client'

import { useState } from 'react'
import type { InlineEditTarget } from '@/lib/cms/inline-edit-target'
import { useInlineCopy } from '@/components/cms/inline-copy-context'

type Props = {
  target: InlineEditTarget
  value: string
  className?: string
  /** Block vs inline wrapper */
  block?: boolean
}

export function EditableCopy({ target, value, className = '', block = true }: Props) {
  const { canEdit, editMode, saving, saveCopy } = useInlineCopy()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!canEdit || !editMode) {
    const Tag = block ? 'span' : 'span'
    return (
      <Tag className={`whitespace-pre-line ${className}`}>
        {value}
      </Tag>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`text-left whitespace-pre-line rounded-md ring-2 ring-transparent hover:ring-[var(--brand-gold)] hover:bg-white/10 transition-shadow ${className}`}
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        title="Click to edit copy"
      >
        {value || '(empty — click to add)'}
      </button>
    )
  }

  return (
    <span className={`block space-y-2 ${className}`}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.min(8, Math.max(3, draft.split('\n').length + 1))}
        className="w-full rounded-lg border border-[var(--brand-gold)] bg-white text-[#1A1A1A] px-3 py-2 text-sm whitespace-pre-wrap"
        autoFocus
      />
      <span className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
          onClick={() => {
            void (async () => {
              const ok = await saveCopy(target, draft)
              if (ok) setEditing(false)
            })()
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--border)] bg-white"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </span>
    </span>
  )
}
