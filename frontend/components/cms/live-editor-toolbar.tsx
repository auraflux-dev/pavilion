'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInlineCopy } from '@/components/cms/inline-copy-context'
import { useLiveEditor } from '@/components/cms/live-editor-context'

const RESERVED = new Set([
  'staff',
  'member-portal',
  'api',
  'auth',
  'cart',
  'checkout',
  'login',
  'join',
  'review',
  'trial',
  'p',
  'programs',
  'events',
  'signups',
  'survey',
  'legal',
  'newsletter',
])

export function LiveEditorToolbar() {
  const { canEdit, editMode, setEditMode, status: copyStatus, saving } = useInlineCopy()
  const {
    canLayoutEdit,
    layoutEditMode,
    setLayoutEditMode,
    ensureEditablePage,
    status: layoutStatus,
    setStatus,
  } = useLiveEditor()
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [creating, setCreating] = useState(false)

  if (!canEdit) return null

  const status = layoutStatus || copyStatus

  async function createPage() {
    setCreating(true)
    setStatus('')
    try {
      const clean = slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      if (!clean || RESERVED.has(clean)) {
        throw new Error('Choose a different URL slug (reserved or empty).')
      }
      const r = await fetch('/api/staff/page-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-page',
          slug: clean,
          title: title.trim() || clean,
          showInNav: true,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Create failed')
      if (d.demo) throw new Error(d.message || 'Preview only. Page was not created.')
      setShowCreate(false)
      router.push(`/p/${clean}?edit=1`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2"
      aria-live="polite"
    >
      {status ? (
        <p className="pointer-events-auto max-w-md rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#1A1A1A] shadow-lg whitespace-pre-line">
          {status}
        </p>
      ) : null}

      {showCreate ? (
        <div className="pointer-events-auto w-[min(22rem,92vw)] space-y-2 rounded-xl border border-[var(--border)] bg-white p-3 shadow-lg">
          <p className="text-xs font-bold text-[var(--brand-dark)]">Create a new page</p>
          <input
            className="w-full rounded border border-[var(--border)] px-2 py-1.5 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slug) {
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, ''),
                )
              }
            }}
          />
          <div className="flex items-center gap-1 text-sm">
            <span className="text-[#5A6070]">/p/</span>
            <input
              className="min-w-0 flex-1 rounded border border-[var(--border)] px-2 py-1.5"
              placeholder="url-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={creating}
              className="rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-green)' }}
              onClick={() => void createPage()}
            >
              {creating ? 'Creating…' : 'Create & edit'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-full border border-[var(--border)] bg-white px-3 py-2 shadow-lg">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-[#5A6070]">Admin</span>
          {canLayoutEdit ? (
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                layoutEditMode ? 'text-white' : 'border border-[var(--border)] bg-[var(--brand-warm)]'
              }`}
              style={layoutEditMode ? { backgroundColor: 'var(--brand-green)' } : undefined}
              onClick={() => {
                if (layoutEditMode) {
                  setLayoutEditMode(false)
                  window.location.reload()
                } else {
                  void ensureEditablePage()
                }
              }}
            >
              {layoutEditMode ? 'Done editing page' : 'Edit page layout'}
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving || layoutEditMode}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              editMode ? 'text-white' : 'border border-[var(--border)] bg-[var(--brand-warm)]'
            } disabled:opacity-40`}
            style={editMode ? { backgroundColor: 'var(--brand-green)' } : undefined}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'Done editing copy' : 'Edit copy'}
          </button>
          {canLayoutEdit ? (
            <button
              type="button"
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--brand-dark)]"
              onClick={() => setShowCreate(true)}
            >
              New page
            </button>
          ) : null}
        </div>
        {layoutEditMode ? (
          <p className="px-1 text-[10px] font-medium text-[#5A6070]">
            Drag sections, edit fields, add from the library. Changes save live.
          </p>
        ) : editMode ? (
          <p className="px-1 text-[10px] font-medium text-[#5A6070]">
            Click gold-outlined text to edit copy fields.
          </p>
        ) : null}
      </div>
    </div>
  )
}
