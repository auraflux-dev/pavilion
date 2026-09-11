'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { StaffPlainCopyField } from '@/components/staff/staff-plain-copy-field'
import { normalizePlainCopy } from '@/lib/copy/plain-staff-copy'

type BlogPost = {
  id: string
  slug: string
  title: string
  date: string
  category: string
  excerpt: string
  minutes: number
  bodyMarkdown: string
  active: boolean
}

const EMPTY_FORM = {
  title: '',
  slug: '',
  date: new Date().toISOString().slice(0, 10),
  category: 'Product',
  excerpt: '',
  minutes: 4,
  bodyMarkdown: '',
  active: true,
}

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function StaffMarketingBlogPanel() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/staff/marketing-blog')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      setPosts(d.posts ?? [])
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function startNew() {
    setEditing(null)
    setSlugTouched(false)
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) })
    setStatus('')
  }

  function startEdit(post: BlogPost) {
    setEditing(post)
    setSlugTouched(true)
    setForm({
      title: post.title,
      slug: post.slug,
      date: post.date.slice(0, 10),
      category: post.category,
      excerpt: post.excerpt,
      minutes: post.minutes,
      bodyMarkdown: post.bodyMarkdown,
      active: post.active,
    })
    setStatus('')
  }

  async function save() {
    setBusy(true)
    setStatus('')
    try {
      const body = {
        id: editing?.id,
        title: form.title.trim(),
        slug: (form.slug.trim() || slugify(form.title)).trim(),
        date: form.date.trim(),
        category: form.category.trim(),
        excerpt: normalizePlainCopy(form.excerpt),
        minutes: form.minutes,
        bodyMarkdown: normalizePlainCopy(form.bodyMarkdown),
        active: form.active,
      }
      const r = await fetch('/api/staff/marketing-blog', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      setStatus(editing ? 'Post updated.' : 'Post published.')
      startNew()
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(post: BlogPost) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/marketing-blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, active: !post.active }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Marketing blog</h1>
        <p className="mt-1 text-sm text-[#5A6070] whitespace-pre-line">
          {`Posts on www.onpavilion.com/blog.
Published rows go live on the marketing site within about a minute.
Use Markdown for the body.`}
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="text-lg font-bold text-[#1A1A1A]">
            {editing ? 'Edit post' : 'New post'}
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={startNew}>
            New
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={form.title}
            onChange={(e) => {
              const title = e.target.value
              setForm((f) => ({
                ...f,
                title,
                slug: slugTouched ? f.slug : slugify(title),
              }))
            }}
            placeholder="Title"
            className="sm:col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              setForm((f) => ({ ...f, slug: e.target.value }))
            }}
            placeholder="slug-for-url"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono text-xs"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Category"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            max={60}
            value={form.minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, minutes: Number(e.target.value) || 3 }))
            }
            placeholder="Minutes"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            placeholder="Excerpt"
            className="sm:col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2">
            <StaffPlainCopyField
              label="Body (Markdown)"
              value={form.bodyMarkdown}
              rows={10}
              onChange={(next) => setForm((f) => ({ ...f, bodyMarkdown: next }))}
              onCommit={(next) =>
                setForm((f) => ({ ...f, bodyMarkdown: normalizePlainCopy(next) }))
              }
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-1.5 text-xs text-[#5A6070]">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Published on www.onpavilion.com/blog
        </label>

        <Button
          disabled={
            busy || !form.title.trim() || !form.date || !form.category.trim() || !form.excerpt.trim()
          }
          onClick={() => void save()}
          className="text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish post'}
        </Button>

        {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-3">
        <h2 className="text-lg font-bold text-[#1A1A1A]">All posts</h2>
        {loading ? <p className="text-xs text-[#5A6070]">Loading…</p> : null}
        {!loading && posts.length === 0 ? (
          <p className="text-sm text-[#5A6070]">No posts yet.</p>
        ) : null}
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-start justify-between gap-2 border-t border-[#F0EBE3] pt-2"
            >
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {post.title}
                  {!post.active ? ' · draft' : ''}
                </p>
                <p className="text-xs text-[#5A6070]">
                  {post.category} · {post.date} · /blog/{post.slug}
                </p>
                <p className="text-xs text-[#5A6070] mt-0.5">{post.excerpt}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(post)}>
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void toggleActive(post)}
                >
                  {post.active ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
