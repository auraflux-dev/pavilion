'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { DEMO_BRAND } from '@/lib/demo/brand'

export function DemoBanner() {
  const pathname = usePathname()
  if (!isPublicDemoInstance()) return null
  if (pathname === '/review') return null

  async function switchLane(lane: 'both' | 'parent', parentKind?: 'paid' | 'free') {
    const res = await fetch('/api/demo/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane, parentKind }),
    })
    const data = (await res.json()) as { next?: string }
    if (res.ok && data.next) {
      window.location.assign(data.next)
    }
  }

  return (
    <div
      className="text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      style={{ backgroundColor: 'var(--brand-green)', color: '#FFFFFF' }}
    >
      <span>
        Demo: {DEMO_BRAND.pto}. Sample school. Clicks are preview-only.
      </span>
      <span className="flex items-center gap-3">
        <Link href="/review" className="underline font-semibold">
          Board join
        </Link>
        <button type="button" className="underline" onClick={() => void switchLane('both', 'paid')}>
          Staff
        </button>
        <button type="button" className="underline" onClick={() => void switchLane('parent', 'paid')}>
          Paid parent
        </button>
        <button type="button" className="underline" onClick={() => void switchLane('parent', 'free')}>
          Free parent
        </button>
      </span>
    </div>
  )
}
