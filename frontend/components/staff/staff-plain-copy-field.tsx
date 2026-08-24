'use client'

import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'

type StaffPlainCopyFieldProps = {
  label?: string
  value: string
  onChange: (next: string) => void
  /** Called with normalized plain text (HTML stripped, newlines kept). */
  onCommit?: (normalized: string) => void
  /** When false, blur only normalizes locally; parent Save button persists. */
  saveOnBlur?: boolean
  rows?: number
  placeholder?: string
  hint?: string
  className?: string
  textareaClassName?: string
  id?: string
}

/**
 * WordPress-like staff body field: type with Enter for breaks. No HTML tags.
 * The textarea is the preview (same newlines the site shows).
 */
export function StaffPlainCopyField({
  label,
  value,
  onChange,
  onCommit,
  saveOnBlur = true,
  rows = 4,
  placeholder = 'Press Enter for a new line. Start bullets with • or -.',
  hint,
  className = '',
  textareaClassName = '',
  id,
}: StaffPlainCopyFieldProps) {
  function commit() {
    const next = normalizePlainCopy(value)
    if (next !== value) onChange(next)
    onCommit?.(next)
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {label ? (
        <label htmlFor={id} className="block text-[11px] font-semibold text-[#5A6070]">
          {label}
        </label>
      ) : null}
      <p className="text-[10px] text-[#8A8F9C]">
        {hint ?? 'Press Enter for a new line. No HTML tags.'}
      </p>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        className={
          textareaClassName ||
          'w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] whitespace-pre-wrap'
        }
        onChange={(e) => onChange(e.target.value)}
        onBlur={saveOnBlur ? commit : () => {
          const next = normalizePlainCopy(value)
          if (next !== value) onChange(next)
        }}
      />
    </div>
  )
}
