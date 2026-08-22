/**
 * GET    /api/staff/budget?year=2026-27  list lines, actuals, activity
 * POST   seed | refresh | entry | create | import-bofa | reclassify
 * PATCH  update a line (budgeted / notes)
 * DELETE line (?id=) or keyed activity (?entryId=)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRoleOrWorkspace } from '@/lib/staff/session'
import {
  createBudgetLine,
  DEFAULT_FISCAL_YEAR,
  deleteBudgetLine,
  FISCAL_YEAR_LABEL,
  listBudgetLines,
  seedPlaceholderBudget,
  summarizeBudget,
  updateBudgetLine,
  type BudgetKind,
  type BudgetLine,
} from '@/lib/staff/budget'
import {
  addKeyedBudgetEntry,
  applyEntryTotals,
  deleteBudgetEntry,
  listBudgetEntries,
  reclassifyBudgetEntry,
  refreshBudgetActuals,
  trackingFor,
  type BudgetEntry,
} from '@/lib/staff/budget-sync'
import { hasActivePlaidItem, listActivePlaidItems, publicPlaidStatus } from '@/lib/staff/plaid-items'
import { plaidConfigured } from '@/lib/staff/plaid'
import { refreshPlaidIntoBudget } from '@/lib/staff/plaid-sync'
import { isBankOrigin } from '@/lib/staff/budget-bank'
import { importBofaCsv } from '@/lib/staff/bofa-csv'
import { refreshPaypalIntoBudget } from '@/lib/staff/paypal-sync'
import { isPayPalConfigured } from '@/lib/paypal'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRoleOrWorkspace(session?.staff ?? null, ['treasurer', 'admin'], ['budget'])) {
    return null
  }
  return session
}

function decorate(line: BudgetLine, entries: BudgetEntry[]) {
  return {
    ...line,
    tracking: trackingFor(line.syncKey),
    entryCount: entries.filter((e) => e.lineSyncKey === line.syncKey).length,
  }
}

async function payload(
  year: string,
  extra?: { entries?: BudgetEntry[]; added?: number; updated?: number; source?: string; message?: string },
) {
  const listed = await listBudgetLines(year)
  const entries = extra?.entries ?? (await listBudgetEntries(year))
  const plaidItems = plaidConfigured() ? await listActivePlaidItems() : []
  const bankConnected = plaidItems.length > 0 || entries.some((e) => isBankOrigin(e.origin))
  const lines = applyEntryTotals(listed, entries).map((line) => decorate(line, entries))
  return {
    year,
    label: year === DEFAULT_FISCAL_YEAR ? FISCAL_YEAR_LABEL : year,
    lines,
    summary: summarizeBudget(lines),
    entries,
    added: extra?.added,
    updated: extra?.updated,
    source: extra?.source,
    message: extra?.message,
    plaid: {
      configured: plaidConfigured(),
      ...publicPlaidStatus(plaidItems),
    },
    paypal: {
      configured: isPayPalConfigured(),
    },
    bankConnected,
  }
}

export async function GET(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const year = req.nextUrl.searchParams.get('year')?.trim() || DEFAULT_FISCAL_YEAR
  try {
    return NextResponse.json(await payload(year))
  } catch (err) {
    console.error('budget GET', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to load budget (PtoBudgetLines collection may need to be created)',
      },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await gate(req)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const year = String(body.fiscalYear ?? body.year ?? DEFAULT_FISCAL_YEAR).trim() || DEFAULT_FISCAL_YEAR
    const action = String(body.action ?? 'create')

    if (action === 'seed') {
      await seedPlaceholderBudget(year)
      return NextResponse.json({ ok: true, ...(await payload(year)) })
    }

    if (action === 'import-bofa') {
      const csv = String(body.csv ?? '')
      if (!csv.trim()) return NextResponse.json({ error: 'Paste or upload a BoA CSV' }, { status: 400 })
      const result = await importBofaCsv({
        csv,
        fiscalYear: year,
        actorEmail: session.email,
      })
      const entries = await listBudgetEntries(year)
      return NextResponse.json({
        ok: true,
        ...(await payload(year, {
          entries,
          added: result.added,
          updated: result.updated,
          source: 'bofa',
          message: `Imported BoA CSV (Aug to Jul school year only) · ${result.added} new, ${result.updated} already in, ${result.skippedPayouts} Square/PayPal payouts skipped (those sales stay in Staff Payments), ${result.skipped} other skipped.`,
        })),
      })
    }

    if (action === 'refresh') {
      const notes: string[] = []
      if (isPayPalConfigured()) {
        const paypal = await refreshPaypalIntoBudget({
          fiscalYear: year,
          actorEmail: session.email,
        })
        notes.push(
          paypal.error
            ? `PayPal: ${paypal.error}`
            : `PayPal live · ${paypal.added} new, ${paypal.updated} already in`,
        )
      } else {
        notes.push('PayPal live feed is off until Client ID, Secret, and Transaction Search are set.')
      }
      if (plaidConfigured() && (await hasActivePlaidItem())) {
        const result = await refreshPlaidIntoBudget({
          fiscalYear: year,
          actorEmail: session.email,
        })
        const entries = await listBudgetEntries(year)
        return NextResponse.json({
          ok: true,
          ...(await payload(year, {
            entries,
            added: result.added,
            updated: result.updated,
            source: 'plaid',
            message: [...notes, result.message].filter(Boolean).join(' · '),
          })),
        })
      }
      const { added, entries } = await refreshBudgetActuals({
        fiscalYear: year,
        actorEmail: session.email,
      })
      return NextResponse.json({
        ok: true,
        ...(await payload(year, {
          entries,
          added,
          source: 'staff',
          message: notes.join(' · '),
        })),
      })
    }

    if (action === 'reclassify') {
      const entries = await reclassifyBudgetEntry({
        id: String(body.id ?? body.entryId ?? ''),
        lineSyncKey: String(body.lineSyncKey ?? ''),
        fiscalYear: year,
      })
      return NextResponse.json({ ok: true, ...(await payload(year, { entries })) })
    }

    if (action === 'entry') {
      const entries = await addKeyedBudgetEntry({
        fiscalYear: year,
        lineSyncKey: String(body.lineSyncKey ?? ''),
        occurredAt: String(body.occurredAt ?? ''),
        amount: Number(body.amount ?? 0),
        memo: String(body.memo ?? ''),
        createdByEmail: session.email,
      })
      return NextResponse.json({ ok: true, ...(await payload(year, { entries })) })
    }

    const created = await createBudgetLine({
      fiscalYear: year,
      kind: (String(body.kind) === 'income' ? 'income' : 'expense') as BudgetKind,
      category: String(body.category ?? ''),
      name: String(body.name ?? ''),
      budgeted: Number(body.budgeted ?? 0),
      actual: 0,
      owner: String(body.owner ?? ''),
      notes: String(body.notes ?? ''),
      sortOrder: Number(body.sortOrder ?? 400),
    })
    return NextResponse.json({ ok: true, line: created, ...(await payload(year)) })
  } catch (err) {
    console.error('budget POST', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save budget' },
      { status: 400 },
    )
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json()
    const id = String(body.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const year = String(body.fiscalYear ?? body.year ?? DEFAULT_FISCAL_YEAR).trim() || DEFAULT_FISCAL_YEAR
    const patch: Parameters<typeof updateBudgetLine>[1] = {}
    if (body.kind != null) patch.kind = String(body.kind) === 'income' ? 'income' : 'expense'
    if (body.category != null) patch.category = String(body.category)
    if (body.name != null) patch.name = String(body.name)
    if (body.budgeted != null) patch.budgeted = Number(body.budgeted)
    if (body.owner != null) patch.owner = String(body.owner)
    if (body.notes != null) patch.notes = String(body.notes)
    if (body.sortOrder != null) patch.sortOrder = Number(body.sortOrder)
    await updateBudgetLine(id, patch)
    return NextResponse.json({ ok: true, ...(await payload(year)) })
  } catch (err) {
    console.error('budget PATCH', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update budget line' },
      { status: 400 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await gate(req))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const entryId = req.nextUrl.searchParams.get('entryId')?.trim() || ''
    const year = req.nextUrl.searchParams.get('year')?.trim() || DEFAULT_FISCAL_YEAR
    if (entryId) {
      const entries = await deleteBudgetEntry(entryId, year)
      return NextResponse.json({ ok: true, ...(await payload(year, { entries })) })
    }
    const id = req.nextUrl.searchParams.get('id')?.trim() || ''
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deleteBudgetLine(id)
    return NextResponse.json({ ok: true, ...(await payload(year)) })
  } catch (err) {
    console.error('budget DELETE', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete' },
      { status: 400 },
    )
  }
}
