'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StaffPlaidConnect } from '@/components/staff/staff-plaid-connect'
import {
  STAFF_FILTER_CARD,
  STAFF_FILTER_CARD_TITLE,
  STAFF_FILTER_INPUT,
  STAFF_FILTER_LABEL,
} from '@/lib/staff/staff-filter-ui'

const DEFAULT_FISCAL_YEAR = '2026-27'
const FISCAL_YEAR_LABEL = 'Jul 1, 2026 to Jun 30, 2027'

type BudgetKind = 'income' | 'expense'
type BudgetTracking = 'auto' | 'bank' | 'keyed' | 'skip'

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
  tracking: BudgetTracking
  entryCount?: number
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
  const countable = lines.filter((l) => l.tracking !== 'skip')
  const income = countable.filter((l) => l.kind === 'income')
  const expense = countable.filter((l) => l.kind === 'expense')
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
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function originLabel(origin: string) {
  if (origin === 'auto-plaid' || origin === 'auto-bofa') return 'Bank · BoA'
  if (origin === 'auto-paypal') return 'PayPal activity'
  if (origin === 'auto-payment') return 'Staff · sale'
  if (origin === 'auto-expense') return 'Staff · reimbursement'
  if (origin === 'reclass') return 'Moved'
  if (origin === 'opening') return 'Opening'
  return 'Keyed'
}

function trackingLabel(tracking: BudgetTracking, syncKey?: string) {
  if (tracking === 'bank') return 'Bank CSV'
  if (tracking === 'auto') return 'Staff + bank'
  if (tracking === 'skip') {
    if (syncKey === 'cash_box_deposits') return 'Ledger only · already in POS'
    return 'Skipped · Staff sales'
  }
  return 'You key'
}

function canUndo(origin: string) {
  return origin !== 'auto-payment' && origin !== 'auto-expense'
}

