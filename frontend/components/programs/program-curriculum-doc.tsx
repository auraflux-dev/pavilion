'use client'

import type { CurriculumShareDoc } from '@/lib/programs/curriculum-share'

export function ProgramCurriculumDoc({ doc }: { doc: CurriculumShareDoc }) {
  const { copy, programName, seasonLabel, vendor, dayOfWeek, classTime } = doc

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand-green)' }}>
            {seasonLabel} · Curriculum
          </p>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{programName}</h1>
          <p className="mt-1 text-sm text-[#5A6070]">
            {vendor}
            {' · '}
            {dayOfWeek} {classTime}
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold print:hidden"
          onClick={() => window.print()}
        >
          Print / save PDF
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-6">
        <h2 className="text-lg font-bold text-[#1A1A1A]">{copy.curriculumTitle}</h2>
        <p className="mt-1 text-sm text-[#5A6070]">Twelve weekly sessions. Curriculum only.</p>
        <ol className="mt-4 space-y-3">
          {copy.curriculum.map((row) => (
            <li key={row.week} className="border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
              <p className="font-semibold text-[#1A1A1A]">
                Week {row.week}: {row.title}
              </p>
              {row.focus ? <p className="mt-1 text-sm text-[#5A6070]">{row.focus}</p> : null}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-xs text-[#5A6070] print:mt-8">
        Stone Hill Middle School PTO enrichment · www.shmspto.org
      </p>
    </div>
  )
}
