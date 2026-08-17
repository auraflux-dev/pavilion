/**
 * GET /api/staff/budget/export?year=2026-27
 * Excel workbook (Summary, Budget, Activity) for treasurer planning.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import { DEFAULT_FISCAL_YEAR, listBudgetLines } from '@/lib/staff/budget'
import { listBudgetEntries } from '@/lib/staff/budget-sync'
import { buildBudgetWorkbook } from '@/lib/staff/budget-export'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const year = req.nextUrl.searchParams.get('year')?.trim() || DEFAULT_FISCAL_YEAR
  try {
    const [lines, entries] = await Promise.all([listBudgetLines(year), listBudgetEntries(year)])
    const file = await buildBudgetWorkbook({ year, lines, entries })
    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="shms-pto-budget-${year}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('budget export', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not export Excel' },
      { status: 500 },
    )
  }
}
