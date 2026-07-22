'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, ArrowRight } from 'lucide-react'

interface SurveyListItem {
  slug: string
  title: string
  description: string
}

export function PortalSurveys() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])

  useEffect(() => {
    fetch('/api/surveys')
      .then((r) => r.json())
      .then((d) => setSurveys(d.surveys ?? []))
      .catch(() => setSurveys([]))
  }, [])

  if (!surveys.length) {
    return (
      <section
        id="surveys"
        className="mt-6 scroll-mt-28 rounded-2xl border border-[#E8E4DC] bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-5 h-5" style={{ color: '#085508' }} />
          <h2 className="font-bold text-[#1A1A1A]">Surveys for you</h2>
        </div>
        <p className="text-xs text-[#5A6070]">
          No open surveys right now. When the PTO posts one, it will show up here.
        </p>
      </section>
    )
  }

  return (
    <section
      id="surveys"
      className="mt-6 scroll-mt-28 rounded-2xl border border-[#E8E4DC] bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-5 h-5" style={{ color: '#085508' }} />
        <h2 className="font-bold text-[#1A1A1A]">Surveys for you</h2>
      </div>
      <p className="text-xs text-[#5A6070] mb-4">
        Open a survey here — same branded form we send by email, text, or WhatsApp. No outside links.
      </p>
      <ul className="space-y-2">
        {surveys.map((s) => (
          <li key={s.slug}>
            <a
              href={`/survey/${s.slug}?from=portal`}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E4DC] px-4 py-3 hover:border-[#085508]/40 hover:bg-[#FAFCF9] transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">{s.title}</p>
                {s.description ? (
                  <p className="text-xs text-[#5A6070] mt-0.5 line-clamp-2">{s.description}</p>
                ) : null}
              </div>
              <ArrowRight className="w-4 h-4 shrink-0 text-[#085508]" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
