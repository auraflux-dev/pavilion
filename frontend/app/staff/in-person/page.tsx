'use client'

/**
 * Printable Open House / window table card.
 * Sell first. Login and Cove card are optional.
 */
import { useMemo } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isPublicDemoInstance } from '@/lib/demo/instance'

const JOIN_PATH = '/join'

function qrSrc(data: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&margin=8&data=${encodeURIComponent(data)}`
}

export default function StaffInPersonCardPage() {
  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return `https://www.shmspto.org${JOIN_PATH}`
    return `${window.location.origin}${JOIN_PATH}`
  }, [])

  if (isPublicDemoInstance()) notFound()

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#1A1A1A]">
      <div className="print:hidden mx-auto max-w-3xl px-4 py-4 flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-[#5A6070]">
          Printable cheat sheet. No login required to buy · never charge twice.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/staff" className="text-xs font-bold underline" style={{ color: 'var(--brand-green)' }}>
            ← Staff
          </Link>
          <Link
            href="/staff?view=help&article=cove-in-person-manual"
            className="text-xs font-bold underline"
            style={{ color: 'var(--brand-green)' }}
          >
            Full manual
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--brand-green)' }}
          >
            Print / PDF
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-10 print:max-w-none print:px-6 print:pb-0">
        <header
          className="rounded-2xl border-2 p-6 print:border-black print:rounded-none"
          style={{ borderColor: 'var(--brand-green)', backgroundColor: 'var(--brand-soft)' }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-green)]">
            SHMS PTO · Event / snack window
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">How to take payment</h1>
          <p className="mt-2 text-sm text-[#1A1A1A] leading-relaxed">
            <strong>Sell first.</strong> Guests do not need a portal login or Cove card. Offer Join QR
            after (or while they wait). Memberships are portal-only.
          </p>
        </header>

        <section className="mt-4 overflow-hidden rounded-2xl border-2 border-[var(--brand-green)] bg-white print:border-black print:rounded-none">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--brand-soft)] text-[var(--brand-green)]">
              <tr>
                <th className="p-3 font-bold">How are they paying?</th>
                <th className="p-3 font-bold">Do this</th>
              </tr>
            </thead>
            <tbody className="text-[#1A1A1A]">
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Cash · card · Apple Pay · Google Pay</td>
                <td className="p-3 align-top">
                  <strong>Square Stand</strong>: ring → take payment → stop. Do not also charge in
                  Staff.
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Cove Photos QR</td>
                <td className="p-3 align-top">
                  <strong>Square Stand</strong>: <strong>Gift card</strong> → scan → stop.
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Cove 6-digit or word passcode</td>
                <td className="p-3 align-top">
                  <strong>Square Stand</strong>: search Customer → <strong>Card on File</strong> →
                  stop. (Must have loaded Cove in portal.)
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Unable to load cards / no Cove balance</td>
                <td className="p-3 align-top">
                  Cash or card on Stand, or Staff → <strong>Charge Cove</strong> backup
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Zelle / PayPal / phone Square</td>
                <td className="p-3 align-top">
                  Staff → <strong>External pay</strong> → log amount (AM / no Stand)
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Member portal / site checkout</td>
                <td className="p-3 align-top">
                  They pay themselves online → Staff → <strong>Pickup</strong> only · no Stand / no
                  Cove charge
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top">Lagoon / Tide · free food ticket</td>
                <td className="p-3 align-top">
                  Code ends in <strong>9</strong> → hand ticket · no charge (not Reef)
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Reef · pay with Cove</td>
                <td className="p-3 align-top">
                  Lookup 6-digit / passcode → ring <strong>BTSN food truck ticket</strong> ($6 each) →
                  deduct Cove (QR or Card on File) → then hand ticket
                </td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="p-3 align-top font-semibold">Guest / non-member · food truck</td>
                <td className="p-3 align-top">
                  They pay the truck. Do not ring Stand. No PTO ticket.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl border-2 bg-white p-5 print:border-black print:rounded-none"
            style={{ borderColor: 'var(--brand-dark)' }}
          >
            <h2 className="text-base font-bold text-[var(--brand-dark)]">Snack window (school days)</h2>
            <p className="mt-2 text-sm text-[#5A6070] leading-relaxed">
              Default: <strong>Stand</strong> for cash, card, Photos QR, and PIN/passcode (Card on
              File). Staff Charge Cove only as backup.
            </p>
          </div>
          <div
            className="rounded-2xl border-2 bg-white p-5 print:border-black print:rounded-none"
            style={{ borderColor: 'var(--brand-green)' }}
          >
            <h2 className="text-base font-bold text-[var(--brand-green)]">Events (BTSN Aug 27)</h2>
            <p className="mt-2 text-sm text-[#5A6070] leading-relaxed">
              Stand owns Cove tenders. Guests pay the food truck. Reef: lookup → $6 Cove ticket
              → hand ticket. Soft-ask Join QR. Purchases will outnumber joins.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-[1fr_220px] print:grid-cols-[1fr_200px]">
          <div className="rounded-2xl border border-[#D9D2C5] bg-white p-5 space-y-3 print:border-black print:rounded-none">
            <h2 className="text-lg font-bold">Memberships · online</h2>
            <ul className="space-y-2 text-sm leading-relaxed text-[#5A6070]">
              <li>
                <strong>Reef / Lagoon / Tide:</strong> parent pays in the <strong>portal</strong> only
                (not Stand).
              </li>
              <li>
                <strong>Free join:</strong> optional QR. Not required to buy spirit or snacks.
              </li>
              <li>
                <strong>Cove load:</strong> parents do later in portal when ready.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--brand-green)] bg-white p-4 text-center flex flex-col items-center justify-center gap-2 print:border-black print:rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc(joinUrl, 240)}
              alt="QR code: optional free join"
              width={240}
              height={240}
              className="w-[200px] h-[200px] print:w-[180px] print:h-[180px]"
            />
            <p className="text-sm font-bold text-[var(--brand-green)]">Optional · join free</p>
            <p className="text-[11px] text-[#5A6070] px-1">After the sale · not a gate</p>
            <p className="text-[10px] text-[#5A6070] break-all px-1">{joinUrl}</p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#D9D2C5] bg-white p-5 print:border-black print:rounded-none">
          <p className="text-xs text-[#5A6070]">
            Stuck payment / double charge → treasurer@ · Membership → vp-membershipexperience@
          </p>
        </section>
      </article>

      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}
