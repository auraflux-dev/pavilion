'use client'

/**
 * Printable membership directory. Staff opens this, then Print → Save as PDF.
 * Optional export so boards can share a phone book without building a native app.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type StudentRow = {
  firstName: string
  lastName: string
  grade: string
}

type ParentRow = {
  parentEmail: string
  parentFirstName: string
  parentLastName: string
  parentPhone: string
  accountNumber?: string
  membershipTier: string
  accountType: 'free' | 'paid'
  students: StudentRow[]
}

export function StaffDirectoryPrint({
  initialTier = 'paid',
}: {
  initialTier?: string
}) {
  const [members, setMembers] = useState<ParentRow[]>([])
  const [tier, setTier] = useState(initialTier)
  const [groupByGrade, setGroupByGrade] = useState(true)
  const [includePhone, setIncludePhone] = useState(true)
  const [includeEmail, setIncludeEmail] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const q = new URLSearchParams({ mode: 'list', tier, sort: 'name' })
      const res = await fetch(`/api/staff/members?${q}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not load roster')
      setMembers(data.members ?? data.parents ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load')
    } finally {
      setBusy(false)
    }
  }, [tier])

  useEffect(() => {
    void load()
  }, [load])

  const sections = useMemo(() => {
    if (!groupByGrade) {
      return [{ key: 'all', title: 'All families', rows: members }]
    }
    const byGrade = new Map<string, ParentRow[]>()
    for (const m of members) {
      const grades = Array.from(
        new Set(m.students.map((s) => String(s.grade || '').trim()).filter(Boolean)),
      )
      const keys = grades.length ? grades : ['Ungraded']
      for (const g of keys) {
        const list = byGrade.get(g) || []
        list.push(m)
        byGrade.set(g, list)
      }
    }
    return Array.from(byGrade.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([key, rows]) => ({
        key,
        title: key === 'Ungraded' ? 'Ungraded' : `Grade ${key}`,
        rows,
      }))
  }, [groupByGrade, members])

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <div className="print:hidden border-b border-[var(--border)] bg-[#FAF8F4] px-4 py-3">
        <div className="mx-auto max-w-3xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Printable directory</p>
            <p className="text-xs text-[#5A6070]">
              Use your browser Print dialog, then Save as PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="rounded-md border border-[var(--border)] px-2 py-1.5 text-xs bg-white"
            >
              <option value="paid">Paid only</option>
              <option value="all">All accounts</option>
              <option value="free">Free only</option>
            </select>
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={groupByGrade}
                onChange={(e) => setGroupByGrade(e.target.checked)}
              />
              By grade
            </label>
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={includePhone}
                onChange={(e) => setIncludePhone(e.target.checked)}
              />
              Phone
            </label>
            <label className="text-xs flex items-center gap-1">
              <input
                type="checkbox"
                checked={includeEmail}
                onChange={(e) => setIncludeEmail(e.target.checked)}
              />
              Email
            </label>
            <Button type="button" size="sm" onClick={() => window.print()}>
              Print / PDF
            </Button>
            <Link href="/staff?view=membership" className="text-xs font-semibold text-[var(--brand-green)]">
              Back
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Family directory</h1>
          <p className="text-sm text-[#5A6070] mt-1">
            Generated {new Date().toLocaleDateString()} · {members.length} families
            {tier !== 'all' ? ` · ${tier}` : ''}
          </p>
          {error ? <p className="text-sm text-red-700 mt-2">{error}</p> : null}
          {busy ? <p className="text-sm text-[#5A6070] mt-2">Loading…</p> : null}
        </header>

        {sections.map((sec) => (
          <section key={sec.key} className="mb-8 break-inside-avoid">
            <h2 className="text-lg font-bold border-b border-[#E8E2D8] pb-1 mb-3">{sec.title}</h2>
            <ul className="space-y-3">
              {sec.rows.map((m) => {
                const name =
                  `${m.parentFirstName} ${m.parentLastName}`.trim() || m.parentEmail
                const kids = m.students
                  .map((s) => `${s.firstName} ${s.lastName}`.trim())
                  .filter(Boolean)
                  .join(', ')
                return (
                  <li key={`${m.parentEmail}-${sec.key}`} className="text-sm">
                    <p className="font-semibold">{name}</p>
                    {kids ? <p className="text-[#5A6070]">Students: {kids}</p> : null}
                    {includePhone && m.parentPhone ? (
                      <p className="text-[#5A6070]">{m.parentPhone}</p>
                    ) : null}
                    {includeEmail ? <p className="text-[#5A6070]">{m.parentEmail}</p> : null}
                  </li>
                )
              })}
              {sec.rows.length === 0 ? (
                <li className="text-sm text-[#5A6070]">No families in this group.</li>
              ) : null}
            </ul>
          </section>
        ))}
      </main>

      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
          a {
            text-decoration: none;
            color: inherit;
          }
        }
      `}</style>
    </div>
  )
}
