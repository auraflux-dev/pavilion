'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type GscRow = { query: string; clicks: number; impressions: number; ctr: number; position: number }
type Idea = { id: string; query: string; reason: string; status: string }
type Audit = {
  origin: string
  generatedAt: string
  counts: { pagesCrawled: number; onPageIssues: number; internal3xx: number }
  onPageIssues: { url: string; issues: string[] }[]
}

type Bundle = {
  config: {
    id: string
    name: string
    domain: string
    origin: string
    geoMode: string
    googleHd: string | null
    connection: {
      gscSiteUrl: string | null
      liveGoogle: boolean
      integrations: { tool: string; accountLabel: string; connected: boolean }[]
    }
  }
  ideas: Idea[]
  metrics: { importedAt: string; totals: { clicks: number; impressions: number; queries: number }; rows: GscRow[] } | null
}

export function StaffSeoPanel() {
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)
  const [audit, setAudit] = useState<Audit | null>(null)
  const [inviteUrl, setInviteUrl] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'rankings' | 'technical' | 'calendar' | 'settings'>('rankings')
  const [origin, setOrigin] = useState('')
  const [domain, setDomain] = useState('')
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/seo/workspace')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Could not load SEO workspace')
    setBundle(d.bundle)
    setBlocked(d.googleOAuthBlocked || null)
    setOrigin(d.bundle?.config?.origin || '')
    setDomain(d.bundle?.config?.domain || '')
    setName(d.bundle?.config?.name || '')
    const ar = await fetch('/api/staff/seo/audit')
    const ad = await ar.json()
    if (ar.ok) setAudit(ad.report)
  }, [])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get('oauth')
    const err = params.get('oauth_error')
    if (oauth === 'connected') setStatus('Google Search Console connected.')
    if (oauth === 'error' || oauth === 'partial') setStatus(err || 'Google connect failed.')
  }, [load])

  async function saveSettings() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/seo/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain, origin }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Save failed')
      setBundle(d.bundle)
      setStatus('Settings saved.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function runAudit() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Crawl failed')
      setAudit(d.report)
      setTab('technical')
      setStatus(`Crawled ${d.report?.counts?.pagesCrawled ?? 0} pages.`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Crawl failed')
    } finally {
      setBusy(false)
    }
  }

  async function pullGsc(seedBlog = false) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/seo/gsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedBlog }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'GSC pull failed')
      setStatus(
        seedBlog
          ? `Pulled ${d.totals?.queries ?? 0} queries. Seeded ${d.blogDrafts ?? 0} unpublished blog drafts.`
          : `Pulled ${d.totals?.queries ?? 0} queries.`,
      )
      await load()
      setTab(seedBlog ? 'calendar' : 'rankings')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'GSC pull failed')
    } finally {
      setBusy(false)
    }
  }

  async function createInvite() {
    setBusy(true)
    try {
      const r = await fetch('/api/staff/seo/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_invite' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Invite failed')
      setInviteUrl(d.invite?.url || '')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setBusy(false)
    }
  }

  const gsc = bundle?.config.connection.integrations.find((i) => i.tool === 'gsc' && i.connected)
  const rows = bundle?.metrics?.rows || []

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">SEO</h1>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          {`Rankings from Google Search Console.
Technical crawl is first-party. No DataForSEO. No Composio.
Regional and category queries first. Local geo only when sales confirms it.`}
        </p>
      </div>
      {status ? <p className="text-sm text-amber-800 whitespace-pre-line">{status}</p> : null}
      {blocked ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm whitespace-pre-line text-amber-900">
          {blocked}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {([
          ['rankings', 'Rankings'],
          ['technical', 'Technical'],
          ['calendar', 'Content'],
          ['settings', 'Settings'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[var(--brand-green)] text-white' : 'text-[#1A1A1A] hover:bg-[#F0F2F5]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rankings' ? (
        <div className="space-y-3">
          <p className="text-sm text-[#5A6070]">
            {gsc
              ? `Connected: ${gsc.accountLabel}. Property: ${bundle?.config.connection.gscSiteUrl || 'pick in Settings'}.`
              : 'Connect Search Console in Settings to pull live queries.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy || !gsc} onClick={() => void pullGsc(false)}>
              {busy ? 'Pulling…' : 'Pull GSC'}
            </Button>
            <a href="/api/staff/seo/oauth/google/start?tool=gsc">
              <Button type="button" size="sm" variant="outline" disabled={Boolean(blocked)}>
                Connect Google
              </Button>
            </a>
          </div>
          {bundle?.metrics ? (
            <p className="text-xs text-[#5A6070]">
              Last pull {new Date(bundle.metrics.importedAt).toLocaleString()}.{' '}
              {bundle.metrics.totals.queries} queries. {bundle.metrics.totals.clicks} clicks.
            </p>
          ) : null}
          <ul className="rounded-xl border border-[var(--border)] bg-white divide-y divide-[var(--border)]">
            {rows.slice(0, 25).map((row) => (
              <li key={row.query} className="p-3 text-sm flex justify-between gap-3">
                <span className="font-medium">{row.query}</span>
                <span className="text-xs text-[#5A6070]">
                  pos {row.position.toFixed(1)} · {row.clicks} clicks · {row.impressions} impr
                </span>
              </li>
            ))}
            {!rows.length ? (
              <li className="p-3 text-sm text-[#5A6070]">No ranking rows yet.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {tab === 'technical' ? (
        <div className="space-y-3">
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            {`Crawls the origin with Pavilion’s BYOD auditor.
Same runner as Business Rocket. Origin-agnostic.`}
          </p>
          <Button type="button" size="sm" disabled={busy} onClick={() => void runAudit()}>
            {busy ? 'Crawling…' : 'Run crawl'}
          </Button>
          {audit ? (
            <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-2">
              <p>
                {audit.origin} · {audit.counts.pagesCrawled} pages · {audit.counts.onPageIssues} on-page
                issues · {audit.counts.internal3xx} internal 3xx
              </p>
              <ul className="space-y-1">
                {audit.onPageIssues.slice(0, 12).map((item) => (
                  <li key={item.url} className="text-xs">
                    {item.url}: {item.issues.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[#5A6070]">No crawl stored yet.</p>
          )}
        </div>
      ) : null}

      {tab === 'calendar' ? (
        <div className="space-y-3">
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            {`Seed unpublished marketing blog drafts from GSC queries.
Open Blog to finish and publish.`}
          </p>
          <Button type="button" size="sm" disabled={busy || !gsc} onClick={() => void pullGsc(true)}>
            Seed blog drafts
          </Button>
          <ul className="rounded-xl border border-[var(--border)] bg-white divide-y divide-[var(--border)]">
            {(bundle?.ideas || []).slice(0, 20).map((idea) => (
              <li key={idea.id} className="p-3 text-sm">
                <p className="font-medium">{idea.query}</p>
                <p className="text-xs text-[#5A6070]">{idea.status} · {idea.reason}</p>
              </li>
            ))}
            {!bundle?.ideas?.length ? (
              <li className="p-3 text-sm text-[#5A6070]">No content ideas yet. Pull GSC first.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-white p-4">
          <label className="block text-sm">
            Name
            <input
              className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Domain
            <input
              className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Origin to crawl
            <input
              className="mt-1 w-full rounded border border-[var(--border)] px-3 py-2 text-sm"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void saveSettings()}>
              Save
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void createInvite()}>
              Invite GSC connect
            </Button>
          </div>
          {inviteUrl ? (
            <p className="text-xs break-all whitespace-pre-line">
              {`Send this link. It expires in 72 hours.
${inviteUrl}`}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
