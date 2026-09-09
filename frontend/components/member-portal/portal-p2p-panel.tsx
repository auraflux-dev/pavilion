'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Campaign = { id: string; title: string; story: string; goalCents: number }
type Page = {
  id: string
  campaignId: string
  shareCode: string
  raisedCents: number
  blurb: string
  campaignTitle?: string
}

export function PortalP2pPanel({ authorName = '' }: { authorName?: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [blurb, setBlurb] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [origin, setOrigin] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/portal/p2p')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(data.error || 'Could not load')
      return
    }
    setCampaigns(data.campaigns ?? [])
    setPages(data.pages ?? [])
    if (!campaignId && data.campaigns?.[0]?.id) setCampaignId(data.campaigns[0].id)
  }, [campaignId])

  useEffect(() => {
    void load()
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [load])

  async function createPage() {
    if (!campaignId) return
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/portal/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, blurb, authorName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStatus(`Your page is ready: /p2p/${data.page?.shareCode}`)
      setBlurb('')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (campaigns.length === 0 && pages.length === 0) {
    return (
      <p className="text-xs text-[#5A6070]">
        No peer-to-peer campaigns are open right now.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#5A6070] whitespace-pre-line">
        Open a personal fundraising page.
        Share your link with friends and family.
      </p>

      {pages.length > 0 ? (
        <ul className="space-y-2">
          {pages.map((p) => {
            const href = `${origin}/p2p/${p.shareCode}`
            return (
              <li key={p.id} className="rounded-md border border-[var(--border)] bg-white p-2">
                <p className="text-xs font-bold text-[#1A1A1A]">
                  {p.campaignTitle || 'Campaign'} · ${(p.raisedCents / 100).toFixed(0)} raised
                </p>
                <a
                  href={href}
                  className="text-[11px] font-semibold text-[var(--brand-green)] break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  {href || `/p2p/${p.shareCode}`}
                </a>
              </li>
            )
          })}
        </ul>
      ) : null}

      {campaigns.length > 0 ? (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[#FAF8F4] p-2">
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <textarea
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            rows={2}
            placeholder="Why you are raising (optional)…"
            className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
          />
          <Button type="button" size="sm" disabled={busy || !campaignId} onClick={() => void createPage()}>
            Get my share link
          </Button>
        </div>
      ) : null}

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
    </div>
  )
}
