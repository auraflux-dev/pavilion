'use client'

/**
 * Staff → Timesheets. Instructors/coordinators log hours per assigned program;
 * VP Programs / admin approve or reject.
 */
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DEMO_BRAND, vanillaizeIfDemo } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'

type ProgramOption = { id: string; name: string }

type Timesheet = {
  id: string
  staffEmail: string
  staffName: string
  programId: string
  programName: string
  workDate: string
  startTime: string
  endTime: string
  hours: number
  notes: string
  status: 'Submitted' | 'Approved' | 'Rejected'
  submittedAt: string
  reviewedByEmail: string
  reviewedAt: string
  reviewNote: string
}

const STATUS_STYLE: Record<Timesheet['status'], string> = {
  Submitted: 'bg-amber-50 text-amber-800',
  Approved: 'bg-emerald-50 text-emerald-800',
  Rejected: 'bg-rose-50 text-rose-800',
}

export function StaffTimesheetsPanel() {
  const [rows, setRows] = useState<Timesheet[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [canReview, setCanReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({
    programId: '',
    workDate: new Date().toISOString().slice(0, 10),
    startTime: '15:30',
    endTime: '16:30',
    notes: '',
  })

  const load = useCallback(async () => {
    const r = await fetch('/api/staff/timesheets')
    const d = await r.json()
    if (!r.ok) throw new Error(d.error ?? 'Load failed')
    setRows(d.timesheets ?? [])
    setPrograms(d.programs ?? [])
    setCanReview(Boolean(d.canReview))
    if (!form.programId && (d.programs ?? [])[0]?.id) {
      setForm((f) => ({ ...f, programId: d.programs[0].id }))
    }
  }, [form.programId])

  useEffect(() => {
    void load().catch((err) => setStatus(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  async function submit() {
    setBusy(true)
    setStatus('')
    try {
      const program = programs.find((p) => p.id === form.programId)
      const r = await fetch('/api/staff/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programId: form.programId,
          programName: program?.name ?? '',
          workDate: form.workDate,
          startTime: form.startTime,
          endTime: form.endTime,
          notes: form.notes,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Submit failed')
      setStatus('Timesheet submitted to VP Programs.')
      setForm((f) => ({ ...f, notes: '' }))
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  async function review(id: string, action: 'approve' | 'reject') {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/timesheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Update failed')
      setStatus(action === 'approve' ? 'Timesheet approved.' : 'Timesheet rejected.')
      await load()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const pending = rows.filter((r) => r.status === 'Submitted')
  const hoursSubmitted = rows
    .filter((r) => r.status !== 'Rejected')
    .reduce((sum, r) => sum + (Number(r.hours) || 0), 0)

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-5">
      <div>
        <h2 className="text-lg font-bold">Timesheets</h2>
        <p className="text-xs text-[#5A6070] mt-1">
          {canReview
            ? 'Review contractor and instructor hours. Approved rows are ready for payment processing.'
            : 'Log hours for your assigned programs. Submissions go to VP Programs for approval.'}
        </p>
        <p className="text-xs font-semibold mt-2" style={{ color: 'var(--brand-green)' }}>
          {hoursSubmitted.toFixed(2)} hours logged (non-rejected)
          {canReview && pending.length ? ` · ${pending.length} awaiting review` : ''}
        </p>
      </div>

      <div
        className="rounded-lg border p-4 space-y-2"
        style={{ borderColor: '#E8D48A', backgroundColor: '#FFFBEB' }}
        role="note"
      >
        <p className="text-sm font-bold text-[#1A1A1A]">Contractors: W-9 required</p>
        <p className="text-xs text-[#5A6070] leading-relaxed">
          If your pay may exceed <span className="font-semibold text-[#1A1A1A]">$600 in a calendar year</span>,
          {vanillaizeIfDemo(
            'SHMS PTO may need to file a Form 1099. Complete IRS Form W-9 before or with your first paid work, then email the finished form to',
          )}{' '}
          <a
            href={`mailto:${isPublicDemoInstance() ? `treasurer@${DEMO_BRAND.host}` : 'treasurer@shmspto.org'}?subject=W-9%20for%20contractor`}
            className="font-semibold underline"
            style={{ color: 'var(--brand-green)' }}
          >
            {isPublicDemoInstance() ? `treasurer@${DEMO_BRAND.host}` : 'treasurer@shmspto.org'}
          </a>
          .
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="/forms/fw9.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[var(--brand-soft)]"
          >
            Download Form W-9 (PDF)
          </a>
          <a
            href={`mailto:${isPublicDemoInstance() ? `treasurer@${DEMO_BRAND.host}` : 'treasurer@shmspto.org'}?subject=W-9%20for%20contractor`}
            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Email completed W-9 to Treasurer
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[#FAFAF8] p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#5A6070]">
          Submit hours
        </p>
        <select
          value={form.programId}
          onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Program…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="text-xs text-[#5A6070] space-y-1">
            <span>Date</span>
            <input
              type="date"
              value={form.workDate}
              onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
            />
          </label>
          <label className="text-xs text-[#5A6070] space-y-1">
            <span>Start</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
            />
          </label>
          <label className="text-xs text-[#5A6070] space-y-1">
            <span>End</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
            />
          </label>
        </div>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes (optional). e.g. makeup class, prep time"
          rows={2}
          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-white"
        />
        <Button
          disabled={busy || !form.programId || !form.workDate}
          onClick={() => void submit()}
          className="text-white"
          style={{ backgroundColor: 'var(--brand-green)' }}
        >
          {busy ? 'Sending…' : 'Submit to VP Programs'}
        </Button>
      </div>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-[#5A6070]">No timesheets yet.</p>
        ) : null}
        {rows.map((row) => (
          <div
            key={row.id}
            className="border-t border-[#F0EBE3] pt-3 flex flex-wrap justify-between gap-3"
          >
            <div>
              <p className="text-sm font-semibold">
                {row.programName} · {row.hours}h
              </p>
              <p className="text-xs text-[#5A6070]">
                {row.workDate} · {row.startTime} to {row.endTime}
                {canReview ? ` · ${row.staffName || row.staffEmail}` : ''}
              </p>
              {row.notes ? <p className="text-xs text-[#5A6070] mt-1">{row.notes}</p> : null}
              {row.reviewNote ? (
                <p className="text-xs text-[#5A6070] mt-1">Review note: {row.reviewNote}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded ${STATUS_STYLE[row.status]}`}>
                {row.status}
              </span>
              {canReview && row.status === 'Submitted' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs"
                    disabled={busy}
                    onClick={() => void review(row.id, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs text-red-700"
                    disabled={busy}
                    onClick={() => void review(row.id, 'reject')}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
