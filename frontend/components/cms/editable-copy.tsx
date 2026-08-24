'use client'

import { useEffect, useState } from 'react'
import type { InlineEditTarget } from '@/lib/cms/inline-edit-target'
import { useInlineCopy } from '@/components/cms/inline-copy-context'

type Props = {
  target: InlineEditTarget
  value: string
  className?: string
  /** Block vs inline wrapper */
  block?: boolean
  /** Span click target when nested inside buttons or links */
  inlineTarget?: boolean
}

export function EditableCopy({ target, value, className = '', block = true, inlineTarget = false }: Props) {
  const { canEdit, editMode, saving, saveCopy } = useInlineCopy()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    setDisplay(value)
    if (!editing) setDraft(value)
  }, [value, editing])

  const shown = display

  if (!canEdit || !editMode) {
    const Tag = block ? 'span' : 'span'
    return (
      <Tag className={`whitespace-pre-line ${className}`}>
        {shown}
      </Tag>
    )
  }

  if (!editing) {
    const editClass = `text-left whitespace-pre-line rounded-md ring-2 ring-[var(--brand-gold)]/70 bg-white/10 hover:ring-[var(--brand-gold)] hover:bg-white/15 transition-shadow cursor-pointer ${className}`
    const open = () => {
      setDraft(shown)
      setEditing(true)
    }
    if (inlineTarget) {
      return (
        <span
          role="button"
          tabIndex={0}
          className={editClass}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            open()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              open()
            }
          }}
          title="Click to edit copy"
        >
          {shown || '(empty — click to add)'}
        </span>
      )
    }
    return (
      <button
        type="button"
        className={editClass}
        onClick={open}
        title="Click to edit copy"
      >
        {shown || '(empty — click to add)'}
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
              if (ok) {
                setDisplay(draft)
                setEditing(false)
              }
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
