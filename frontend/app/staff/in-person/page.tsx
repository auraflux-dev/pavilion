'use client'

/**
 * Printable Open House / event table card for staff.
 * Staff → Membership → Print table card, or open /staff/in-person
 */
import { useMemo } from 'react'
import Link from 'next/link'

const JOIN_PATH = '/join'

function qrSrc(data: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=M&margin=8&data=${encodeURIComponent(data)}`
}

export default function StaffInPersonCardPage() {
  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return `https://www.shmspto.org${JOIN_PATH}`
    return `${window.location.origin}${JOIN_PATH}`
  }, [])

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#1A1A1A]">
      <div className="print:hidden mx-auto max-w-3xl px-4 py-4 flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-[#5A6070]">
          Event table card — print or save as PDF for tomorrow.
        </p>
        <div className="flex gap-2">
          <Link
            href="/staff"
            className="text-xs font-bold underline"
            style={{ color: '#085508' }}
          >
            ← Staff
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg px-3 py-2 text-xs font-bold text-white"
            style={{ backgroundColor: '#085508' }}
          >
            Print / PDF
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 pb-10 print:max-w-none print:px-6 print:pb-0">
        <header className="rounded-2xl border border-[#D9D2C5] bg-white p-6 print:border-black print:rounded-none">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#085508]">
            SHMS PTO · Event table
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            In-person sales + free signup
          </h1>
          <p className="mt-2 text-sm text-[#5A6070]">
            Two money lanes. Never charge the same item twice. Spirit wear → Square
            Stand. Free account → scan or email invite.
          </p>
        </header>

        <section className="mt-4 grid gap-4 md:grid-cols-[1fr_220px] print:grid-cols-[1fr_200px]">
          <div className="rounded-2xl border border-[#D9D2C5] bg-white p-5 space-y-3 print:border-black print:rounded-none">
            <h2 className="text-lg font-bold">Who is this parent?</h2>
            <ol className="space-y-3 text-sm leading-relaxed">
              <li>
                <strong>Already paid member</strong> — Spirit on Stand. Free food
                ticket: show 6-digit code ending in <strong>9</strong>. No charge for
                the perk.
              </li>
              <li>
                <strong>Free member already</strong> — Spirit on Stand. Offer paid
                upgrade on phone: shmspto.org/membership
              </li>
              <li>
                <strong>Not a member yet</strong> — Scan QR → free account. Or Staff →
                Membership → Invite free parent (email / copy SMS).
              </li>
              <li>
                <strong>No phone, wants to pay</strong> — Physical card on Stand for
                spirit. Membership: staff laptop browser or email invite to spouse.
              </li>
              <li>
                <strong>Has phone, not a member</strong> — Scan QR now. Shirt still
                rings on Stand (membership not required for spirit).
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-[#085508] bg-white p-4 text-center flex flex-col items-center justify-center gap-2 print:border-black print:rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc(joinUrl, 240)}
              alt="QR code: scan to join SHMS PTO free"
              width={240}
              height={240}
              className="w-[200px] h-[200px] print:w-[180px] print:h-[180px]"
            />
            <p className="text-sm font-bold text-[#085508]">Scan to join free</p>
            <p className="text-[11px] text-[#5A6070] break-all px-1">{joinUrl}</p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#D9D2C5] bg-white p-5 print:border-black print:rounded-none">
            <h2 className="text-base font-bold">Lane A — Cove Digital Card</h2>
            <p className="mt-2 text-sm text-[#5A6070]">
              Snacks only when they already loaded a card online. Staff register:
              lookup code / QR → Charge. Not for spirit wear.
            </p>
          </div>
          <div className="rounded-2xl border border-[#D9D2C5] bg-white p-5 print:border-black print:rounded-none">
            <h2 className="text-base font-bold">Lane B — Square Stand</h2>
            <p className="mt-2 text-sm text-[#5A6070]">
              Default for shirts, hoodies, magnets, bags, guests. Confirm size → card
              present → hand item. PayPal / Zelle QR only if card fails.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#D9D2C5] bg-white p-5 print:border-black print:rounded-none">
          <h2 className="text-base font-bold">Staff: send join link (no phone / stuck)</h2>
          <ol className="mt-2 list-decimal pl-5 text-sm space-y-1 text-[#5A6070]">
            <li>Staff → Membership → Invite free parent</li>
            <li>Enter email → Send join link</li>
            <li>If email fails: Copy SMS text → paste into Messages from your phone</li>
          </ol>
          <p className="mt-3 text-xs text-[#5A6070]">
            Stuck payment / double charge → treasurer@ · Membership help →
            vp-membershipexperience@
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
