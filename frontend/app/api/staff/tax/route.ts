import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession, requireStaffRole } from '@/lib/staff/session'
import {
  build990EzWorksheetCsv,
  contractorsNeeding1099,
  listContractorW9,
  resolveTaxOrgId,
  upsertContractorW9,
} from '@/lib/tax/contractor-w9'

async function gate(req: NextRequest) {
  const session = await getStaffSession(req)
  if (!requireStaffRole(session?.staff ?? null, ['treasurer', 'admin', 'programs'])) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session: session! }
}

export async function GET(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error
  const orgId = await resolveTaxOrgId(req)
  if (!orgId) return NextResponse.json({ contractors: [], needing1099: [] })

  const format = String(req.nextUrl.searchParams.get('format') ?? '').trim()
  const contractors = await listContractorW9(orgId)

  if (format === '990ez-csv') {
    const contributions = Number(req.nextUrl.searchParams.get('contributions') || 0)
    const programService = Number(req.nextUrl.searchParams.get('programService') || 0)
    const membershipDues = Number(req.nextUrl.searchParams.get('membershipDues') || 0)
    const otherRevenue = Number(req.nextUrl.searchParams.get('otherRevenue') || 0)
    const grants = Number(req.nextUrl.searchParams.get('grants') || 0)
    const salariesParam = req.nextUrl.searchParams.get('salaries')
    const salariesCents =
      salariesParam != null && String(salariesParam).trim() !== ''
        ? Math.round(Number(salariesParam) * 100)
        : contractors.reduce((s, c) => s + c.ytdPaidCents, 0)
    const otherExpenses = Number(req.nextUrl.searchParams.get('otherExpenses') || 0)
    const year = String(req.nextUrl.searchParams.get('year') || new Date().getFullYear())
    const csv = build990EzWorksheetCsv({
      orgName: 'PTO',
      fiscalYearLabel: year,
      contributionsCents: Math.round(contributions * 100),
      programServiceCents: Math.round(programService * 100),
      membershipDuesCents: Math.round(membershipDues * 100),
      otherRevenueCents: Math.round(otherRevenue * 100),
      grantsCents: Math.round(grants * 100),
      salariesCents,
      otherExpensesCents: Math.round(otherExpenses * 100),
    })
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="990ez-worksheet-${year}.csv"`,
      },
    })
  }

  return NextResponse.json({
    contractors,
    needing1099: contractorsNeeding1099(contractors),
  })
}

export async function POST(req: NextRequest) {
  const g = await gate(req)
  if ('error' in g && g.error) return g.error
  const orgId = await resolveTaxOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'Unavailable' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  try {
    const row = await upsertContractorW9({
      orgId,
      email: String(body.email ?? ''),
      legalName: String(body.legalName ?? ''),
      tinLast4: String(body.tinLast4 ?? ''),
      addressLine: String(body.addressLine ?? ''),
      w9OnFile: body.w9OnFile === true,
      ytdPaidCents: Math.round(Number(body.ytdPaidDollars ?? 0) * 100) || Number(body.ytdPaidCents) || 0,
    })
    return NextResponse.json({ ok: true, contractor: row })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Save failed' },
      { status: 400 },
    )
  }
}
