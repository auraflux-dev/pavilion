import { DEMO_BRAND } from '@/lib/demo/brand'

type Props = {
  size?: number
  className?: string
}

/** Riverside mark. never the SHMS stingray. */
export function DemoMark({ size = 40, className = '' }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/demo/mark.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full bg-white object-cover ${className}`.trim()}
      aria-hidden="true"
    />
  )
}

export function DemoWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="font-bold text-sm leading-tight truncate">{DEMO_BRAND.school}</div>
      <div className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--brand-gold)' }}>
        {compact ? 'PTO' : DEMO_BRAND.cheer}
      </div>
    </div>
  )
}
