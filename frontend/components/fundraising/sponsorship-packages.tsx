import { CheckCircle2, Star } from 'lucide-react'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import {
  SPONSORSHIP_COMPARE,
  SPONSORSHIP_PACKAGES,
  type SponsorshipPackage,
} from '@/lib/sponsorships'

function fmtDollars(n: number) {
  return `$${n.toLocaleString()}`
}

function PackageCard({ pkg }: { pkg: SponsorshipPackage }) {
  return (
    <article
      className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col relative ${
        pkg.featured ? 'ring-2 ring-[#C9A800] md:-mt-2 md:mb-0' : 'border border-[var(--border)]'
      }`}
    >
      {pkg.featured ? (
        <div
          className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: '#C9A800' }}
        >
          <Star className="w-3 h-3 fill-current" aria-hidden="true" />
          Premier
        </div>
      ) : null}

      <div className="h-1.5 w-full" style={{ backgroundColor: pkg.accent }} aria-hidden="true" />

      <div className="p-6 lg:p-7 flex flex-col flex-1">
        <div className="mb-5">
          <span
            className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-green)' }}
          >
            {pkg.name}
          </span>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-bold text-[#1A1A1A]">{fmtDollars(pkg.price)}</span>
            <span className="text-[#5A6070] text-sm mb-1">one payment</span>
          </div>
          <p className="mt-1 text-xs text-[#5A6070]">2026–27 school year</p>
        </div>

        <div className="space-y-4 mb-8 flex-1">
          {pkg.groups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#5A6070] mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-2" aria-label={`${pkg.name} ${group.label}`}>
                {group.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: pkg.accent }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-[#1A1A1A]">{vanillaizeIfDemo(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <a
          href={`#become-a-sponsor`}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: pkg.featured ? '#C9A800' : 'var(--brand-green)' }}
        >
          Choose {pkg.name}
        </a>
      </div>
    </article>
  )
}

export function SponsorshipPackages() {
  return (
    <div className="mb-14">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 max-w-6xl mx-auto">
        {SPONSORSHIP_PACKAGES.map((pkg) => (
          <PackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>

      <div className="mt-10 hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">Sponsorship package comparison</caption>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[#FAFCF9]">
              <th className="text-left font-semibold px-4 py-3 text-[#5A6070]">Compare</th>
              <th className="text-left font-bold px-4 py-3" style={{ color: '#C9A800' }}>
                Platinum
              </th>
              <th className="text-left font-bold px-4 py-3" style={{ color: 'var(--brand-green)' }}>
                Gold
              </th>
              <th className="text-left font-bold px-4 py-3 text-[#6B7280]">Silver</th>
            </tr>
          </thead>
          <tbody>
            {SPONSORSHIP_COMPARE.map((row) => (
              <tr key={row.label} className="border-t border-[#F0EBE3]">
                <td className="px-4 py-2.5 text-[#5A6070]">{row.label}</td>
                <td className="px-4 py-2.5 text-[#1A1A1A]">{row.platinum}</td>
                <td className="px-4 py-2.5 text-[#1A1A1A]">{row.gold}</td>
                <td className="px-4 py-2.5 text-[#1A1A1A]">{row.silver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-xs text-[#5A6070] mt-4 max-w-2xl mx-auto">
        {vanillaizeIfDemo(
          'Each package is one payment for the 2026–27 school year. Full Year, Half Year, and Quarter of Year Promotion is how long your logo is listed on the website and portal. Gifts support SHMS PTO (501(c)(3)), not Loudoun County Public Schools.',
        )}
      </p>
    </div>
  )
}
