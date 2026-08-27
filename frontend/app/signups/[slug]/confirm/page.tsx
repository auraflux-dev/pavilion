import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { commonsDbEnabled } from '@/lib/crm/db'
import {
  MissingOrganizationIdError,
  organizationFromHostHeader,
  organizationIdFromRequest,
} from '@/lib/crm/tenant'
import { getRegistrationsByToken } from '@/lib/signups/registrations'
import { resolvePublishedSignupSheet } from '@/lib/signups/sheets'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function SignupConfirmPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token } = await searchParams
  if (!commonsDbEnabled() || !token?.trim()) notFound()

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

  const sheet = await resolvePublishedSignupSheet(slug, orgId)
  if (!sheet) notFound()
  const regs = await getRegistrationsByToken(sheet.organizationId, sheet.id, token)
  if (!regs.length) notFound()

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-10">
      <div className="max-w-lg mx-auto rounded-xl border border-[var(--border,#E5E2DC)] bg-white p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">You&apos;re signed up</h1>
        <p className="text-sm text-[#5A6070]">
          Thanks, {regs[0].participantName}. We have your spot(s) for{' '}
          <strong className="text-[#1A1A1A]">{sheet.title}</strong>.
        </p>
        <ul className="text-sm space-y-1">
          {regs.map((r) => (
            <li key={r.id}>
              • {r.slotTitle}
              {r.quantity > 1 ? ` × ${r.quantity}` : ''}
            </li>
          ))}
        </ul>
        {sheet.location ? (
          <p className="text-sm">
            <span className="font-medium">Location:</span> {sheet.location}
          </p>
        ) : null}
        <p className="text-xs text-[#5A6070]">
          Keep this page for your records.
          When email is connected for this school, a confirmation message is sent too.
        </p>
        <p className="text-sm">
          <Link href={`/signups/${encodeURIComponent(slug)}`} className="underline">
            Back to sheet
          </Link>
        </p>
      </div>
    </main>
  )
}
