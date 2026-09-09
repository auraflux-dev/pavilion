'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type Row = {
  id: string
  email: string
  legalName: string
  tinLast4: string
  addressLine: string
  w9OnFile: boolean
  ytdPaidCents: number
}

export function StaffTaxPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [needing, setNeeding] = useState<Row[]>([])
  const [email, setEmail] = useState('')
  const [legalName, setLegalName] = useState('')
  const [tinLast4, setTinLast4] = useState('')
  const [ytdPaidDollars, setYtdPaidDollars] = useState('')
  const [w9OnFile, setW9OnFile] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/staff/tax')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(data.error || 'Could not load')
      return
    }
    setRows(data.contractors ?? [])
    setNeeding(data.needing1099 ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!email.trim()) return
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          legalName,
          tinLast4,
          ytdPaidDollars: Number(ytdPaidDollars) || 0,
          w9OnFile,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setEmail('')
      setLegalName('')
      setTinLast4('')
      setYtdPaidDollars('')
      setW9OnFile(false)
      setStatus('Saved.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="tax-w9" className="scroll-mt-28 space-y-4 rounded-xl border border-[var(--border)] bg-white p-5">
      <div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">W-9 and 1099 tracking</h2>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          Keep contractor W-9 status here.
          Flag anyone paid $600 or more for 1099 season.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[#FAF8F4] p-3 space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Contractor email"
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
        />
        <input
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="Legal name"
          className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
        />
        <div className="flex flex-wrap gap-2">
          <input
            value={tinLast4}
            onChange={(e) => setTinLast4(e.target.value)}
            placeholder="TIN last 4"
            maxLength={4}
            className="w-28 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
          />
          <input
            type="number"
            min="0"
            value={ytdPaidDollars}
            onChange={(e) => setYtdPaidDollars(e.target.value)}
            placeholder="YTD paid ($)"
            className="w-36 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
          />
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={w9OnFile} onChange={(e) => setW9OnFile(e.target.checked)} />
            W-9 on file
          </label>
        </div>
        <Button type="button" size="sm" disabled={busy || !email.trim()} onClick={() => void save()}>
          Save contractor
        </Button>
        {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}
      </div>

      {needing.length > 0 ? (
        <p className="text-sm font-semibold text-[#1A1A1A]">
          {needing.length} contractor{needing.length === 1 ? '' : 's'} at or above $600 YTD
        </p>
      ) : null}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border border-[var(--border)] px-3 py-2 text-sm">
            <p className="font-semibold">
              {r.legalName || r.email}
              {r.w9OnFile ? ' · W-9 on file' : ' · W-9 missing'}
            </p>
            <p className="text-xs text-[#5A6070]">
              {r.email}
              {r.tinLast4 ? ` · ****${r.tinLast4}` : ''}
              {` · $${(r.ytdPaidCents / 100).toFixed(0)} YTD`}
            </p>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="text-sm text-[#5A6070]">No contractors tracked yet.</li>
        ) : null}
      </ul>

      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <p className="text-sm font-bold text-[#1A1A1A]">990-EZ worksheet</p>
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          Download a CPA-ready CSV skeleton.
          Enter dollars on the query string or use YTD contractor pay for salaries.
        </p>
        <a
          href="/api/staff/tax?format=990ez-csv"
          className="inline-flex text-xs font-semibold text-[var(--brand-green)]"
        >
          Download 990-EZ worksheet CSV
        </a>
      </div>
    </div>
  )
}
