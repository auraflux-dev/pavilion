'use client'

import { useState } from 'react'
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
import { GripVertical, Pencil, Trash2, Plus, ChevronUp } from 'lucide-react'
import { useLiveEditor, type LiveSectionRow } from '@/components/cms/live-editor-context'
import { PageSectionBlock } from '@/components/cms/page-sections-renderer'
import {
  SECTION_TYPE_META,
  SECTION_TYPES,
  isSectionType,
  parseSectionData,
  type SectionType,
} from '@/lib/cms/section-types'

const inputClass =
  'w-full rounded border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-[#1a1a1a]'

async function uploadCmsImage(file: File): Promise<string> {
  const body = new FormData()
  body.set('file', file)
  const r = await fetch('/api/staff/cms-media/upload', { method: 'POST', body })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Upload failed')
  return String(d.url)
}

function FieldEditor({
  type,
  data,
  onChange,
}: {
  type: SectionType
  data: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value })

  if (type === 'hero' || type === 'richText' || type === 'cta' || type === 'contact') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {'eyebrow' in (SECTION_TYPE_META[type].defaultData as object) || type === 'hero' ? (
          type === 'hero' ? (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#5A6070]">Eyebrow</span>
              <input className={inputClass} value={String(data.eyebrow ?? '')} onChange={(e) => set('eyebrow', e.target.value)} />
            </label>
          ) : null
        ) : null}
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-[#5A6070]">Title</span>
          <input
            className={inputClass}
            value={String(data.title ?? '')}
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-[#5A6070]">Body</span>
          <textarea
            className={inputClass}
            rows={3}
            value={String(data.body ?? '')}
            onChange={(e) => set('body', e.target.value)}
          />
        </label>
        {type === 'hero' || type === 'cta' ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#5A6070]">
                {type === 'hero' ? 'CTA label' : 'Button label'}
              </span>
              <input
                className={inputClass}
                value={String(type === 'hero' ? data.ctaLabel ?? '' : data.label ?? '')}
                onChange={(e) => set(type === 'hero' ? 'ctaLabel' : 'label', e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#5A6070]">
                {type === 'hero' ? 'CTA href' : 'Button href'}
              </span>
              <input
                className={inputClass}
                value={String(type === 'hero' ? data.ctaHref ?? '' : data.href ?? '')}
                onChange={(e) => set(type === 'hero' ? 'ctaHref' : 'href', e.target.value)}
              />
            </label>
          </>
        ) : null}
        {type === 'hero' ? (
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-[#5A6070]">Image</span>
            <input
              className={inputClass}
              value={String(data.imageUrl ?? '')}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="Image URL"
            />
            <input
              type="file"
              accept="image/*"
              className="mt-1 text-xs"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  set('imageUrl', await uploadCmsImage(f))
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Upload failed')
                }
                e.target.value = ''
              }}
            />
          </label>
        ) : null}
        {type === 'contact' ? (
          <>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#5A6070]">Mailto</span>
              <input className={inputClass} value={String(data.mailto ?? '')} onChange={(e) => set('mailto', e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-[#5A6070]">Form key</span>
              <input className={inputClass} value={String(data.formKey ?? '')} onChange={(e) => set('formKey', e.target.value)} />
            </label>
          </>
        ) : null}
      </div>
    )
  }

  if (type === 'bullets') {
    const items = Array.isArray(data.items) ? (data.items as string[]) : []
    return (
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Title</span>
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Items (one per line)</span>
          <textarea
            className={inputClass}
            rows={4}
            value={items.join('\n')}
            onChange={(e) => set('items', e.target.value.split('\n'))}
          />
        </label>
      </div>
    )
  }

  if (type === 'media') {
    return (
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Image URL</span>
          <input className={inputClass} value={String(data.url ?? '')} onChange={(e) => set('url', e.target.value)} />
        </label>
        <input
          type="file"
          accept="image/*"
          className="text-xs"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            try {
              set('url', await uploadCmsImage(f))
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Upload failed')
            }
            e.target.value = ''
          }}
        />
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Alt</span>
          <input className={inputClass} value={String(data.alt ?? '')} onChange={(e) => set('alt', e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Caption</span>
          <input className={inputClass} value={String(data.caption ?? '')} onChange={(e) => set('caption', e.target.value)} />
        </label>
      </div>
    )
  }

  if (type === 'pdfList') {
    const items = Array.isArray(data.items) ? (data.items as { label?: string; url?: string }[]) : []
    return (
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Title</span>
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Downloads (label|url per line)</span>
          <textarea
            className={inputClass}
            rows={4}
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
        </label>
      </div>
    )
  }

  if (type === 'gridCards') {
    const cards = Array.isArray(data.cards)
      ? (data.cards as { title?: string; body?: string; href?: string; imageUrl?: string }[])
      : []
    return (
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Title</span>
          <input className={inputClass} value={String(data.title ?? '')} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[#5A6070]">Cards (title||body||href||imageUrl)</span>
          <textarea
            className={inputClass}
            rows={4}
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
        </label>
      </div>
    )
  }

  if (type === 'spacer') {
    return (
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-[#5A6070]">Size</span>
        <select className={inputClass} value={String(data.size ?? 'md')} onChange={(e) => set('size', e.target.value)}>
          <option value="sm">Small</option>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
        </select>
      </label>
    )
  }

  return null
}

function SortableLiveSection({
  section,
  open,
  onToggle,
  onChange,
  onSave,
  onDelete,
  saving,
}: {
  section: LiveSectionRow
  open: boolean
  onToggle: () => void
  onChange: (next: LiveSectionRow) => void
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
    opacity: isDragging ? 0.85 : 1,
  }
  const type = isSectionType(section.sectionType) ? section.sectionType : null

  return (
    <div ref={setNodeRef} style={style} className="relative border-2 border-dashed border-[var(--brand-green)]/50">
      <div className="absolute left-2 top-2 z-20 flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-1 shadow">
        <button type="button" className="cursor-grab touch-none p-1 text-[#5A6070]" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <button type="button" className="p-1 text-[#5A6070]" onClick={onToggle} aria-label="Edit section">
          {open ? <ChevronUp className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
        <button type="button" className="p-1 text-[#A00]" onClick={onDelete} aria-label="Delete section">
          <Trash2 className="h-4 w-4" />
        </button>
        <span className="px-1 text-[10px] font-bold uppercase text-[#5A6070]">
          {type ? SECTION_TYPE_META[type].label : section.sectionType}
        </span>
      </div>
      {type ? (
        <PageSectionBlock
          section={{
            id: section.id,
            type,
            data: parseSectionData(type, section.data),
            sortOrder: section.sortOrder,
          }}
        />
      ) : null}
      {open && type ? (
        <div className="border-t border-[var(--border)] bg-white px-4 py-3">
          <FieldEditor
            type={type}
            data={section.data}
            onChange={(data) => onChange({ ...section, data })}
          />
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="mt-3 rounded-md bg-[var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save section'}
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function LiveSectionCanvas() {
  const {
    pageSlug,
    sections,
    setSections,
    loadingSections,
    setStatus,
    reloadSections,
  } = useLiveEditor()
  const [openId, setOpenId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [addType, setAddType] = useState<SectionType>('richText')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function persistReorder(next: LiveSectionRow[]) {
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
    const next = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({ ...s, sortOrder: i }))
    void persistReorder(next)
  }

  async function saveSection(section: LiveSectionRow) {
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
      if (d.demo) throw new Error(d.message || 'Preview only. Changes did not save.')
      setStatus('Section saved.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
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
      setStatus(d.error || 'Add failed')
      return
    }
    if (d.demo) {
      setStatus(d.message || 'Preview only. Changes did not save.')
      return
    }
    await reloadSections()
    if (d.section?.id) setOpenId(d.section.id)
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section?')) return
    await fetch('/api/staff/page-sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id, pageSlug }),
    })
    await reloadSections()
  }

  if (loadingSections) {
    return <p className="p-8 text-center text-sm text-[#5A6070]">Loading page editor…</p>
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--brand-warm)] px-4 py-2">
        <span className="text-xs font-bold text-[var(--brand-dark)]">Live page editor</span>
        <select
          className={inputClass + ' max-w-[10rem]'}
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
          className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-green)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add section
        </button>
        <span className="text-[10px] text-[#5A6070]">Drag handles to reorder. Edit opens fields under each block.</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section) => (
            <SortableLiveSection
              key={section.id}
              section={section}
              open={openId === section.id}
              onToggle={() => setOpenId((id) => (id === section.id ? null : section.id))}
              onChange={(next) => setSections((list) => list.map((s) => (s.id === next.id ? next : s)))}
              onSave={() => {
                const latest = sections.find((s) => s.id === section.id) ?? section
                void saveSection(latest)
              }}
              onDelete={() => void deleteSection(section.id)}
              saving={savingId === section.id}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!sections.length ? (
        <p className="p-8 text-center text-sm text-[#5A6070]">
          No sections yet. Add one from the library above.
        </p>
      ) : null}
    </div>
  )
}
