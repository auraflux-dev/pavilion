'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { DEMO_BRAND } from '@/lib/demo/brand'

export function DemoBanner() {
  const pathname = usePathname()
  const router = useRouter()
  if (!isPublicDemoInstance()) return null
  if (pathname === '/review') return null

  async function switchLane(lane: 'both' | 'parent') {
    const res = await fetch('/api/demo/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane }),
    })
    const data = (await res.json()) as { next?: string }
    if (res.ok && data.next) {
      router.push(data.next)
      router.refresh()
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
        <button type="button" className="underline" onClick={() => void switchLane('both')}>
          Staff
        </button>
        <button type="button" className="underline" onClick={() => void switchLane('parent')}>
          Parent portal
        </button>
      </span>
    </div>
  )
}
