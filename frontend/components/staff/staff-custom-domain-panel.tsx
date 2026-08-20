'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { isPublicDemoInstance } from '@/lib/demo/instance'

type DnsRecord = { type: string; name: string; value: string }

export function StaffCustomDomainPanel() {
  const demo = isPublicDemoInstance()
  const platform = process.env.NEXT_PUBLIC_COMMONS_PLATFORM === 'true'
  const visible = demo || platform
  const [domain, setDomain] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [verification, setVerification] = useState<DnsRecord[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    fetch('/api/commons/domain')
      .then(async (r) => {
        const d = await r.json()
        if (Array.isArray(d.records)) setRecords(d.records)
        if (d.note) setNote(d.note)
      })
      .catch(() => null)
  }, [])

  async function addDomain() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/commons/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not add domain')
      setRecords(d.records || [])
      setVerification(d.verification || [])
      setNote(d.note || '')
      setStatus(d.verified ? 'Verified.' : 'Added. Put these records at your DNS host.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not add domain')
    } finally {
      setBusy(false)
    }
  }

  async function checkDomain() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(`/api/commons/domain?domain=${encodeURIComponent(domain)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Check failed')
      setRecords(d.records || [])
      setNote(d.note || '')
      setStatus(d.verified ? 'DNS looks good.' : d.note || 'Not verified yet.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Check failed')
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-3">
      <h2 className="text-lg font-bold">Your own domain</h2>
      <p className="text-sm text-[#5A6070] whitespace-pre-line leading-relaxed">
        {demo
          ? 'This sample school stays on the demo URL.\nA trial school starts on a temp host, then you point DNS here.'
          : 'Start on the temp host. When you want pto.yourschool.org, add it here.\nWe attach it on Vercel. You create the CNAME or A record at your registrar.'}
      </p>
      <p className="text-xs">
        <Link href="/staff?view=help" className="underline" style={{ color: 'var(--brand-green)' }}>
          Help: Point DNS off the temp domain
        </Link>
      </p>
      <label className="block text-xs text-[#5A6070]">
        Domain
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="pto.yourschool.org"
          className="mt-1 w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || !domain.trim()} onClick={() => void addDomain()}>
          Add domain
        </Button>
        <Button type="button" variant="outline" disabled={busy || !domain.trim()} onClick={() => void checkDomain()}>
          Check DNS
        </Button>
      </div>
      {records.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-[#5A6070]">
                <th className="py-1 pr-3">Type</th>
                <th className="py-1 pr-3">Name</th>
                <th className="py-1">Value</th>
              </tr>
            </thead>
            <tbody>
              {records.concat(verification).map((row, i) => (
                <tr key={`${row.type}-${row.name}-${i}`} className="border-t border-[var(--border)]">
                  <td className="py-1 pr-3 font-mono">{row.type}</td>
                  <td className="py-1 pr-3 font-mono">{row.name}</td>
                  <td className="py-1 font-mono break-all">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {note ? <p className="text-xs text-[#5A6070] whitespace-pre-line">{note}</p> : null}
      {status ? <p className="text-xs text-[#5A6070] whitespace-pre-line">{status}</p> : null}
    </section>
  )
}
