'use client'

/**
 * Printable Open House / event table card for staff.
 * Not the live POS — that is Staff → Retail → In-person sales.
 * Nav: Staff → Membership → Print table card, or Staff → Retail → Print table card.
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
          Printable cheat sheet for the table — live ringing is Staff → Retail → In-person sales.
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
        <header
          className="rounded-2xl border-2 p-6 print:border-black print:rounded-none"
          style={{ borderColor: '#085508', backgroundColor: '#EEF6EE' }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#085508]">
            SHMS PTO · Event / window table
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            In-person sales
          </h1>
          <p className="mt-2 text-sm text-[#1A1A1A] leading-relaxed">
            One staff screen for snacks <strong>and</strong> spirit: Staff → <strong>Retail</strong> →{' '}
            <strong>In-person sales</strong>. Cove card, Square card, cash, or Guest. Inventory
            tracks every tender. Never charge the same item twice.
          </p>
        </header>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl border-2 bg-white p-5 print:border-black print:rounded-none"
            style={{ borderColor: '#085508' }}
          >
            <h2 className="text-base font-bold text-[#085508]">
              Has Cove Digital Card
            </h2>
            <p className="mt-2 text-sm text-[#5A6070] leading-relaxed">
              Scan family QR (camera) <em>or</em> type passcode / 6-digit → tap products →{' '}
              <strong>Charge Cove</strong> (or Card / Cash if they prefer).
            </p>
          </div>
          <div
            className="rounded-2xl border-2 bg-white p-5 print:border-black print:rounded-none"
            style={{ borderColor: '#0B3D0B' }}
          >
            <h2 className="text-base font-bold text-[#0B3D0B]">
              Guest / no Cove card
            </h2>
            <p className="mt-2 text-sm text-[#5A6070] leading-relaxed">
              Ring snacks or spirit on <strong>Square Stand</strong> (iPad) or phone Square app —
              tap / swipe there. Sales sync into Staff. Or use Staff → Guest → <strong>Cash</strong>.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border-2 border-[#0B3D0B] bg-white p-5 print:border-black print:rounded-none">
          <h2 className="text-lg font-bold text-[#0B3D0B]">
            Open House / spirit at the table
          </h2>
          <ol className="mt-3 list-decimal pl-5 text-sm space-y-2 leading-relaxed">
            <li>Confirm size / item.</li>
            <li>
              Ring on <strong>Square Stand</strong> (preferred for card) — syncs to Staff. Or Staff →
              In-person sales → Cash / Mark paid on Stand backup.
            </li>
            <li>Hand the item.</li>
            <li>
              Optional: free join QR below — <strong>after</strong> the sale, never instead.
            </li>
          </ol>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-[1fr_220px] print:grid-cols-[1fr_200px]">
          <div className="rounded-2xl border border-[#D9D2C5] bg-white p-5 space-y-3 print:border-black print:rounded-none">
            <h2 className="text-lg font-bold">Also common</h2>
            <ul className="space-y-3 text-sm leading-relaxed">
              <li>
                <strong>Already ordered online</strong> — Staff → Retail → Pickup. Hand bag → mark
                handed out. No new charge.
              </li>
              <li>
                <strong>Paid member · free food ticket</strong> — 6-digit Cove code ending in{' '}
                <strong>9</strong>. Hand ticket. No charge for the perk.
              </li>
              <li>
                <strong>Wants free portal account</strong> — Scan QR or Guest email invite after
                sale.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#085508] bg-white p-4 text-center flex flex-col items-center justify-center gap-2 print:border-black print:rounded-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc(joinUrl, 240)}
              alt="QR code: optional free join"
              width={240}
              height={240}
              className="w-[200px] h-[200px] print:w-[180px] print:h-[180px]"
            />
            <p className="text-sm font-bold text-[#085508]">Optional · join free</p>
            <p className="text-[11px] text-[#5A6070] px-1">
              Not required for spirit. Sale first.
            </p>
            <p className="text-[10px] text-[#5A6070] break-all px-1">{joinUrl}</p>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#D9D2C5] bg-white p-5 print:border-black print:rounded-none">
          <h2 className="text-base font-bold">Stuck / no phone for free join</h2>
          <ol className="mt-2 list-decimal pl-5 text-sm space-y-1 text-[#5A6070]">
            <li>Still complete the sale on In-person sales (or Stand) first.</li>
            <li>
              Staff → Membership → Invite free parent (email or copy SMS) if they want an account
              later.
            </li>
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
