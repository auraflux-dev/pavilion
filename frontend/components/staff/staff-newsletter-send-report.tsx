'use client'

import { useCallback, useEffect, useState } from 'react'

type SendRow = {
  id: string
  subject: string
  utmCampaign: string
  recipientCount: number
  deliveredCount: number
  failedCount: number
  openCount: number
  clickCount: number
  sentAt: string
  sentByEmail: string
  linksJson: string
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function parseLinks(raw: string): { idx: number; url: string; clicks: number }[] {
  try {
    const parsed = JSON.parse(raw || '[]') as { idx?: number; url?: string; clicks?: number }[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((l) => ({
        idx: Number(l.idx ?? 0),
        url: String(l.url ?? ''),
        clicks: Number(l.clicks ?? 0),
      }))
      .filter((l) => l.url)
  } catch {
    return []
  }
}

/** Friendly send report for Marketing (not raw CMS fields). */
export function StaffNewsletterSendReportPanel() {
  const [rows, setRows] = useState<SendRow[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/staff/cms/NewsletterSends')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load send stats')
      const items = (d.items ?? []) as Record<string, unknown>[]
      setRows(
        items
          .filter((row) => row.active !== false)
          .map((row) => ({
            id: String(row.id ?? ''),
            subject: String(row.subject ?? '(no subject)'),
            utmCampaign: String(row.utmCampaign ?? ''),
            recipientCount: num(row.recipientCount),
            deliveredCount: num(row.deliveredCount),
            failedCount: num(row.failedCount),
            openCount: num(row.openCount),
            clickCount: num(row.clickCount),
            sentAt: String(row.sentAt ?? ''),
            sentByEmail: String(row.sentByEmail ?? ''),
            linksJson: String(row.linksJson ?? '[]'),
          }))
          .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
      )
      setStatus('')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section
      id="newsletter-send-stats"
      className="scroll-mt-28 rounded-xl border border-[var(--border)] bg-white p-5 space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Send report</h2>
          <p className="text-xs text-[#5A6070] mt-1 whitespace-pre-line">
            Delivered, failed, opens, and top clicks after a send.
            {'\n'}
            Opens are approximate (some inboxes block pixels). Clicks use our /r/ links.
          </p>
        </div>
        <button
          type="button"
          className="text-sm underline"
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      {status ? <p className="text-sm text-[#1A1A1A]">{status}</p> : null}
      {busy && !rows.length ? <p className="text-sm text-[#5A6070]">Loading…</p> : null}
      {!busy && !rows.length ? (
        <p className="text-sm text-[#5A6070]">No sends yet. After a test or member send, stats land here.</p>
      ) : null}
      <ul className="space-y-3">
        {rows.slice(0, 12).map((row) => {
          const links = parseLinks(row.linksJson)
            .filter((l) => l.clicks > 0)
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 3)
          const when = row.sentAt
            ? new Date(row.sentAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : ''
          return (
            <li key={row.id} className="rounded-lg border border-[var(--border)] p-3 space-y-2">
              <p className="text-sm font-semibold text-[#1A1A1A]">{row.subject}</p>
              <p className="text-[11px] text-[#5A6070]">
                {when}
                {row.utmCampaign ? ` · ${row.utmCampaign}` : ''}
                {row.sentByEmail ? ` · ${row.sentByEmail}` : ''}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <Stat label="Recipients" value={row.recipientCount} />
                <Stat label="Delivered" value={row.deliveredCount} />
                <Stat label="Failed" value={row.failedCount} />
                <Stat label="Opens" value={row.openCount} />
                <Stat label="Clicks" value={row.clickCount} />
              </div>
              {links.length ? (
                <ul className="text-[11px] text-[#5A6070] space-y-0.5">
                  {links.map((l) => (
                    <li key={`${row.id}-${l.idx}`} className="truncate">
                      {l.clicks} click{l.clicks === 1 ? '' : 's'} · {l.url}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[#FAFAF8] px-2 py-1.5">
      <p className="text-base font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[#5A6070]">{label}</p>
    </div>
  )
}
