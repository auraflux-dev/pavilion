import Link from 'next/link'
import { CreditCard, Candy, Shirt } from 'lucide-react'

const SECTIONS = [
  {
    href: '#card',
    label: 'Family Cove card',
    hint: 'Load & reload',
    icon: CreditCard,
  },
  {
    href: '#menu',
    label: 'Snack menu',
    hint: 'In-person window',
    icon: Candy,
  },
  {
    href: '#shop',
    label: 'Spirit wear',
    hint: 'Shop merch',
    icon: Shirt,
  },
] as const

/** Jump links so visitors see card / snacks / spirit wear before scrolling. */
export function CoveSectionNav() {
  return (
    <nav
      className="border-b border-[#E8E4DC]"
      style={{ backgroundColor: '#FAFCF9' }}
      aria-label="The Cove sections"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <p className="text-[10px] font-bold tracking-widest uppercase text-[#5A6070] mb-2">
          At The Cove
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SECTIONS.map(({ href, label, hint, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-xl border border-[#E8E4DC] bg-white px-3 py-2.5 hover:border-[#085508] hover:bg-[#EEF6EE] transition-colors"
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#EEF6EE' }}
                >
                  <Icon className="w-4 h-4" style={{ color: '#085508' }} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-[#1A1A1A]">{label}</span>
                  <span className="block text-xs text-[#5A6070]">{hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
