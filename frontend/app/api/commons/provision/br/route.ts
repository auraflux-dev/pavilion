import { NextRequest, NextResponse } from 'next/server'
import { persistTrialStart } from '@/lib/crm/persist'
import { canProvisionTrials } from '@/lib/crm/auth-edge'
import { MODULE_PRESET_BR_STARTER } from '@/lib/modules/catalog'

export const dynamic = 'force-dynamic'

/**
 * Business Rocket provision door.
 * Creates a Pavilion org with product=businessrocket, BR starter modules,
 * and temp host {slug}.businessrocket.ai.
 *
 * Auth: same COMMONS_PROVISION_SECRET as /api/commons/trial/start
 * (header x-commons-provision-key, ?key=, or body.provisionKey).
 */
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
          'BR provision runs on the Pavilion product app.\nSet PAVILION_PLATFORM on commons-pto-demo.',
      },
      { status: 503 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as {
    businessName?: string
    schoolName?: string
    slug?: string
    email?: string
    password?: string
    firstName?: string
    lastName?: string
    provisionKey?: string
    brandPack?: string
    modulePresetId?: string
    customDomain?: string
  }

  if (!provisionKeyOk(req, body.provisionKey)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Pass COMMONS_PROVISION_SECRET.' },
      { status: 401 },
    )
  }

  const businessName = (body.businessName || body.schoolName || '').trim()

  try {
    const started = await persistTrialStart({
      req,
      schoolName: businessName,
      slug: body.slug,
      email: body.email || '',
      password: body.password || '',
      firstName: body.firstName,
      lastName: body.lastName,
      brandPack: body.brandPack,
      product: 'businessrocket',
      modulePresetId: body.modulePresetId || MODULE_PRESET_BR_STARTER.id,
    })

    let customDomain = ''
    const wantCustom = String(body.customDomain || '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    if (wantCustom && wantCustom.includes('.')) {
      const { sql } = await import('@/lib/crm/db')
      await sql(`update organizations set custom_domain = $1 where id = $2`, [
        wantCustom,
        started.orgId,
      ])
      customDomain = wantCustom
    }

    const loginHost = customDomain || started.tempHost
    const loginUrl = `https://${loginHost}/login`
    const res = NextResponse.json({
      ok: true,
      product: 'businessrocket',
      orgId: started.orgId,
      slug: started.slug,
      tempHost: started.tempHost,
      customDomain: customDomain || null,
      trialEndsAt: started.trialEndsAt,
      brandPackSlug: started.brandPackSlug,
      modules: started.modules,
      modulePresetId: body.modulePresetId || MODULE_PRESET_BR_STARTER.id,
      next: loginUrl,
    })
    for (const cookie of started.setCookies) {
      res.headers.append('Set-Cookie', cookie)
    }
    return res
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Could not provision' },
      { status: 400 },
    )
  }
}
