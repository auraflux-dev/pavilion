'use client'

import { useEffect, useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import type { PortalHelpItem } from '@/lib/api/portal-help'

interface Props {
  items: PortalHelpItem[]
}

export function PortalHelpPanel({ items }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(0)

  useEffect(() => {
    function openFromHash() {
      if (typeof window === 'undefined') return
      if (window.location.hash !== '#help') return
      setOpen(true)
      // Wait for expand so scroll lands on the open panel under the sticky header
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          document.getElementById('help')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
      })
    }
    openFromHash()
    window.addEventListener('hashchange', openFromHash)
    return () => window.removeEventListener('hashchange', openFromHash)
  }, [])

  if (!items.length) return null

  return (
    <section
      id="help"
      className="mt-8 scroll-mt-28 rounded-2xl border border-[#E8E4DC] bg-white overflow-hidden shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#FAFCF9]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-bold text-[#1A1A1A]">
          <HelpCircle className="w-5 h-5" style={{ color: '#085508' }} />
          Portal help — your home base
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-[#5A6070]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#5A6070]" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#F0EDE8]">
          <p className="text-xs text-[#5A6070] py-3">
            Everything below stays inside the portal — edit your profile, manage students, load store
            cards, and answer surveys without leaving this page.
          </p>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={item.question} className="rounded-xl border border-[#E8E4DC] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-[#1A1A1A] hover:bg-[#FAFCF9]"
                >
                  {item.question}
                </button>
                {expanded === i && (
                  <p className="px-4 pb-3 text-xs text-[#5A6070] leading-relaxed whitespace-pre-line">
                    {item.answer}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
