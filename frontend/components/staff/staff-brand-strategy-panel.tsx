'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Kit = {
  id: string
  title: string
  status: string
  updatedAt: string
  approvedAt: string | null
  outputMd: string | null
}

export function StaffBrandStrategyPanel() {
  const [kits, setKits] = useState<Kit[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('Pavilion')
  const [websiteUrl, setWebsiteUrl] = useState('https://onpavilion.com')
  const [pitch, setPitch] = useState(
    'PTO and PTA software for school boards. Membership, events, and staff in one product.',
  )
  const [competitors, setCompetitors] = useState('MemberHub, MemberPlanet, SignUpGenius')
  const [followups, setFollowups] = useState<{ question: string; answer?: string }[]>([])
  const [kitId, setKitId] = useState('')
  const [outputMd, setOutputMd] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [warning, setWarning] = useState('')

  const load = useCallback(async () => {
    const list = await fetch('/api/staff/brand/active?list=1')
    const ld = await list.json()
    if (list.ok) setKits(ld.kits || [])
    const active = await fetch('/api/staff/brand/active')
    const ad = await active.json()
    if (active.ok) {
      setActiveId(ad.kit?.id || null)
      if (ad.kit?.outputMd) setOutputMd(ad.kit.outputMd)
    }
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function generate(phase: 'followups' | 'strategy') {
    setBusy(true)
    setStatus('')
    setWarning('')
    try {
      const r = await fetch('/api/staff/brand/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          kitId: kitId || undefined,
          inputs: {
            brandName,
            websiteUrl,
            pitch,
            competitors: competitors
              .split(',')
              .map((n) => n.trim())
              .filter(Boolean)
              .map((name) => ({ name })),
          },
          followups,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Generate failed')
      setKitId(d.kitId)
      if (d.followups) setFollowups(d.followups)
      if (d.outputMd) setOutputMd(d.outputMd)
      if (d.warning) setWarning(d.warning)
      setStatus(phase === 'followups' ? 'Answer the follow-ups, then generate.' : 'Strategy ready. Approve to make it active.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Generate failed')
    } finally {
      setBusy(false)
    }
  }

  async function approve(id: string) {
    setBusy(true)
    try {
      const r = await fetch(`/api/staff/brand/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Approve failed')
      setStatus('Approved. Active kit API is GET /api/staff/brand/active.')
      if (d.markdown) setOutputMd(d.markdown)
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Brand strategy</h1>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          {`Voice kits for boards and content.
This is not the visual Brand workspace (logo and colors).
Approve a kit to expose it on GET /api/staff/brand/active.`}
        </p>
      </div>
      {status ? <p className="text-sm text-amber-800 whitespace-pre-line">{status}</p> : null}
      {warning ? <p className="text-sm text-[#5A6070] whitespace-pre-line">{warning}</p> : null}

      <div className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
        <label className="block text-sm">
          Brand name
          <input
            className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Website
          <input
            className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Pitch
          <textarea
            className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm min-h-[90px] whitespace-pre-line"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Competitors (comma separated)
          <input
            className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void generate('followups')}>
            {busy ? 'Working…' : 'Ask follow-ups'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void generate('strategy')}
          >
            Generate kit
          </Button>
        </div>
      </div>

      {followups.length ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
          {followups.map((f, i) => (
            <label key={f.question} className="block text-sm">
              {f.question}
              <textarea
                className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm min-h-[60px]"
                value={f.answer || ''}
                onChange={(e) => {
                  const next = [...followups]
                  next[i] = { ...f, answer: e.target.value }
                  setFollowups(next)
                }}
              />
            </label>
          ))}
        </div>
      ) : null}

      {outputMd ? (
        <pre className="rounded-xl border border-[var(--border)] bg-white p-4 text-xs whitespace-pre-wrap overflow-auto max-h-[420px]">
          {outputMd}
        </pre>
      ) : null}

      {kitId ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void approve(kitId)}>
            Approve active kit
          </Button>
          <a href={`/api/staff/brand/${encodeURIComponent(kitId)}/export`}>
            <Button type="button" size="sm" variant="outline">
              Download brand-guidelines.md
            </Button>
          </a>
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-bold text-[#1A1A1A] mb-2">Kits</h2>
        <ul className="rounded-xl border border-[var(--border)] bg-white divide-y divide-[var(--border)]">
          {kits.map((kit) => (
            <li key={kit.id} className="p-3 text-sm flex flex-wrap items-center justify-between gap-2">
              <span>
                {kit.title} · {kit.status}
                {kit.id === activeId ? ' · active' : ''}
              </span>
              <span className="flex gap-2">
                {kit.status !== 'approved' ? (
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void approve(kit.id)}>
                    Approve
                  </Button>
                ) : null}
                <a href={`/api/staff/brand/${encodeURIComponent(kit.id)}/export`}>
                  <Button type="button" size="sm" variant="outline">
                    Export
                  </Button>
                </a>
              </span>
            </li>
          ))}
          {!kits.length ? <li className="p-3 text-sm text-[#5A6070]">No kits yet.</li> : null}
        </ul>
      </div>
    </section>
  )
}