function canMove(origin: string) {
  return origin !== 'opening'
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
  const [statusKind, setStatusKind] = useState<'ok' | 'err'>('ok')
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
  const [plaidConnected, setPlaidConnected] = useState(false)
  const [plaidConfigured, setPlaidConfigured] = useState(false)
  const [paypalConfigured, setPaypalConfigured] = useState(false)

  const [filterKey, setFilterKey] = useState('')
  const [search, setSearch] = useState('')

  const applyPayload = useCallback(
    (d: {
      lines?: BudgetLine[]
      summary?: Summary
      label?: string
      entries?: BudgetEntry[]
      plaid?: { connected?: boolean; configured?: boolean }
      paypal?: { configured?: boolean }
    }) => {
      setLines(d.lines ?? [])
      setEntries(d.entries ?? [])
      setSummary(d.summary ?? summarizeBudget(d.lines ?? []))
      if (d.label) setLabel(d.label)
      if (d.plaid) {
        setPlaidConnected(Boolean(d.plaid.connected))
        setPlaidConfigured(Boolean(d.plaid.configured))
      }
      if (d.paypal) setPaypalConfigured(Boolean(d.paypal.configured))
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
      setStatusKind('err')
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
      const extra =
        typeof d.added === 'number'
          ? ` · ${d.added} new${typeof d.updated === 'number' && d.updated ? `, ${d.updated} updated` : ''}`
          : ''
      setStatusKind('ok')
      setStatus((d.message ? String(d.message) : okMessage) + extra)
    } catch (err) {
      setStatusKind('err')
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
      setStatusKind('err')
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function addLine() {
    if (!newName.trim()) {
      setStatusKind('err')
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
      setStatusKind('err')
      setStatus('Pick a budget line.')
      return
    }
    if (!Number(entryAmount)) {
      setStatusKind('err')
      setStatus('Enter an amount.')
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
    if (!window.confirm(`Delete “${name}”? Activity on this line stays until you move or undo those rows.`)) return
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
      setStatusKind('err')
      setStatus(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm('Remove this activity? Re-importing the BoA CSV will bring bank rows back.')) return
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
      setStatusKind('ok')
      setStatus('Removed.')
    } catch (err) {
      setStatusKind('err')
      setStatus(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function moveEntry(id: string, lineSyncKey: string) {
    if (!lineSyncKey) return
    await post({ action: 'reclassify', id, lineSyncKey }, 'Moved to another line.')
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
      setStatusKind('ok')
      setStatus('Excel downloaded.')
    } catch (err) {
      setStatusKind('err')
      setStatus(err instanceof Error ? err.message : 'Excel export failed')
    } finally {
      setBusy(false)
    }
  }

  async function importBofaFile(file: File) {
    setBusy(true)
    setStatus('')
    try {
      const csv = await file.text()
      const r = await fetch('/api/staff/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-bofa', fiscalYear: year, csv }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Import failed')
      applyPayload(d)
      setStatusKind('ok')
      setStatus(d.message ? String(d.message) : 'Imported Bank of America.')
    } catch (err) {
      setStatusKind('err')
      setStatus(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  function focusLine(key: string) {
    setEntryKey(key)
    setFilterKey(key)
    document.getElementById('budget-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const income = useMemo(() => lines.filter((l) => l.kind === 'income'), [lines])
  const expense = useMemo(() => lines.filter((l) => l.kind === 'expense'), [lines])
  const totals = summary ?? summarizeBudget(lines)
  const lineLabel = (key: string) => lines.find((l) => l.syncKey === key)?.name ?? key
  const reviewLines = lines.filter((l) => l.syncKey.startsWith('unclassified') && l.actual)
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (filterKey && e.lineSyncKey !== filterKey) return false
      if (!q) return true
      return (
        e.memo.toLowerCase().includes(q) ||
        lineLabel(e.lineSyncKey).toLowerCase().includes(q) ||
        originLabel(e.origin).toLowerCase().includes(q)
      )
    })
  }, [entries, filterKey, search, lines])

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Budget · {year}</h2>
          <p className="text-xs text-[#5A6070] mt-1">{label}</p>
          <Link
            href="/staff?view=help&article=staff-budget"
            className="text-xs font-bold underline mt-1 inline-block"
            style={{ color: 'var(--brand-green)' }}
          >
            How Budget works
          </Link>
        </div>
        {lines.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
              disabled={busy}
              onClick={() =>
                void post(
                  { action: 'refresh' },
                  paypalConfigured
                    ? 'Pulled Staff sales, paid reimbursements, and live PayPal activity.'
                    : 'Pulled Staff sales and paid reimbursements.',
                )
              }
            >
              {busy ? 'Working…' : plaidConnected ? 'Refresh from Bank' : 'Refresh from Staff'}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void downloadExcel()}>
              Download Excel
            </Button>
          </div>
        ) : null}
      </div>

      {plaidConfigured ? (
        <StaffPlaidConnect
          busy={busy}
          onMessage={setStatus}
          onSynced={() => {
            void load()
          }}
        />
      ) : null}

      <div className="rounded-lg border border-[var(--border)] bg-[#F7F4EE] px-3 py-3 space-y-2">
        <p className="text-sm font-bold">Import Bank of America CSV</p>
        <p className="text-xs text-[#5A6070]">
          Only CSV this page accepts. Bank of America checking → Activity → Download CSV. Only{' '}
          <strong>August 1 to July 31</strong> of this school year is used. Square and PayPal{' '}
          <strong>payouts and transfers into checking are skipped</strong> so those sales are not counted
          twice. <strong>Counter Credit</strong> cash-box deposits land on a ledger-only line (not
          fundraising or planning totals). Zelle, checks, ACH, Sam’s, and Amazon still import.
          Re-importing the same file will not double-count.
        </p>
        <label className="inline-flex">
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-sm"
            disabled={busy || lines.length === 0}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void importBofaFile(file)
            }}
          />
        </label>
        <p className="text-xs text-[#5A6070] pt-1">
          {paypalConfigured
            ? 'PayPal updates from the live account on Refresh (no CSV). Website PayPal checkout is already in Staff Payments; bank withdrawals to checking are skipped.'
            : 'PayPal live feed is not configured. Set Client ID and Secret on Vercel, then use Refresh. Do not upload a PayPal CSV.'}
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
        <p>
          Planning worksheet. MoneyMinder stays the ledger. This is not a second set of books.
        </p>
        <p>
          <strong>Bank CSV:</strong> checking activity except Square/PayPal payouts and transfers. Counter
          Credit cash-box deposits are ledger-only (already in POS). Amazon lands on spirit-wear restock;
          Sam’s / Costco on snack restock. Move a row if that guess is wrong.
        </p>
        <p>
          <strong>Refresh:</strong> Square/PayPal <em>sales</em> (memberships, Cove, tickets) plus live PayPal
          account activity (no CSV). <strong>You key:</strong> beginning cash, sponsorships, and anything still
          Unclassified.
        </p>
      </div>

      {reviewLines.length ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          {reviewLines.map((l) => (
            <p key={l.id}>
              {money(l.actual)} on <strong>{l.name}</strong> still needs a real line.{' '}
              <button
                type="button"
                className="underline font-bold"
                onClick={() => focusLine(l.syncKey)}
              >
                Show those rows
              </button>
            </p>
          ))}
        </div>
      ) : null}

      {status ? (
        <p className={`text-xs ${statusKind === 'err' ? 'text-rose-700' : 'text-[var(--brand-green)]'}`}>{status}</p>
      ) : null}

      {lines.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[#5A6070]">
            No lines for {year} yet. Load the placeholder, then import the checking CSV and refresh Staff sales.
          </p>
          <Button
            disabled={busy}
            className="text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
            onClick={() => void post({ action: 'seed' }, 'Placeholder loaded.')}
          >
            {busy ? 'Loading…' : 'Load 2026-27 placeholder'}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard title="Income" budgeted={totals.incomeBudgeted} actual={totals.incomeActual} />
            <SummaryCard
              title="Expense"
              budgeted={totals.expenseBudgeted}
              actual={totals.expenseActual}
              overIsBad
            />
            <SummaryCard title="Net" budgeted={totals.netBudgeted} actual={totals.netActual} highlight />
          </div>

          <div id="budget-record" className="border border-[var(--border)] rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-bold">Record activity</h3>
            <p className="text-xs text-[#5A6070]">
              For beginning cash, a check, or a spirit night that never hit Square. Click a line below to
              prefill and filter the log.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="date"
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
              <select
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
                value={entryKey}
                onChange={(e) => setEntryKey(e.target.value)}
              >
                <option value="">Choose a line</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.syncKey}>
                    {l.kind === 'income' ? 'In' : 'Out'} · {l.name}
                  </option>
                ))}
              </select>
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                placeholder="Amount $"
                inputMode="decimal"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
              />
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm lg:col-span-3 sm:col-span-2"
                placeholder="Memo (vendor, check #, spirit night restaurant…)"
                value={entryMemo}
                onChange={(e) => setEntryMemo(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={busy}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
              onClick={() => void recordActivity()}
            >
              Record
            </Button>
          </div>

          <LineTable
            title="Income"
            rows={income}
            busy={busy}
            activeKey={filterKey}
            onSave={save}
            onRemove={remove}
            onFocus={focusLine}
          />
          <LineTable
            title="Expense"
            rows={expense}
            busy={busy}
            activeKey={filterKey}
            onSave={save}
            onRemove={remove}
            onFocus={focusLine}
          />

          <div id="budget-activity" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-sm font-bold">
                Activity log
                {filterKey ? ` · ${lineLabel(filterKey)}` : ''}
                <span className="ml-2 font-normal text-[#5A6070]">
                  {filteredEntries.length}
                  {filteredEntries.length !== entries.length ? ` of ${entries.length}` : ''}
                </span>
              </h3>
              {filterKey ? (
                <button
                  type="button"
                  className="text-xs text-[var(--brand-green)] hover:underline"
                  onClick={() => setFilterKey('')}
                >
                  Show all lines
                </button>
              ) : null}
            </div>
            <div className={STAFF_FILTER_CARD}>
              <p className={STAFF_FILTER_CARD_TITLE}>Search</p>
              <label className={STAFF_FILTER_LABEL}>
                Memo
                <input
                  className={STAFF_FILTER_INPUT}
                  placeholder="Search memo…"
                  autoComplete="off"
                  name="staff-budget-memo"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-[#5A6070]">
                Nothing recorded yet. Import a Bank of America CSV, then Refresh.
              </p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-sm text-[#5A6070]">No rows match this filter.</p>
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
                    {filteredEntries.map((e) => (
                      <tr key={e.id} className="border-t border-[var(--border)] align-top">
                        <td className="py-2 pr-2 whitespace-nowrap">{e.occurredAt.slice(0, 10)}</td>
                        <td className="py-2 pr-2">
                          {canMove(e.origin) ? (
                            <select
                              className="max-w-[14rem] border border-[var(--border)] rounded-lg px-2 py-1 text-xs"
                              value={e.lineSyncKey}
                              disabled={busy}
                              onChange={(ev) => {
                                if (ev.target.value !== e.lineSyncKey) void moveEntry(e.id, ev.target.value)
                              }}
                            >
                              {lines.map((l) => (
                                <option key={l.id} value={l.syncKey}>
                                  {l.kind === 'income' ? 'In' : 'Out'} · {l.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            lineLabel(e.lineSyncKey)
                          )}
                        </td>
                        <td className="py-2 pr-2 tabular-nums whitespace-nowrap">{money(e.amount)}</td>
                        <td className="py-2 pr-2 text-xs text-[#5A6070]">{originLabel(e.origin)}</td>
                        <td className="py-2 pr-2 text-xs">{e.memo}</td>
                        <td className="py-2">
                          {canUndo(e.origin) ? (
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

          <div id="budget-add" className="border border-[var(--border)] rounded-lg p-3 space-y-3">
            <h3 className="text-sm font-bold">Add a line</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value === 'income' ? 'income' : 'expense')}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                placeholder="Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Line name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                placeholder="Budgeted $"
                inputMode="decimal"
                value={newBudgeted}
                onChange={(e) => setNewBudgeted(e.target.value)}
              />
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                placeholder="Owner"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
              />
              <input
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm sm:col-span-2"
                placeholder="Notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={busy}
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
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
  overIsBad,
}: {
  title: string
  budgeted: number
  actual: number
  highlight?: boolean
  overIsBad?: boolean
}) {
  const remaining = Math.round((budgeted - actual) * 100) / 100
  const pct = budgeted ? Math.round((actual / budgeted) * 100) : null
  const over = remaining < 0
  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        highlight ? 'border-[var(--brand-green)]/30 bg-[var(--brand-green)]/5' : 'border-[var(--border)] bg-[#F7F5F0]'
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5A6070]">{title}</p>
      <p className="text-xl font-bold mt-1 tabular-nums">{money(budgeted)}</p>
      <p className="text-xs text-[#5A6070]">budgeted</p>
      <p className="text-sm mt-2 tabular-nums">
        Actual {money(actual)}
        {pct != null ? ` · ${pct}%` : ''}
      </p>
      <p
        className={`text-xs mt-1 tabular-nums ${
          over ? (overIsBad ? 'text-rose-700' : 'text-[var(--brand-green)]') : 'text-[#5A6070]'
        }`}
      >
        {over
          ? `${overIsBad ? 'Over by' : 'Ahead by'} ${money(Math.abs(remaining))}`
          : `${money(remaining)} remaining`}
      </p>
    </div>
  )
}

function LineTable({
  title,
  rows,
  busy,
  activeKey,
  onSave,
  onRemove,
  onFocus,
}: {
  title: string
  rows: BudgetLine[]
  busy: boolean
  activeKey: string
  onSave: (id: string, patch: Partial<BudgetLine>) => Promise<void>
  onRemove: (id: string, name: string) => Promise<void>
  onFocus: (syncKey: string) => void
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
              <th className="pb-2 pr-2 font-bold w-28">Actual</th>
              <th className="pb-2 pr-2 font-bold w-28">Remaining</th>
              <th className="pb-2 pr-2 font-bold w-36">How it fills</th>
              <th className="pb-2 pr-2 font-bold">Notes</th>
              <th className="pb-2 w-24" />
            </tr>
          </thead>
          <tbody>
            {grouped.map(([category, catRows]) => (
              <Fragment key={`${title}-${category}`}>
                <tr className="bg-[#F7F5F0]">
                  <td
                    colSpan={7}
                    className="py-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-green)]"
                  >
                    {category}
                  </td>
                </tr>
                {catRows.map((row) => (
                  <BudgetRow
                    key={row.id}
                    row={row}
                    busy={busy}
                    active={activeKey === row.syncKey}
                    onSave={onSave}
                    onRemove={onRemove}
                    onFocus={onFocus}
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
  active,
  onSave,
  onRemove,
  onFocus,
}: {
  row: BudgetLine
  busy: boolean
  active: boolean
  onSave: (id: string, patch: Partial<BudgetLine>) => Promise<void>
  onRemove: (id: string, name: string) => Promise<void>
  onFocus: (syncKey: string) => void
}) {
  const [budgeted, setBudgeted] = useState(String(row.budgeted))
  const [notes, setNotes] = useState(row.notes)
  const remaining = Math.round((row.budgeted - row.actual) * 100) / 100
  const review = row.syncKey.startsWith('unclassified') && row.actual > 0
  const overSpend = remaining < 0 && row.kind === 'expense'
  const ahead = remaining < 0 && row.kind === 'income'

  useEffect(() => {
    setBudgeted(String(row.budgeted))
    setNotes(row.notes)
  }, [row.budgeted, row.notes])

  return (
    <tr
      className={`border-t border-[var(--border)] align-top ${
        review ? 'bg-rose-50' : active ? 'bg-[var(--brand-green)]/5' : ''
      }`}
    >
      <td className="py-2 pr-2">
        <button type="button" className="text-left" onClick={() => onFocus(row.syncKey)}>
          <p className="font-medium hover:underline">{row.name}</p>
        </button>
        <p className="text-[11px] text-[#5A6070]">
          {row.owner}
          {row.entryCount ? ` · ${row.entryCount} ${row.entryCount === 1 ? 'row' : 'rows'}` : ''}
        </p>
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-24 border border-[var(--border)] rounded-lg px-2 py-1 text-sm tabular-nums"
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
      <td
        className={`py-2 pr-2 tabular-nums ${
          overSpend ? 'text-rose-700 font-medium' : ahead ? 'text-[var(--brand-green)] font-medium' : ''
        }`}
      >
        {money(remaining)}
      </td>
      <td className="py-2 pr-2">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${
            review
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : row.tracking === 'bank'
                ? 'border-sky-200 bg-sky-50 text-sky-800'
                : row.tracking === 'auto'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : row.tracking === 'skip'
                    ? 'border-[var(--border)] bg-[#F7F5F0] text-[#5A6070]'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {review ? 'Needs a line' : trackingLabel(row.tracking, row.syncKey)}
        </span>
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-full min-w-[10rem] border border-[var(--border)] rounded-lg px-2 py-1 text-xs"
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
            className="text-xs text-[var(--brand-green)] hover:underline"
            onClick={() => onFocus(row.syncKey)}
          >
            Activity
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
