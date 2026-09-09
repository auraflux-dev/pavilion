/**
 * Runtime module gates for API routes.
 * Missing row → demo/trial presets (see store). Explicit save controls the build.
 */
import 'server-only'

import { NextResponse } from 'next/server'
import type { ProductModuleId } from '@/lib/modules/catalog'
import { orgHasModule } from '@/lib/modules/store'

export async function requireOrgModule(
  orgId: string,
  id: ProductModuleId,
): Promise<NextResponse | null> {
  const ok = await orgHasModule(orgId, id)
  if (ok) return null
  return NextResponse.json(
    { error: 'Module not enabled for this organization', module: id },
    { status: 403 },
  )
}
