import { NextRequest, NextResponse } from 'next/server'
import { persistTrialStart } from '@/lib/crm/persist'
import { canProvisionTrials } from '@/lib/crm/auth-edge'

export const dynamic = 'force-dynamic'

function provisionKeyOk(req: NextRequest, bodyKey?: string): boolean {
  const expected = process.env.COMMONS_PROVISION_SECRET?.trim()
  if (!expected || expected.length < 16) return false
  const header = req.headers.get('x-commons-provision-key')?.trim()
  const query = req.nextUrl.searchParams.get('key')?.trim()
  return header === expected || query === expected || bodyKey === expected
}

export async function POST(req: NextRequest) {
  if (!canProvisionTrials()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Trial signup runs on the Pavilion product app.\nSet PAVILION_PLATFORM on commons-pto-demo.\nAsk Pavilion for a private trial login.',
      },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as {
    schoolName?: string
    slug?: string
    email?: string
    password?: string
    firstName?: string
    lastName?: string
    provisionKey?: string
    brandPack?: string
    product?: 'pavilion' | 'businessrocket'
    modulePresetId?: string
    domainSuffix?: string
    modules?: string[]
  }

  if (!provisionKeyOk(req, body.provisionKey)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Trial sites are private.\nPavilion provisions accounts.\nOpen /trial with your provision key.',
      },
      { status: 401 },
    )
  }
  try {
    const explicitModules = Array.isArray(body.modules)
      ? body.modules.map((m) => String(m).trim()).filter(Boolean)
      : []
    const started = await persistTrialStart({
      req,
      schoolName: body.schoolName || '',
      slug: body.slug,
      email: body.email || '',
      password: body.password || '',
      firstName: body.firstName,
      lastName: body.lastName,
      brandPack: body.brandPack,
      product: body.product,
      modulePresetId: body.modulePresetId,
      domainSuffix: body.domainSuffix,
      modules: explicitModules.length > 0 ? explicitModules : undefined,
    })
    const loginUrl = `https://${started.tempHost}/login`
    const res = NextResponse.json({
      ok: true,
      slug: started.slug,
      orgId: started.orgId,
      tempHost: started.tempHost,
      trialEndsAt: started.trialEndsAt,
      brandPackSlug: started.brandPackSlug,
      product: started.product,
      modules: started.modules,
      modulePresetId: started.modulePresetId,
      next: loginUrl,
    })
    for (const cookie of started.setCookies) {
      res.headers.append('Set-Cookie', cookie)
    }
    return res
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not start trial' },
      { status: 400 },
    )
  }
}
