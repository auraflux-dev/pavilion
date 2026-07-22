'use client'

import { useEffect, useState } from 'react'
import { HelpCircle, BookOpen } from 'lucide-react'
import type { PortalHelpItem } from '@/lib/api/portal-help'

interface Props {
  items: PortalHelpItem[]
}

/** Parent help docs — full answers, always readable (not a collapsed FAQ tease). */
export function PortalHelpPanel({ items }: Props) {
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    function openFromHash() {
      if (typeof window === 'undefined') return
      if (window.location.hash !== '#help') return
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
      <header className="px-5 py-4 border-b border-[#F0EDE8] flex items-start gap-3">
        <HelpCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#085508' }} />
        <div>
          <h2 className="font-bold text-[#1A1A1A] text-base">Portal help</h2>
          <p className="text-sm text-[#5A6070] mt-1 leading-relaxed">
            Short guides for your account, students, membership, The Cove, and surveys. Everything
            stays on this site — no outside links required.
          </p>
        </div>
      </header>

      <div className="px-5 py-5 space-y-5">
        <nav aria-label="Help topics" className="flex flex-wrap gap-2">
          {items.map((item, i) => {
            const id = `help-topic-${i}`
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setFocusId(id)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                  focusId === id
                    ? 'border-[#085508] bg-[#EEF6EE] text-[#085508]'
                    : 'border-[#E8E4DC] text-[#5A6070] hover:border-[#085508]/40'
                }`}
              >
                {item.question.replace(/\?$/, '')}
              </a>
            )
          })}
        </nav>

        <ol className="space-y-6">
          {items.map((item, i) => {
            const id = `help-topic-${i}`
            return (
              <li
                key={id}
                id={id}
                className="scroll-mt-28 rounded-xl border border-[#E8E4DC] bg-[#FAFCF9] px-4 py-4"
              >
                <h3 className="text-sm font-bold text-[#1A1A1A] flex items-start gap-2">
                  <BookOpen
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: '#085508' }}
                    aria-hidden="true"
                  />
                  {item.question}
                </h3>
                <div className="mt-2.5 pl-6 text-sm text-[#5A6070] leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
