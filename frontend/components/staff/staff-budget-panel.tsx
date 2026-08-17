'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

const DEFAULT_FISCAL_YEAR = '2026-27'
const FISCAL_YEAR_LABEL = 'Aug 1, 2026 – Jul 31, 2027'

type BudgetKind = 'income' | 'expense'

type BudgetLine = {
  id: string
  fiscalYear: string
  kind: BudgetKind
  category: string
  name: string
  budgeted: number
  actual: number
  owner: string
  notes: string
  sortOrder: number
  syncKey: string
  tracking: 'auto' | 'keyed'
}

type BudgetEntry = {
  id: string
  lineSyncKey: string
  occurredAt: string
  amount: number
  memo: string
  origin: string
}

type Summary = {
  incomeBudgeted: number
  incomeActual: number
  expenseBudgeted: number
  expenseActual: number
  netBudgeted: number
  netActual: number
}

function summarizeBudget(lines: BudgetLine[]): Summary {
  const income = lines.filter((l) => l.kind === 'income')
  const expense = lines.filter((l) => l.kind === 'expense')
  const sum = (rows: BudgetLine[], key: 'budgeted' | 'actual') =>
    Math.round(rows.reduce((n, r) => n + (Number(r[key]) || 0), 0) * 100) / 100
  return {
    incomeBudgeted: sum(income, 'budgeted'),
    incomeActual: sum(income, 'actual'),
    expenseBudgeted: sum(expense, 'budgeted'),
    expenseActual: sum(expense, 'actual'),
    netBudgeted: sum(income, 'budgeted') - sum(expense, 'budgeted'),
    netActual: sum(income, 'actual') - sum(expense, 'actual'),
  }
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

function originLabel(origin: string) {
  if (origin === 'auto-payment') return 'Staff · sale'
  if (origin === 'auto-expense') return 'Staff · reimbursement'
  if (origin === 'opening') return 'Opening'
  return 'Keyed'
}

/**
 * Staff → Budget. Treasurer records activity when money moves outside Staff;
 * Square memberships / Cove / shop / tickets and paid reimbursements fill in.
 */
export function StaffBudgetPanel() {
  const [year] = useState(DEFAULT_FISCAL_YEAR)
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [entries, setEntries] = useState<BudgetEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [label, setLabel] = useState(FISCAL_YEAR_LABEL)

  const [entryKey, setEntryKey] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entryAmount, setEntryAmount] = useState('')
  const [entryMemo, setEntryMemo] = useState('')

  const [newKind, setNewKind] = useState<BudgetKind>('expense')
  const [newCategory, setNewCategory] = useState('')
  const [newName, setNewName] = useState('')
  const [newBudgeted, setNewBudgeted] = useState('')
  const [newOwner, setNewOwner] = useState('Treasurer')
  const [newNotes, setNewNotes] = useState('')

  const applyPayload = useCallback(
    (d: { lines?: BudgetLine[]; summary?: Summary; label?: string; entries?: BudgetEntry[] }) => {
      setLines(d.lines ?? [])
      setEntries(d.entries ?? [])
      setSummary(d.summary ?? summarizeBudget(d.lines ?? []))
      if (d.label) setLabel(d.label)
    },
    [],
  )

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/staff/budget?year=${encodeURIComponent(year)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Load failed')
      applyPayload(d)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    }
  }, [applyPayload, year])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (entryKey || !lines.length) return
    const keyed = lines.find((l) => l.tracking === 'keyed')
    setEntryKey((keyed ?? lines[0]).syncKey)
  }, [lines, entryKey])

  async function post(body: Record<string, unknown>, okMessage: string) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, fiscalYear: year }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Request failed')
      applyPayload(d)
      const extra = typeof d.added === 'number' ? ` · ${d.added} new from Staff` : ''
      setStatus(okMessage + extra)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function save(id: string, patch: Partial<BudgetLine>) {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch('/api/staff/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, year, budgeted: patch.budgeted, notes: patch.notes }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Save failed')
      applyPayload(d)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function addLine() {
    if (!newName.trim()) {
      setStatus('Line name is required.')
      return
    }
    await post(
      {
        action: 'create',
        kind: newKind,
        category: newCategory,
        name: newName,
        budgeted: Number(newBudgeted) || 0,
        owner: newOwner,
        notes: newNotes,
      },
      'Line added.',
    )
    setNewName('')
    setNewBudgeted('')
    setNewNotes('')
  }

  async function recordActivity() {
    if (!entryKey) {
      setStatus('Pick a budget line.')
      return
    }
    await post(
      {
        action: 'entry',
        lineSyncKey: entryKey,
        occurredAt: entryDate,
        amount: Number(entryAmount) || 0,
        memo: entryMemo,
      },
      'Recorded.',
    )
    setEntryAmount('')
    setEntryMemo('')
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”?`)) return
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(`/api/staff/budget?id=${encodeURIComponent(id)}&year=${encodeURIComponent(year)}`, {
        method: 'DELETE',
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Delete failed')
      applyPayload(d)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm('Remove this keyed activity?')) return
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(
        `/api/staff/budget?entryId=${encodeURIComponent(id)}&year=${encodeURIComponent(year)}`,
        { method: 'DELETE' },
      )
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Delete failed')
      applyPayload(d)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function downloadExcel() {
    setBusy(true)
    setStatus('')
    try {
      const r = await fetch(`/api/staff/budget/export?year=${encodeURIComponent(year)}`)
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? 'Excel export failed')
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shms-pto-budget-${year}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Excel downloaded.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Excel export failed')
    } finally {
      setBusy(false)
    }
  }

  const income = useMemo(() => lines.filter((l) => l.kind === 'income'), [lines])
  const expense = useMemo(() => lines.filter((l) => l.kind === 'expense'), [lines])
  const totals = summary ?? summarizeBudget(lines)
  const lineLabel = (key: string) => lines.find((l) => l.syncKey === key)?.name ?? key

  return (
    <section className="rounded-xl border border-[#E8E4DC] bg-white p-5 space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Budget · {year}</h2>
          <p className="text-xs text-[#5A6070] mt-1">{label}</p>
        </div>
        {lines.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="text-white"
              style={{ backgroundColor: '#085508' }}
              disabled={busy}
              onClick={() => void post({ action: 'refresh' }, 'Pulled Staff sales and paid reimbursements.')}
            >
              {busy ? 'Working…' : 'Refresh from Staff'}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void downloadExcel()}>
              Download Excel
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
        <p>
          Not the official books — MoneyMinder / Square / PayPal / Bank of America stay the ledger.
        </p>
        <p>
          <strong>Staff fills:</strong> memberships, Cove card loads, shop, in-person POS, tickets,
          enrichment fees, donations, and reimbursements you mark Paid.
        </p>
        <p>
          <strong>You key when it happens:</strong> beginning cash, sponsorships received, spirit nights,
          Run for Charity payout, insurance, tax/990, website tools, processing fees, vendor restock
          not submitted as an expense, contingency.
        </p>
      </div>

      {status ? <p className="text-xs text-[#5A6070]">{status}</p> : null}

      {lines.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[#5A6070]">
            No lines for {year} yet. Load the placeholder, then record activity as money moves.
          </p>
          <Button
            disabled={busy}
            className="text-white"
            style={{ backgroundColor: '#085508' }}
            onClick={() => void post({ action: 'seed' }, 'Placeholder loaded.')}
          >
            {busy ? 'Loading…' : 'Load 2026–27 placeholder'}
          </Button>
        </div>
      ) : (
        <>
          <div id="budget-record" className="border border-[#E8E4DC] rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-bold">Record activity</h3>
            <p className="text-xs text-[#5A6070]">
              Date, line, amount, memo. Use this the day a check is written, a spirit night lands, or
              beginning cash is known. Click a line below to prefill.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="date"
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
              <select
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm sm:col-span-2"
                value={entryKey}
                onChange={(e) => setEntryKey(e.target.value)}
              >
                <option value="">Choose a line</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.syncKey}>
                    {l.kind === 'income' ? 'In' : 'Out'} · {l.name}
                    {l.tracking === 'auto' ? ' (also auto)' : ''}
                  </option>
                ))}
              </select>
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                placeholder="Amount $"
                inputMode="decimal"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
              />
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm lg:col-span-3 sm:col-span-2"
                placeholder="Memo (vendor, check #, spirit night restaurant…)"
                value={entryMemo}
                onChange={(e) => setEntryMemo(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={busy}
              className="text-white"
              style={{ backgroundColor: '#085508' }}
              onClick={() => void recordActivity()}
            >
              Record
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard title="Income" budgeted={totals.incomeBudgeted} actual={totals.incomeActual} />
            <SummaryCard
              title="Expense"
              budgeted={totals.expenseBudgeted}
              actual={totals.expenseActual}
            />
            <SummaryCard title="Net" budgeted={totals.netBudgeted} actual={totals.netActual} highlight />
          </div>

          <LineTable
            title="Income"
            rows={income}
            busy={busy}
            onSave={save}
            onRemove={remove}
            onRecord={(key) => setEntryKey(key)}
          />
          <LineTable
            title="Expense"
            rows={expense}
            busy={busy}
            onSave={save}
            onRemove={remove}
            onRecord={(key) => setEntryKey(key)}
          />

          <div id="budget-activity" className="space-y-2">
            <h3 className="text-sm font-bold">Activity log</h3>
            {entries.length === 0 ? (
              <p className="text-sm text-[#5A6070]">
                Nothing recorded yet. Refresh from Staff after the year starts, or key the first
                occurrence above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[#5A6070]">
                      <th className="pb-2 pr-2 font-bold">Date</th>
                      <th className="pb-2 pr-2 font-bold">Line</th>
                      <th className="pb-2 pr-2 font-bold">Amount</th>
                      <th className="pb-2 pr-2 font-bold">Source</th>
                      <th className="pb-2 pr-2 font-bold">Memo</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-t border-[#E8E4DC]">
                        <td className="py-2 pr-2 whitespace-nowrap">{e.occurredAt.slice(0, 10)}</td>
                        <td className="py-2 pr-2">{lineLabel(e.lineSyncKey)}</td>
                        <td className="py-2 pr-2">{money(e.amount)}</td>
                        <td className="py-2 pr-2 text-xs text-[#5A6070]">{originLabel(e.origin)}</td>
                        <td className="py-2 pr-2 text-xs">{e.memo}</td>
                        <td className="py-2">
                          {e.origin === 'keyed' || e.origin === 'opening' ? (
                            <button
                              type="button"
                              className="text-xs text-rose-700 hover:underline"
                              disabled={busy}
                              onClick={() => void removeEntry(e.id)}
                            >
                              Undo
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div id="budget-add" className="border border-[#E8E4DC] rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-bold">Add a line</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value === 'income' ? 'income' : 'expense')}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                placeholder="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Line name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                placeholder="Budgeted $"
                inputMode="decimal"
                value={newBudgeted}
                onChange={(e) => setNewBudgeted(e.target.value)}
              />
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm"
                placeholder="Owner"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
              />
              <input
                className="border border-[#E8E4DC] rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={busy}
              className="text-white"
              style={{ backgroundColor: '#085508' }}
              onClick={() => void addLine()}
            >
              Add line
            </Button>
          </div>
        </>
      )}
    </section>
  )
}

function SummaryCard({
  title,
  budgeted,
  actual,
  highlight,
}: {
  title: string
  budgeted: number
  actual: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        highlight ? 'border-[#085508]/30 bg-[#085508]/5' : 'border-[#E8E4DC] bg-[#F7F5F0]'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5A6070]">{title}</p>
      <p className="text-xl font-bold mt-1">{money(budgeted)}</p>
      <p className="text-xs text-[#5A6070]">budgeted</p>
      <p className="text-sm mt-2">
        Actual {money(actual)}
        {budgeted ? ` · ${Math.round((actual / budgeted) * 100)}%` : ''}
      </p>
    </div>
  )
}

function LineTable({
  title,
  rows,
  busy,
  onSave,
  onRemove,
  onRecord,
}: {
  title: string
  rows: BudgetLine[]
  busy: boolean
  onSave: (id: string, patch: Partial<BudgetLine>) => Promise<void>
  onRemove: (id: string, name: string) => Promise<void>
  onRecord: (syncKey: string) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, BudgetLine[]>()
    for (const row of rows) {
      const key = row.category || 'Other'
      map.set(key, [...(map.get(key) ?? []), row])
    }
    return [...map.entries()]
  }, [rows])

  if (!rows.length) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#5A6070]">
              <th className="pb-2 pr-2 font-bold">Line</th>
              <th className="pb-2 pr-2 font-bold w-28">Budgeted</th>
              <th className="pb-2 pr-2 font-bold w-24">Actual</th>
              <th className="pb-2 pr-2 font-bold w-28">How it fills</th>
              <th className="pb-2 pr-2 font-bold">Notes</th>
              <th className="pb-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {grouped.map(([category, catRows]) => (
              <Fragment key={`${title}-${category}`}>
                <tr className="bg-[#F7F5F0]">
                  <td
                    colSpan={6}
                    className="py-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-[#085508]"
                  >
                    {category}
                  </td>
                </tr>
                {catRows.map((row) => (
                  <BudgetRow
                    key={row.id}
                    row={row}
                    busy={busy}
                    onSave={onSave}
                    onRemove={onRemove}
                    onRecord={onRecord}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BudgetRow({
  row,
  busy,
  onSave,
  onRemove,
  onRecord,
}: {
  row: BudgetLine
  busy: boolean
  onSave: (id: string, patch: Partial<BudgetLine>) => Promise<void>
  onRemove: (id: string, name: string) => Promise<void>
  onRecord: (syncKey: string) => void
}) {
  const [budgeted, setBudgeted] = useState(String(row.budgeted))
  const [notes, setNotes] = useState(row.notes)

  useEffect(() => {
    setBudgeted(String(row.budgeted))
    setNotes(row.notes)
  }, [row.budgeted, row.notes])

  return (
    <tr className="border-t border-[#E8E4DC] align-top">
      <td className="py-2 pr-2">
        <p className="font-medium">{row.name}</p>
        <p className="text-[11px] text-[#5A6070]">{row.owner}</p>
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-24 border border-[#E8E4DC] rounded-lg px-2 py-1 text-sm"
          inputMode="decimal"
          value={budgeted}
          disabled={busy}
          onChange={(e) => setBudgeted(e.target.value)}
          onBlur={() => {
            if (Number(budgeted) !== row.budgeted) void onSave(row.id, { budgeted: Number(budgeted) || 0 })
          }}
        />
      </td>
      <td className="py-2 pr-2 font-medium tabular-nums">{money(row.actual)}</td>
      <td className="py-2 pr-2">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${
            row.tracking === 'auto'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {row.tracking === 'auto' ? 'Staff + keyed' : 'You key'}
        </span>
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-full min-w-[10rem] border border-[#E8E4DC] rounded-lg px-2 py-1 text-xs"
          value={notes}
          disabled={busy}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== row.notes) void onSave(row.id, { notes })
          }}
        />
      </td>
      <td className="py-2">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            className="text-xs text-[#085508] hover:underline"
            onClick={() => {
              onRecord(row.syncKey)
              document.getElementById('budget-record')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Record
          </button>
          <button
            type="button"
            className="text-xs text-rose-700 hover:underline"
            disabled={busy}
            onClick={() => void onRemove(row.id, row.name)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}
