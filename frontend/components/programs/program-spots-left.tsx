'use client'

/**
 * Live “spots left” for enrichment cards / landings.
 * SSR seed from Program.seatsRemaining; polls enrollments while visible.
 */
import { useEffect, useState } from 'react'
import { useProgramUiCopy, ui } from '@/components/programs/program-ui-copy-context'

type Props = {
  programId: string
  capacity: number
  /** Server-rendered remaining seats (capacity − enrollments). */
  initialRemaining: number | null
  className?: string
  /** catalog = full phrase; value = number or Full (for landing dd) */
  variant?: 'catalog' | 'value'
}

export function ProgramSpotsLeft({
  programId,
  capacity,
  initialRemaining,
  className,
  variant = 'catalog',
}: Props) {
  const uiCopy = useProgramUiCopy()
  const [remaining, setRemaining] = useState<number | null>(initialRemaining)

  useEffect(() => {
    setRemaining(initialRemaining)
  }, [initialRemaining, programId])

  useEffect(() => {
    if (!(capacity > 0) || !programId) return

    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(
          `/api/programs/seats?ids=${encodeURIComponent(programId)}`,
          { cache: 'no-store' },
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          seats?: Record<string, { remaining: number | null }>
        }
        const next = data.seats?.[programId]?.remaining
        if (!cancelled && next !== undefined) setRemaining(next)
      } catch {
        // keep last known
      }
    }

    void load()
    const id = window.setInterval(load, 20_000)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [programId, capacity])

  if (!(capacity > 0)) return null

  const value = remaining == null ? capacity : remaining
  const full = value <= 0
  const label = full
    ? ui(uiCopy, 'catalog.spotsFull')
    : value === 1
      ? ui(uiCopy, 'catalog.spotsOne')
      : ui(uiCopy, 'catalog.spots', { count: String(value) })

  if (variant === 'value') {
    return (
      <span className={className}>
        {full ? ui(uiCopy, 'landing.spotsFull') : value}
      </span>
    )
  }

  return <span className={className}>{label}</span>
}
