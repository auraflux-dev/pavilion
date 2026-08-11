import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/** Hide after Open House day (America/New_York calendar date). */
const OPEN_HOUSE_DATE = '2026-08-13'

function stillShowingOpenHouse(now = new Date()): boolean {
  try {
    const todayEt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    return todayEt <= OPEN_HOUSE_DATE
  } catch {
    return now.toISOString().slice(0, 10) <= OPEN_HOUSE_DATE
  }
}

/**
 * Time-boxed home promo for SHMS PTO Open House (Thu 8/13).
 * One job: get families to the cafeteria with tickets + membership/Cove info.
 */
export function OpenHousePromo() {
  if (!stillShowingOpenHouse()) return null

  return (
    <section
      id="open-house"
      className="scroll-mt-28 relative overflow-hidden"
      aria-labelledby="open-house-heading"
      style={{
        background:
          'linear-gradient(165deg, #0a3d0a 0%, #085508 42%, #0d4a0d 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 80% 20%, #98C818 0%, transparent 55%)',
        }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#98C818] mb-3">
          This week · Thursday Aug 13
        </p>
        <h2
          id="open-house-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-balance max-w-3xl"
        >
          SHMS PTO Open House
        </h2>
        <p className="mt-4 text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl text-pretty">
          Meet us in the cafeteria. Spirit wear, memberships, Member Portal, Cove
          Digital Card, enrichment info — plus Sips &amp; Sweets food truck tickets.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-8 text-white">
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[#98C818] mb-3">
                Sessions
              </h3>
              <ul className="space-y-3 text-base sm:text-lg leading-snug">
                <li>
                  <span className="font-bold">6th grade</span>
                  <span className="text-white/75"> · 9:00 AM – 11:00 AM</span>
                </li>
                <li>
                  <span className="font-bold">7th &amp; 8th grade</span>
                  <span className="text-white/75"> · 1:00 PM – 3:00 PM</span>
                </li>
                <li className="text-white/80 text-sm sm:text-base pt-1">
                  Location: Cafeteria
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[#98C818] mb-3">
                At our table
              </h3>
              <ul className="space-y-2 text-sm sm:text-base text-white/90 leading-relaxed">
                <li>Spirit wear for purchase</li>
                <li>PTO memberships · Member Portal · website walkthrough</li>
                <li>Cove Digital Card + enrichment programs (board members on hand)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[#98C818] mb-3">
                Food truck · Sips &amp; Sweets
              </h3>
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                On site <span className="font-bold text-white">9:00 AM – 3:00 PM</span> for
                both sessions. Claim <span className="font-bold text-white">1 ticket per
                family</span> at the PTO table in the cafeteria.
              </p>
              <p className="mt-3 text-sm sm:text-base text-white/90 leading-relaxed">
                <span className="font-bold text-[#98C818]">Paid PTO members:</span> free
                refreshment tickets for your entire family (show your Family Cove code —
                paid codes end in 9).
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/membership"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-[#085508] bg-[#FFD700] hover:bg-[#ffe44d] transition-colors"
              >
                Join / renew membership
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link
                href="/cove"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold text-white border border-white/35 hover:bg-white/10 transition-colors"
              >
                Cove Digital Card
              </Link>
            </div>
          </div>

          <figure className="lg:sticky lg:top-28">
            <div className="relative rounded-xl overflow-hidden bg-white shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55)]">
              <Image
                src="/events/sips-and-sweets-menu.png"
                alt="Sips & Sweets food truck menu: iced lattes, dirty sodas, refreshers $6; popsicles and treats $4"
                width={1200}
                height={900}
                className="w-full h-auto"
                priority
              />
            </div>
            <figcaption className="mt-3 text-xs sm:text-sm text-white/65 text-center">
              Sips &amp; Sweets menu ·{' '}
              <a
                href="https://www.instagram.com/sipsnsweets.truck"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white transition-colors"
              >
                Follow @Sipsnsweets.truck
              </a>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
