'use client'

export function StaffComingSoonPanel({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">{title}</h1>
      <p className="text-sm text-[#5A6070] whitespace-pre-line">{body}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070]">Coming soon</p>
    </section>
  )
}
