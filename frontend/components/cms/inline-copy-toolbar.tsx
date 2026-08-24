'use client'

import { useInlineCopy } from '@/components/cms/inline-copy-context'

export function InlineCopyToolbar() {
  const { canEdit, editMode, setEditMode, status, saving } = useInlineCopy()
  if (!canEdit) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
    >
      {status ? (
        <p className="pointer-events-auto text-xs font-medium bg-white border border-[var(--border)] shadow-lg rounded-lg px-3 py-1.5 text-[#1A1A1A] max-w-md text-center whitespace-pre-line">
          {status}
        </p>
      ) : null}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-full border border-[var(--border)] bg-white shadow-lg px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#5A6070]">Admin copy edit</span>
          <button
            type="button"
            disabled={saving}
            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              editMode ? 'text-white' : 'border border-[var(--border)] bg-[var(--brand-warm)]'
            }`}
            style={editMode ? { backgroundColor: 'var(--brand-green)' } : undefined}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Done editing' : 'Edit copy on page'}
          </button>
        </div>
        {editMode ? (
          <p className="text-[10px] font-medium text-[#5A6070] px-1">
            Click gold-outlined text to edit. Save each field, then refresh if needed.
          </p>
        ) : null}
      </div>
    </div>
  )
}
