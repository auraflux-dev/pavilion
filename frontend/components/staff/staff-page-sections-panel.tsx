'use client'

/**
 * Staff page section composer (demo/trial only). Drag-reorder + section library.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  COMPOSABLE_PAGES,
  SECTION_TYPE_META,
  SECTION_TYPES,
  type SectionType,
} from '@/lib/cms/section-types'
import { StaffFlyerUpload } from '@/components/staff/staff-flyer-upload'
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

type SectionRow = {
  id: string
  pageSlug: string
  sortOrder: number
  sectionType: string
  data: Record<string, unknown>
  active: boolean
}

function CmsMediaUpload({
  label,
  currentUrl,
  onUploaded,
}: {
  label: string
  currentUrl?: string
  onUploaded: (url: string) => void
}) {
  return (
    <StaffFlyerUpload
      label={label}
      currentUrl={currentUrl}
      onUploaded={async (r) => {
        // Prefer CMS media endpoint by re-uploading path via custom fetch in parent editors.
        onUploaded(r.url)
      }}
    />
  )
}

/** Upload helper that hits CMS media first. */
async function uploadCmsImage(file: File): Promise<string> {
  const body = new FormData()
  body.set('file', file)
  let r = await fetch('/api/staff/cms-media/upload', { method: 'POST', body })
  if (!r.ok) {
    const body2 = new FormData()
    body2.set('file', file)
    r = await fetch('/api/staff/media/upload', { method: 'POST', body: body2 })
  }
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Upload failed')
  return String(d.url)
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-[#5A6070]">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[#1a1a1a]'

function SectionFields({
  type,
  data,
  onChange,
}: {
  type: SectionType
  data: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value })

  if (type === 'hero') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Eyebrow">
          <input className={inputClass} value={String(data.eyebrow ?? '')} onChange={(e) => set('eyebrow', e.target.value)} />
        </Field>
        <Field label="Title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Body">
            <textarea className={inputClass} rows={3} value={String(data.body ?? '')} onChange={(e) => set('body', e.target.value)} />
          </Field>
        </div>
        <Field label="CTA label">
          <input className={inputClass} value={String(data.ctaLabel ?? '')} onChange={(e) => set('ctaLabel', e.target.value)} />
        </Field>
        <Field label="CTA href">
          <input className={inputClass} value={String(data.ctaHref ?? '')} onChange={(e) => set('ctaHref', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <CmsImageField
            label="Hero image"
            url={String(data.imageUrl ?? '')}
            onUrl={(url) => set('imageUrl', url)}
          />
        </div>
      </div>
    )
  }

  if (type === 'richText') {
    return (
      <div className="space-y-2">
        <Field label="Title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Body">
          <textarea className={inputClass} rows={4} value={String(data.body ?? '')} onChange={(e) => set('body', e.target.value)} />
        </Field>
      </div>
    )
  }

  if (type === 'bullets') {
    const items = Array.isArray(data.items) ? (data.items as string[]) : []
    return (
      <div className="space-y-2">
        <Field label="Title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Items (one per line)">
          <textarea
            className={inputClass}
            rows={4}
            value={items.join('\n')}
            onChange={(e) =>
              set(
                'items',
                e.target.value.split('\n').map((l) => l.trimEnd()),
              )
            }
          />
        </Field>
      </div>
    )
  }

  if (type === 'cta') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Button label">
          <input className={inputClass} value={String(data.label ?? '')} onChange={(e) => set('label', e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Body">
            <textarea className={inputClass} rows={2} value={String(data.body ?? '')} onChange={(e) => set('body', e.target.value)} />
          </Field>
        </div>
        <Field label="Button href">
          <input className={inputClass} value={String(data.href ?? '')} onChange={(e) => set('href', e.target.value)} />
        </Field>
      </div>
    )
  }

  if (type === 'media') {
    return (
      <div className="space-y-2">
        <CmsImageField
          label="Image"
          url={String(data.url ?? '')}
          onUrl={(url) => set('url', url)}
        />
        <Field label="Alt text">
          <input className={inputClass} value={String(data.alt ?? '')} onChange={(e) => set('alt', e.target.value)} />
        </Field>
        <Field label="Caption">
          <input className={inputClass} value={String(data.caption ?? '')} onChange={(e) => set('caption', e.target.value)} />
        </Field>
      </div>
    )
  }

  if (type === 'pdfList') {
    const items = Array.isArray(data.items)
      ? (data.items as { label?: string; url?: string }[])
      : []
    return (
      <div className="space-y-2">
        <Field label="Title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Downloads (label|url per line)">
          <textarea
            className={inputClass}
            rows={5}
            value={items.map((it) => `${it.label ?? ''}|${it.url ?? ''}`).join('\n')}
            onChange={(e) =>
              set(
                'items',
                e.target.value.split('\n').map((line) => {
                  const i = line.indexOf('|')
                  if (i < 0) return { label: line.trim(), url: '' }
                  return { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() }
                }),
              )
            }
          />
        </Field>
      </div>
    )
  }

  if (type === 'gridCards') {
    const cards = Array.isArray(data.cards)
      ? (data.cards as { title?: string; body?: string; href?: string; imageUrl?: string }[])
      : []
    return (
      <div className="space-y-2">
        <Field label="Section title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <p className="text-xs text-[#5A6070]">Cards as title||body||href||imageUrl (one per line)</p>
        <textarea
          className={inputClass}
          rows={5}
          value={cards
            .map((c) => `${c.title ?? ''}||${c.body ?? ''}||${c.href ?? ''}||${c.imageUrl ?? ''}`)
            .join('\n')}
          onChange={(e) =>
            set(
              'cards',
              e.target.value.split('\n').map((line) => {
                const [title = '', body = '', href = '', imageUrl = ''] = line.split('||')
                return { title, body, href, imageUrl }
              }),
            )
          }
        />
      </div>
    )
  }

  if (type === 'contact') {
    return (
      <div className="space-y-2">
        <Field label="Title">
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Body">
          <textarea className={inputClass} rows={3} value={String(data.body ?? '')} onChange={(e) => set('body', e.target.value)} />
        </Field>
        <Field label="Mailto">
          <input className={inputClass} value={String(data.mailto ?? '')} onChange={(e) => set('mailto', e.target.value)} />
        </Field>
        <Field label="Form key">
          <input className={inputClass} value={String(data.formKey ?? '')} onChange={(e) => set('formKey', e.target.value)} />
        </Field>
      </div>
    )
  }

  if (type === 'spacer') {
    return (
      <Field label="Size">
        <select
          className={inputClass}
          value={String(data.size ?? 'md')}
          onChange={(e) => set('size', e.target.value)}
        >
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </Field>
    )
  }

  return null
}

function CmsImageField({
  label,
  url,
  onUrl,
}: {
  label: string
  url: string
  onUrl: (url: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[#FAFAF8]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-[#5A6070]">
              No image
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#5A6070]">{label}</p>
          <label className="cursor-pointer text-xs font-bold underline" style={{ color: 'var(--brand-green)' }}>
            {url ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  onUrl(await uploadCmsImage(file))
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Upload failed')
                }
                e.target.value = ''
              }}
            />
          </label>
          {url ? (
            <button
              type="button"
              className="ml-3 text-xs text-[#5A6070] underline"
              onClick={() => onUrl('')}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <input
        className={inputClass}
        placeholder="Or paste image URL"
        value={url}
        onChange={(e) => onUrl(e.target.value)}
      />
    </div>
  )
}

function SortableSection({
  section,
  open,
  onToggle,
  onChange,
  onSave,
  onDelete,
  saving,
}: {
  section: SectionRow
  open: boolean
  onToggle: () => void
  onChange: (next: SectionRow) => void
  onSave: () => void
  onDelete: () => void
  saving: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }
  const type = section.sectionType as SectionType
  const meta = SECTION_TYPE_META[type]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-[var(--border)] bg-white"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="cursor-grab touch-none text-[#5A6070]"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={onToggle}>
          <span className="truncate text-sm font-semibold text-[var(--brand-dark)]">
            {meta?.label ?? section.sectionType}
          </span>
          {!section.active ? (
            <span className="text-[10px] font-bold uppercase text-[#A00]">Hidden</span>
          ) : null}
          {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
        <button
          type="button"
          className="text-[#5A6070] hover:text-[#A00]"
          aria-label="Delete section"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open && meta ? (
        <div className="space-y-3 border-t border-[var(--border)] px-3 py-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={section.active}
              onChange={(e) => onChange({ ...section, active: e.target.checked })}
            />
            Active on site
          </label>
          <SectionFields
            type={type}
            data={section.data}
            onChange={(data) => onChange({ ...section, data })}
          />
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="rounded-md bg-[var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function StaffPageSectionsPanel() {
  const [pageSlug, setPageSlug] = useState('home')
  const [sections, setSections] = useState<SectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [addType, setAddType] = useState<SectionType>('richText')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const load = useCallback(async (slug: string) => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/staff/page-sections?page=${encodeURIComponent(slug)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load')
      setSections(d.sections ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(pageSlug)
  }, [pageSlug, load])

  async function persistReorder(next: SectionRow[]) {
    setSections(next)
    await fetch('/api/staff/page-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        pageSlug,
        orderedIds: next.map((s) => s.id),
      }),
    })
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s.id === active.id)
    const newIndex = sections.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
      ...s,
      sortOrder: i,
    }))
    void persistReorder(next)
  }

  async function saveSection(section: SectionRow) {
    setSavingId(section.id)
    try {
      const r = await fetch('/api/staff/page-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          id: section.id,
          pageSlug,
          sortOrder: section.sortOrder,
          sectionType: section.sectionType,
          data: section.data,
          active: section.active,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingId(null)
    }
  }

  async function addSection() {
    const r = await fetch('/api/staff/page-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        pageSlug,
        sectionType: addType,
        sortOrder: sections.length,
      }),
    })
    const d = await r.json()
    if (!r.ok) {
      alert(d.error || 'Add failed')
      return
    }
    await load(pageSlug)
    if (d.section?.id) setOpenId(d.section.id)
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section?')) return
    await fetch('/api/staff/page-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, pageSlug }),
    })
    await load(pageSlug)
  }

  const pageMeta = COMPOSABLE_PAGES.find((p) => p.slug === pageSlug)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--brand-dark)]">Pages</h2>
          <p className="text-sm text-[#5A6070]">
            Compose visitor pages with sections. Drag to reorder.
            {'\n'}Demo and trial only.
          </p>
        </div>
        {pageMeta ? (
          <a
            href={pageMeta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
            style={{ color: 'var(--brand-green)' }}
          >
            Preview {pageMeta.label}
          </a>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className={inputClass + ' max-w-xs'}
          value={pageSlug}
          onChange={(e) => setPageSlug(e.target.value)}
        >
          {COMPOSABLE_PAGES.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          className={inputClass + ' max-w-xs'}
          value={addType}
          onChange={(e) => setAddType(e.target.value as SectionType)}
        >
          {SECTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {SECTION_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void addSection()}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-green)] px-3 py-1.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add section
        </button>
      </div>

      {error ? <p className="text-sm text-[#A00]">{error}</p> : null}
      {loading ? <p className="text-sm text-[#5A6070]">Loading…</p> : null}

      {!loading && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  open={openId === section.id}
                  onToggle={() => setOpenId((id) => (id === section.id ? null : section.id))}
                  onChange={(next) =>
                    setSections((list) => list.map((s) => (s.id === next.id ? next : s)))
                  }
                  onSave={() => {
                    const latest = sections.find((s) => s.id === section.id) ?? section
                    void saveSection(latest)
                  }}
                  onDelete={() => void deleteSection(section.id)}
                  saving={savingId === section.id}
                />
              ))}
              {!sections.length ? (
                <p className="text-sm text-[#5A6070]">No sections yet. Add one from the library.</p>
              ) : null}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// Silence unused import if tree-shaken oddly
void CmsMediaUpload
