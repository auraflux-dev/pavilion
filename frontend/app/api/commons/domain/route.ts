import { NextRequest, NextResponse } from 'next/server'
import { addCommonsDomain, checkCommonsDomain, recommendedRecords } from '@/lib/crm/custom-domain'
import { commonsDbEnabled, sql } from '@/lib/crm/db'
import { ensureCommonsReady } from '@/lib/crm/migrate'
import { isDemoInstance } from '@/lib/demo/instance'
import { MissingOrganizationIdError, organizationIdFromRequest } from '@/lib/crm/tenant'
import { isCommonsPlatformHost } from '@/lib/crm/auth-edge'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain') || ''
  if (!domain.trim()) {
    return NextResponse.json({
      records: recommendedRecords('pto.yourschool.org'),
      article: '/staff?view=help#custom-domain',
      note:
        'Apex uses A 76.76.21.21. www and other subdomains use CNAME cname.vercel-dns.com.\nStaff Help has the full walkthrough.',
    })
  }
  try {
    const result = await checkCommonsDomain(domain)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Check failed' },
      { status: 400 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (isDemoInstance()) {
    return NextResponse.json(
      {
        error:
          'The sample demo does not attach custom domains.\nStart a trial, then add DNS from that school’s Staff → Site settings.',
      },
      { status: 409 },
    )
  }
  if (!isCommonsPlatformHost()) {
    return NextResponse.json(
      { error: 'Custom domains are added on the Commons app host.' },
      { status: 503 },
    )
  }
  const body = (await req.json().catch(() => ({}))) as { domain?: string }
  try {
    const result = await addCommonsDomain(body.domain || '')
    if (commonsDbEnabled()) {
      try {
        await ensureCommonsReady()
        const orgId = await organizationIdFromRequest(req)
        await sql(`update organizations set custom_domain = $1 where id = $2`, [
          result.domain,
          orgId,
        ])
      } catch (err) {
        if (!(err instanceof MissingOrganizationIdError)) throw err
      }
    }
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not add domain' },
      { status: 400 },
    )
  }
}
