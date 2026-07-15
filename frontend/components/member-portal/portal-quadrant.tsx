import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  icon: LucideIcon
  accent?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Shared chrome for the 2×2 member portal grid. */
export function PortalQuadrant({
  title,
  icon: Icon,
  accent = '#085508',
  action,
  children,
  className = '',
}: Props) {
  return (
    <section
      className={`bg-white rounded-2xl border border-[#E8E4DC] shadow-sm flex flex-col min-h-[280px] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F0EDE8]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#EEF6EE' }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color: accent, width: 18, height: 18 }} />
          </div>
          <h2 className="font-bold text-[#1A1A1A] text-base truncate">{title}</h2>
        </div>
        {action}
      </header>
      <div className="px-5 py-4 flex-1 flex flex-col">{children}</div>
    </section>
  )
}
