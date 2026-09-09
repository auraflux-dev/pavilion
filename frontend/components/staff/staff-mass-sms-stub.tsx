'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

/** Gated mass SMS stub. Shows status until FEATURE_MASS_SMS is on. */
export function StaffMassSmsStub({
  phones = [],
  defaultBody = '',
}: {
  phones?: string[]
  defaultBody?: string
}) {
  const [enabled, setEnabled] = useState(false)
  const [note, setNote] = useState('')
  const [body, setBody] = useState(defaultBody)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetch('/api/staff/sms')
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.enabled === true)
        setNote(d.note || '')
      })
      .catch(() => setNote('Could not load SMS status.'))
  }, [])

  async function sendDryRun() {
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/staff/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'roster',
          body,
          phones,
        }),
      })
      const data = await res.json().catch(() => ({}))
      setStatus(data.message || (data.ok ? 'OK' : data.error || 'Failed'))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[#FAF8F4] p-3 space-y-2">
      <p className="text-xs font-bold text-[#1A1A1A]">Mass SMS (gated)</p>
      <p className="text-[11px] text-[#5A6070] whitespace-pre-line">
        {note ||
          'Opens after SHMS member portal reach codes.\nBusiness Rocket may reuse this for appointment reminders.'}
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="SMS draft…"
        className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm bg-white"
        disabled={!enabled}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!enabled || busy || !body.trim() || phones.length === 0}
        onClick={() => void sendDryRun()}
      >
        {enabled ? `Dry-run SMS (${phones.length} phones)` : 'SMS locked'}
      </Button>
      {status ? <p className="text-[11px] text-[#5A6070]">{status}</p> : null}
    </div>
  )
}
