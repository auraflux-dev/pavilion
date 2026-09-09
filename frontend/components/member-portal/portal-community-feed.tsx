'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Space = { id: string; kind: string; key: string; title: string }
type Post = {
  id: string
  spaceId: string
  authorName: string
  authorKind: string
  body: string
  pinned: boolean
  hidden?: boolean
  createdAt: string
  replyCount?: number
}

export function PortalCommunityFeed({
  grades = [],
  authorName = '',
}: {
  grades?: string[]
  authorName?: string
}) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [replies, setReplies] = useState<Post[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [threadRoot, setThreadRoot] = useState<Post | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (sid?: string, parentId?: string | null) => {
    setError('')
    const q = new URLSearchParams()
    if (grades.length) q.set('grades', grades.join(','))
    if (sid) q.set('spaceId', sid)
    if (parentId) q.set('parentId', parentId)
    const res = await fetch(`/api/portal/community?${q}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Could not load community')
      return
    }
    setSpaces(data.spaces ?? [])
    if (data.spaceId) setSpaceId(data.spaceId)
    if (parentId) {
      setReplies(data.replies ?? [])
    } else {
      setPosts(data.posts ?? [])
      setReplies([])
      setThreadId(null)
      setThreadRoot(null)
    }
  }, [grades])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(parentPostId?: string | null) {
    if (!draft.trim() || !spaceId) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/portal/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          body: draft,
          parentPostId: parentPostId || undefined,
          authorName,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not post')
      setDraft('')
      await load(spaceId, parentPostId || null)
      if (parentPostId) setThreadId(parentPostId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post')
    } finally {
      setBusy(false)
    }
  }

  async function openThread(post: Post) {
    setThreadId(post.id)
    setThreadRoot(post)
    await load(spaceId, post.id)
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-[220px]">
      <div className="flex flex-wrap gap-1.5">
        {spaces.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSpaceId(s.id)
              void load(s.id)
            }}
            className={`rounded-md px-2 py-1 text-[11px] font-semibold border ${
              spaceId === s.id
                ? 'text-white border-transparent'
                : 'text-[#5A6070] border-[var(--border)] bg-white'
            }`}
            style={spaceId === s.id ? { backgroundColor: 'var(--brand-green)' } : undefined}
          >
            {s.title}
          </button>
        ))}
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      {threadId ? (
        <div className="flex flex-col gap-2 flex-1">
          <button
            type="button"
            className="text-xs font-semibold text-[var(--brand-green)] self-start"
            onClick={() => void load(spaceId)}
          >
            Back to feed
          </button>
          <div className="flex-1 overflow-y-auto space-y-2 max-h-48">
            {threadRoot ? (
              <div className="rounded-md border border-[var(--border)] bg-[#FAF8F4] p-2">
                <p className="text-[11px] font-bold text-[#1A1A1A]">
                  {threadRoot.authorName}
                  {threadRoot.authorKind === 'staff' ? ' · Staff' : ''}
                </p>
                <p className="text-sm text-[#1A1A1A] whitespace-pre-line mt-0.5">{threadRoot.body}</p>
              </div>
            ) : null}
            {replies.map((r) => (
              <div key={r.id} className="rounded-md border border-[var(--border)] bg-white p-2">
                <p className="text-[11px] font-bold text-[#1A1A1A]">
                  {r.authorName}
                  {r.authorKind === 'staff' ? ' · Staff' : ''}
                </p>
                <p className="text-sm text-[#1A1A1A] whitespace-pre-line mt-0.5">{r.body}</p>
              </div>
            ))}
            {replies.length === 0 ? (
              <p className="text-xs text-[#5A6070]">No replies yet. Start the thread.</p>
            ) : null}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Write a reply…"
            className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
          />
          <Button type="button" size="sm" disabled={busy || !draft.trim()} onClick={() => void submit(threadId)}>
            Reply
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex-1 overflow-y-auto space-y-2 max-h-48">
            {posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void openThread(p)}
                className="w-full text-left rounded-md border border-[var(--border)] bg-white p-2 hover:border-[var(--brand-green)]"
              >
                <p className="text-[11px] font-bold text-[#1A1A1A]">
                  {p.pinned ? 'Pinned · ' : ''}
                  {p.authorName}
                  {p.authorKind === 'staff' ? ' · Staff' : ''}
                </p>
                <p className="text-sm text-[#1A1A1A] whitespace-pre-line mt-0.5 line-clamp-3">{p.body}</p>
                <p className="text-[10px] text-[#5A6070] mt-1">
                  {(p.replyCount ?? 0) === 1 ? '1 reply' : `${p.replyCount ?? 0} replies`}
                </p>
              </button>
            ))}
            {posts.length === 0 ? (
              <p className="text-xs text-[#5A6070]">
                No posts yet in this space.
                Share a question or update for other families.
              </p>
            ) : null}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Post to this space…"
            className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
          />
          <Button type="button" size="sm" disabled={busy || !draft.trim()} onClick={() => void submit()}>
            Post
          </Button>
        </div>
      )}
    </div>
  )
}
