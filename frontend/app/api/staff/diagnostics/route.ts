import { NextRequest, NextResponse } from 'next/server'
import { requireBrandStaff } from '@/lib/staff/brand-staff-gate'
import { collectStaffDiagnostics } from '@/lib/staff/seo-diagnostics'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const gated = await requireBrandStaff(req)
  if (!gated.ok) return gated.res
  const snapshot = await collectStaffDiagnostics()
  return NextResponse.json(snapshot)
}
