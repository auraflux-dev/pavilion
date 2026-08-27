import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { commonsDbEnabled } from '@/lib/crm/db'
import { MissingOrganizationIdError, organizationFromHostHeader, organizationIdFromRequest } from '@/lib/crm/tenant'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export default async function SignupPublicPage({ params }: Props) {
  const { slug } = await params
  if (!commonsDbEnabled()) notFound()

  const hdrs = await headers()
  const req = new Request('http://local/signups', { headers: hdrs })
  let sheet
  try {
    let orgId: string | null = null
    try {
      orgId = await organizationIdFromRequest(req)
    } catch (err) {
      if (!(err instanceof MissingOrganizationIdError)) throw err
      const hostRow = await organizationFromHostHeader(req)
      orgId = hostRow?.id ?? null
    }
    sheet = await resolvePublishedSignupSheet(slug, orgId)
  } catch (err) {
    if (!(err instanceof MissingOrganizationIdError)) throw err
    notFound()
  }
  if (!sheet) notFound()

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
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

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Available slots</h2>
          {sheet.slots.map((slot) => {
            const remaining = Math.max(0, slot.quantityNeeded - slot.quantityClaimed)
            return (
              <div
                key={slot.id}
                className="rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#1A1A1A]">{slot.title}</p>
                    {slot.description ? (
                      <p className="text-sm text-[#5A6070] mt-1">{slot.description}</p>
                    ) : null}
                  </div>
                  <span className="text-sm text-[#5A6070]">
                    {remaining} of {slot.quantityNeeded} open
                  </span>
                </div>
                <p className="text-xs text-[#5A6070] mt-3">
                  Participant sign-up form — next iteration (claim + confirmation email).
                </p>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-[#5A6070]">
          <Link href="/" className="underline">
            Back to site
          </Link>
        </p>
      </div>
    </main>
  )
}
