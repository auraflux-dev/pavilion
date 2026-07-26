import {
  CalendarDays,
  CreditCard,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

const ICONS: LucideIcon[] = [
  LayoutDashboard,
  GraduationCap,
  CreditCard,
  CalendarDays,
  Inbox,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
]

type Item = { title: string; detail: string }

function parseLine(line: string): Item {
  // CMS lines often use em/en dashes: "Title — description"
  const parts = line.split(/\s*[\u2014\u2013\-]\s+/)
  if (parts.length >= 2) {
    return { title: parts[0].trim(), detail: parts.slice(1).join(' ').trim() }
  }
  return { title: line.trim(), detail: '' }
}

/** Compact icon callouts for shared portal benefits (keeps section placement). */
export function MembershipPortalCallouts({ lines }: { lines: string[] }) {
  const items = lines.map(parseLine).filter((i) => i.title)
  if (!items.length) return null

  return (
    <section id="portal" className="scroll-mt-28 border-t border-[#E8E4DC] bg-white py-14 md:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: '#085508' }}
          >
            Included with every account
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#1A1A1A] sm:text-3xl">
            Your member portal
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length] ?? Sparkles
            return (
              <li
                key={`${item.title}-${i}`}
                className="rounded-2xl border border-[#E8E4DC] bg-[#FAFCF9] p-4 transition-colors hover:border-[#085508]/35 hover:bg-[#EEF6EE]"
              >
                <div className="flex flex-col items-center text-center">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: '#085508' }}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold text-[#1A1A1A]">{item.title}</h3>
                </div>
                {item.detail ? (
                  <p className="mt-2 pl-3 text-left text-xs leading-relaxed text-[#5A6070]">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
