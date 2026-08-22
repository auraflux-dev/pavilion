'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CANVA_MARKETING_FOLDER_URL } from '@/lib/canva/config'
import type { CanvaDesign } from '@/lib/canva/client'

type Status = {
  clientConfigured: boolean
  sharedConfigured: boolean
  staffConnected: boolean
  connected: boolean
  mode?: string | null
  user?: { displayName: string; teamName: string } | null
  error?: string
  brandAssetsUrl?: string
  marketingFolderUrl?: string
  setup?: { redirectUriProd: string; redirectUriLocal: string; docs: string }
}

type Props = {
  onOpenWorkspace?: (id: string) => void
}

export function StaffCanvaPanel({ onOpenWorkspace }: Props) {
  const [status, setStatus] = useState<Status | null>(null)
  const [designs, setDesigns] = useState<CanvaDesign[]>([])
  const [continuation, setContinuation] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [showConnect, setShowConnect] = useState(false)

  const folderUrl = status?.marketingFolderUrl || CANVA_MARKETING_FOLDER_URL

  const loadStatus = useCallback(async () => {
    const r = await fetch('/api/staff/canva/status')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not load Canva status')
    setStatus(d)
    return d as Status
  }, [])

  const loadDesigns = useCallback(async (q?: string, cont?: string | null, append = false) => {
    const params = new URLSearchParams()
    if (q?.trim()) params.set('q', q.trim())
    if (cont) params.set('continuation', cont)
    const r = await fetch(`/api/staff/canva/designs?${params}`)
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Could not list designs')
    setDesigns((prev) => (append ? [...prev, ...(d.designs ?? [])] : d.designs ?? []))
    setContinuation(d.continuation ?? null)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setMsg('')
    try {
      const st = await loadStatus()
      if (st.connected) await loadDesigns(query)
      else setDesigns([])
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not load Canva')
    } finally {
      setLoading(false)
    }
  }, [loadStatus, loadDesigns, query])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('canva')
    if (flag === 'connected') setMsg('Canva connected.')
    else if (flag && flag !== 'connected') setMsg(`Canva connect issue: ${flag}`)
  }, [])

  async function copyLink(design: CanvaDesign) {
    try {
      await navigator.clipboard.writeText(design.editUrl)
      setCopiedId(design.id)
      setMsg('Edit link copied. Paste into Comms calendar Asset link or Social caption.')
      setTimeout(() => setCopiedId(''), 2000)
    } catch {
      setMsg(design.editUrl)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      const r = await fetch('/api/staff/canva/disconnect', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Disconnect failed')
      setMsg('Disconnected your Canva login from Staff.')
      await refresh()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  async function createDraft() {
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/staff/canva/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'SHMS PTO draft' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Create failed')
      if (d.design?.editUrl) window.open(d.design.editUrl, '_blank', 'noopener,noreferrer')
      await loadDesigns(query)
      setMsg('Draft created in Canva.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function copyFolderUrl() {
    try {
      await navigator.clipboard.writeText(folderUrl)
      setMsg('Marketing folder link copied.')
    } catch {
      setMsg(folderUrl)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#1B2A4A]">Canva</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#5A6070]">
          VP Marketing works in the designated PTO Canva folder (currently owned by{' '}
          <strong>gregory.robert.c@gmail.com</strong>. Invite Marketing / Diane for access). Save
          designs there, then paste edit links into Comms & content or Social. Brand logos:{' '}
          <a href="/brand" className="underline" target="_blank" rel="noreferrer">
            /brand
          </a>
          .
        </p>
      </div>

      {msg ? <p className="text-sm text-[#1B2A4A]">{msg}</p> : null}
      {loading ? <p className="text-sm text-[#5A6070]">Loading…</p> : null}

      <div className="rounded-xl border border-[var(--brand-line)] bg-[#FAFCF9] p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">Marketing Canva folder</p>
        <p className="text-xs text-[#5A6070] leading-relaxed">
          Open this folder to create and edit PTO graphics. Ask Rob to share/invite if you can’t
          open it. No Developer Portal needed for day-to-day work.
        </p>
        <p className="text-[11px] break-all text-[#5A6070]">{folderUrl}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={() => window.open(folderUrl, '_blank', 'noopener,noreferrer')}
          >
            Open Marketing folder
          </Button>
          <Button type="button" variant="outline" onClick={() => void copyFolderUrl()}>
            Copy folder link
          </Button>
          <Button type="button" variant="outline" onClick={() => window.open('/brand', '_blank')}>
            Brand asset URLs
          </Button>
          {onOpenWorkspace ? (
            <Button type="button" variant="outline" onClick={() => onOpenWorkspace('comms')}>
              Open Comms calendar
            </Button>
          ) : null}
        </div>
      </div>

      {status?.connected ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[#FAFAF8] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                API connected{status.user?.displayName ? ` · ${status.user.displayName}` : ''}
              </p>
              <p className="text-xs text-[#5A6070]">
                {status.user?.teamName ? `${status.user.teamName} · ` : ''}
                mode: {status.mode}
                {status.staffConnected ? ' · your Staff login' : ''}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void refresh()}>
              Refresh
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void createDraft()}>
              New draft
            </Button>
            {status.staffConnected ? (
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void disconnect()}>
                Disconnect
              </Button>
            ) : null}
          </div>

          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void loadDesigns(query).catch((err) =>
                setMsg(err instanceof Error ? err.message : 'Search failed'),
              )
            }}
          >
            <input
              className="min-w-[12rem] flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search designs…"
            />
            <Button type="submit" variant="outline" disabled={busy}>
              Search
            </Button>
          </form>

          {designs.length === 0 && !loading ? (
            <p className="text-sm text-[#5A6070]">No designs found via API.</p>
          ) : null}

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => (
              <li key={d.id} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden flex flex-col">
                <div className="aspect-video bg-[#F0EDE8] flex items-center justify-center overflow-hidden">
                  {d.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-[#5A6070]">No preview</span>
                  )}
                </div>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-[#1A1A1A] line-clamp-2">{d.title}</p>
                  <p className="text-[11px] text-[#5A6070]">
                    {d.updatedAt
                      ? `Updated ${new Date(d.updatedAt).toLocaleDateString()}`
                      : d.id}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Button type="button" size="sm" asChild>
                      <a href={d.editUrl} target="_blank" rel="noreferrer">
                        Edit in Canva
                      </a>
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void copyLink(d)}>
                      {copiedId === d.id ? 'Copied' : 'Copy link'}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {continuation ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void loadDesigns(query, continuation, true).catch((err) =>
                  setMsg(err instanceof Error ? err.message : 'Load more failed'),
                )
              }
            >
              Load more
            </Button>
          ) : null}
        </>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[#FAFAF8] p-4 space-y-2">
          <button
            type="button"
            className="text-sm font-semibold text-[#1A1A1A] underline-offset-2 hover:underline"
            onClick={() => setShowConnect((v) => !v)}
          >
            {showConnect ? 'Hide' : 'Optional'}: Connect Canva API (browse in Staff)
          </button>
          {showConnect ? (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-[#5A6070] leading-relaxed">
                Optional later. Day-to-day Marketing only needs the folder link above. API Connect
                can wait until a PTO-owned Canva app exists. See{' '}
                <code className="text-[11px]">docs/CANVA-SETUP.md</code>.
              </p>
              {!status?.clientConfigured ? (
                <p className="text-xs text-amber-900 whitespace-pre-line">
                  Canva API credentials are not set on the server yet.
                  {'\n'}
                  Folder workflow still works. Rob must add CANVA_CLIENT_ID on Vercel and register
                  https://www.shmspto.org/api/staff/canva/connect/callback in the Canva Developer Portal.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    window.location.href = '/api/staff/canva/connect'
                  }}
                >
                  Connect Canva API
                </Button>
              )}
              {status?.error ? (
                <p className="text-xs text-amber-900">Last token error: {status.error}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
