'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Campaign = {
  id: string
  slug: string
  title: string
  story: string
  goalCents: number
  active: boolean
  raisedCents: number
  pageCount: number
}

type PageRow = {
  id: string
  shareCode: string
  ownerName: string
  ownerEmail: string
  raisedCents: number
  blurb: string
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`
}

export function StaffP2pPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [goalDollars, setGoalDollars] = useState('1000')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async (campaignId?: string) => {
    const q = campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : ''
    const res = await fetch(`/api/staff/p2p${q}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(data.error || 'Could not load')
      return
    }
    setCampaigns(data.campaigns ?? [])
    setPages(data.pages ?? [])
    if (campaignId) setSelectedId(campaignId)
    else if (data.campaigns?.[0]?.id && !selectedId) setSelectedId(data.campaigns[0].id)
  }, [selectedId])

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    if (!title.trim()) return
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          story,
          goalDollars: Number(goalDollars) || 0,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      setTitle('')
      setStory('')
      setStatus('Campaign created. Parents can open a personal page from Family login.')
      await load(data.campaign?.id)
      if (data.campaign?.id) setSelectedId(data.campaign.id)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(c: Campaign) {
    await fetch('/api/staff/p2p', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setActive', campaignId: c.id, active: !c.active }),
    })
    await load(selectedId || c.id)
  }

  return (
    <div id="fundraising-p2p" className="scroll-mt-28 space-y-4 rounded-xl border border-[var(--border)] bg-white p-5">
      <div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Peer-to-peer campaigns</h2>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          Create a school campaign.
          Parents get a personal share link. Donations credit their page.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[#FAF8F4] p-3 space-y-2">
        <p className="text-xs font-bold text-[#1A1A1A]">New campaign</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. Spring Fun Run)"
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
        />
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          rows={3}
          placeholder="Story for every personal page…"
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
        />
        <input
          type="number"
          min="0"
          value={goalDollars}
          onChange={(e) => setGoalDollars(e.target.value)}
          placeholder="Goal ($)"
          className="w-40 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
        />
        <Button type="button" size="sm" disabled={busy || !title.trim()} onClick={() => void create()}>
          Create campaign
        </Button>
        {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      </div>

      <div className="space-y-2">
        {campaigns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setSelectedId(c.id)
              void load(c.id)
            }}
            className={`w-full text-left rounded-lg border p-3 ${
              selectedId === c.id ? 'border-[#1A1A1A] bg-[#FAF8F4]' : 'border-[var(--border)]'
            }`}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {c.title}
                {!c.active ? ' · Paused' : ''}
              </p>
              <p className="text-xs text-[#5A6070]">
                {dollars(c.raisedCents)}
                {c.goalCents > 0 ? ` of ${dollars(c.goalCents)}` : ''} · {c.pageCount} pages
              </p>
            </div>
            <p className="text-[11px] text-[#5A6070] mt-1">/{c.slug}</p>
          </button>
        ))}
        {campaigns.length === 0 ? (
          <p className="text-sm text-[#5A6070]">No campaigns yet.</p>
        ) : null}
      </div>

      {selectedId ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#1A1A1A]">Personal pages</p>
            {campaigns.find((c) => c.id === selectedId) ? (
              <button
                type="button"
                className="text-[11px] font-semibold text-[var(--brand-green)]"
                onClick={() => {
                  const c = campaigns.find((x) => x.id === selectedId)
                  if (c) void toggleActive(c)
                }}
              >
                {campaigns.find((c) => c.id === selectedId)?.active ? 'Pause campaign' : 'Activate'}
              </button>
            ) : null}
          </div>
          {pages.map((p) => (
            <div key={p.id} className="rounded-md border border-[var(--border)] px-3 py-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {p.ownerName} · {dollars(p.raisedCents)}
              </p>
              <p className="text-[11px] text-[#5A6070]">
                /p2p/{p.shareCode} · {p.ownerEmail}
              </p>
              {p.blurb ? (
                <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">{p.blurb}</p>
              ) : null}
            </div>
          ))}
          {pages.length === 0 ? (
            <p className="text-sm text-[#5A6070]">No personal pages yet for this campaign.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
