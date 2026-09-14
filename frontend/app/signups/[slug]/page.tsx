import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { appDbEnabled } from '@/lib/crm/db'
import {
  MissingOrganizationIdError,
  organizationFromHostHeader,
  organizationIdFromRequest,
} from '@/lib/crm/tenant'
import { SignupClaimForm } from '@/components/signups/signup-claim-form'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'
import { getStaffSession } from '@/lib/staff/session'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

async function loadSheet(slug: string) {
  if (!appDbEnabled()) return null
  const hdrs = await headers()
  const req = new Request('http://local/signups', { headers: hdrs })
  let orgId: string | null = null
  try {
    orgId = await organizationIdFromRequest(req)
  } catch (err) {
    if (!(err instanceof MissingOrganizationIdError)) throw err
    const hostRow = await organizationFromHostHeader(req)
    orgId = hostRow?.id ?? null
  }
  return resolvePublishedSignupSheet(slug, orgId)
}

export default async function SignupPublicPage({ params }: Props) {
  const { slug } = await params
  const sheet = await loadSheet(slug)
  if (!sheet) notFound()

  const slots = sheet.slots.map((s) => ({
    ...s,
    quantityRemaining: Math.max(0, s.quantityNeeded - s.quantityClaimed),
    claimants: s.claimants || [],
  }))

  const hdrs = await headers()
  const staffReq = new NextRequest('http://local/signups', { headers: hdrs })
  const staffSession = await getStaffSession(staffReq)
  const actor = staffSession?.staff
    ? {
        name:
          staffSession.staff.name.trim() ||
          staffSession.staff.boardTitle.trim() ||
          staffSession.staff.email.split('@')[0] ||
          'Board member',
        email: staffSession.staff.email,
      }
    : null

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-[#5A6070]">Sign-up sheet</p>
          <h1 className="text-2xl font-semibold text-[#1A1A1A] mt-1">{sheet.title}</h1>
          {sheet.description ? (
            <p className="text-sm text-[#5A6070] mt-3 whitespace-pre-line">{sheet.description}</p>
          ) : null}
          {sheet.location ? (
            <p className="text-sm mt-2">
              <span className="font-medium">Location:</span> {sheet.location}
            </p>
          ) : null}
        </div>

        <SignupClaimForm
          slug={sheet.slug}
          fields={sheet.fields}
          slots={slots}
          location={sheet.location}
          sheetTitle={sheet.title}
          timezone={sheet.timezone}
          actor={actor}
          requireStaffIdentity={sheet.settings.requireStaffIdentity === true}
        />

        <p className="text-center text-sm text-[#5A6070]">
          <Link href="/" className="underline">
            Back to site
          </Link>
        </p>
      </div>
    </main>
  )
}
