'use client'

/**
 * Printable Open House / event table card for staff.
 * Live ringing: Staff → The Cove + Square Stand (see docs/COVE-IN-PERSON.md).
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
          Printable cheat sheet — Cove on Staff laptop · card on Square Stand · never charge twice.
        </p>
        <div className="flex gap-2">
          <Link href="/staff" className="text-xs font-bold underline" style={{ color: '#085508' }}>
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
          <h1 className="mt-1 text-2xl font-bold tracking-tight">How to take payment</h1>
          <p className="mt-2 text-sm text-[#1A1A1A] leading-relaxed">
            Parents can also pay themselves online (portal / site). At the table: Cove wallet → Staff ·
            Card → Stand · Cash → Staff. Never charge the same item twice.
          </p>
        </header>

        <section className="mt-4 overflow-hidden rounded-2xl border-2 border-[#085508] bg-white print:border-black print:rounded-none">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#EEF6EE] text-[#085508]">
              <tr>
                <th className="p-3 font-bold">Situation</th>
                <th className="p-3 font-bold">Do this</th>
              </tr>
            </thead>
            <tbody className="text-[#1A1A1A]">
              <tr className="border-t border-[#E8E4DC]">
                <td className="p-3 align-top">Cove Digital Card balance</td>
                <td className="p-3 align-top">
                  Staff → The Cove → lookup → <strong>Charge Cove</strong>
                </td>
              </tr>
              <tr className="border-t border-[#E8E4DC]">
                <td className="p-3 align-top">Card tap / swipe (anyone)</td>
                <td className="p-3 align-top">
                  <strong>Square Stand only</strong> — ring → take card → stop
                </td>
              </tr>
              <tr className="border-t border-[#E8E4DC]">
                <td className="p-3 align-top">Cash</td>
                <td className="p-3 align-top">
                  Staff → Guest → cart → <strong>Cash</strong>
                </td>
              </tr>
              <tr className="border-t border-[#E8E4DC]">
                <td className="p-3 align-top">Already paid online</td>
                <td className="p-3 align-top">
                  Staff → Retail → <strong>Pickup</strong> · no new charge
                </td>
              </tr>
              <tr className="border-t border-[#E8E4DC]">
                <td className="p-3 align-top">Paid member · free food ticket</td>
                <td className="p-3 align-top">
                  Code ends in <strong>9</strong> → hand ticket · no charge
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className="rounded-2xl border-2 bg-white p-5 print:border-black print:rounded-none"
            style={{ borderColor: '#085508' }}
          >
            <h2 className="text-base font-bold text-[#085508]">Laptop · Staff</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-[#5A6070] space-y-1 leading-relaxed">
              <li>Cove Charge</li>
              <li>Cash</li>
              <li>Pickup</li>
              <li>Join invite (after sale)</li>
            </ul>
          </div>
          <div
            className="rounded-2xl border-2 bg-white p-5 print:border-black print:rounded-none"
            style={{ borderColor: '#0B3D0B' }}
          >
            <h2 className="text-base font-bold text-[#0B3D0B]">iPad · Square Stand</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-[#5A6070] space-y-1 leading-relaxed">
              <li>Spirit sizes / colors</li>
              <li>Any card-present sale</li>
              <li>No Guest needed for card</li>
              <li>Syncs to Staff Payments</li>
            </ul>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-[1fr_220px] print:grid-cols-[1fr_200px]">
          <div className="rounded-2xl border border-[#D9D2C5] bg-white p-5 space-y-3 print:border-black print:rounded-none">
            <h2 className="text-lg font-bold">Online · parents</h2>
            <ul className="space-y-2 text-sm leading-relaxed text-[#5A6070]">
              <li>
                <strong>No membership:</strong> join free if they want · shop · pay with card on the
                site.
              </li>
              <li>
                <strong>Members:</strong> portal · pay with Cove balance and/or card.
              </li>
              <li>
                <strong>At table after online pay:</strong> pickup only.
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
            <p className="text-[11px] text-[#5A6070] px-1">Sale first · not required to buy</p>
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
