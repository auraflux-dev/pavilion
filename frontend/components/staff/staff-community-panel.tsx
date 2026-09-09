'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Space = { id: string; kind: string; key: string; title: string }
type Post = {
  id: string
  authorName: string
  authorKind: string
  body: string
  pinned: boolean
  hidden: boolean
  createdAt: string
  replyCount?: number
}

export function StaffCommunityPanel() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [spaceId, setSpaceId] = useState('')
  const [posts, setPosts] = useState<Post[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async (sid?: string) => {
    const q = new URLSearchParams()
    if (sid) q.set('spaceId', sid)
    const res = await fetch(`/api/staff/community?${q}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(data.error || 'Could not load')
      return
    }
    setSpaces(data.spaces ?? [])
    if (data.spaceId) setSpaceId(data.spaceId)
    setPosts(data.posts ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function announce() {
    if (!draft.trim() || !spaceId) return
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId, body: draft }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setDraft('')
      setStatus('Posted.')
      await load(spaceId)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function mod(action: 'hide' | 'unhide' | 'pin' | 'unpin', postId: string) {
    const res = await fetch('/api/staff/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, postId }),
    })
    if (res.ok) await load(spaceId)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Community</h2>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          Grade and committee feeds for families.
          Parents can post and reply. Moderate here.
        </p>
        <p className="text-xs text-[#5A6070] mt-2">
          Families open Community from the Family login calendar card.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {spaces.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSpaceId(s.id)
              void load(s.id)
            }}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold border ${
              spaceId === s.id
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                : 'bg-white text-[#5A6070] border-[var(--border)]'
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-white p-3 space-y-2">
        <p className="text-xs font-bold text-[#1A1A1A]">Staff announce</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
          placeholder="Post as Staff to this space…"
        />
        <Button type="button" size="sm" disabled={busy || !draft.trim()} onClick={() => void announce()}>
          Post
        </Button>
        {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      </div>

      <div className="space-y-2">
        {posts.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-3 ${p.hidden ? 'opacity-50 border-dashed' : 'border-[var(--border)] bg-white'}`}
          >
            <p className="text-xs font-bold text-[#1A1A1A]">
              {p.pinned ? 'Pinned · ' : ''}
              {p.authorName}
              {p.authorKind === 'staff' ? ' · Staff' : ' · Parent'}
              {p.hidden ? ' · Hidden' : ''}
            </p>
            <p className="text-sm text-[#1A1A1A] whitespace-pre-line mt-1">{p.body}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--brand-green)]"
                onClick={() => void mod(p.hidden ? 'unhide' : 'hide', p.id)}
              >
                {p.hidden ? 'Unhide' : 'Hide'}
              </button>
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--brand-green)]"
                onClick={() => void mod(p.pinned ? 'unpin' : 'pin', p.id)}
              >
                {p.pinned ? 'Unpin' : 'Pin'}
              </button>
              <span className="text-[11px] text-[#5A6070]">
                {(p.replyCount ?? 0) === 1 ? '1 reply' : `${p.replyCount ?? 0} replies`}
              </span>
            </div>
          </div>
        ))}
        {posts.length === 0 ? (
          <p className="text-sm text-[#5A6070]">No posts in this space yet.</p>
        ) : null}
      </div>
    </div>
  )
}
