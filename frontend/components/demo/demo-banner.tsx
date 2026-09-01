'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { publicBrandFace } from '@/lib/demo/brand'

type PackRow = { slug: string; pto: string; school: string; town: string }

export function DemoBanner() {
  const pathname = usePathname()
  const brand = publicBrandFace()
  const [packs, setPacks] = useState<PackRow[]>([])
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [switchError, setSwitchError] = useState('')

  useEffect(() => {
    if (!isPublicDemoInstance()) return
    fetch('/api/demo/brand')
      .then(async (r) => {
        const d = (await r.json()) as { slug?: string | null; packs?: PackRow[] }
        setPacks(Array.isArray(d.packs) ? d.packs : [])
        setActiveSlug(d.slug || null)
      })
      .catch(() => {})
  }, [])

  if (!isPublicDemoInstance()) return null
  if (pathname === '/review' || pathname === '/trial') return null

  async function switchLane(lane: 'both' | 'parent', parentKind?: 'paid' | 'free') {
    setSwitchError('')
    const res = await fetch('/api/demo/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane, parentKind }),
    })
    const data = (await res.json().catch(() => ({}))) as { next?: string; error?: string }
    if (!res.ok) {
      setSwitchError(data.error || 'Could not switch lane. Try /review.')
      return
    }
    window.location.assign(data.next || (lane === 'parent' ? '/member-portal' : '/staff'))
  }

  async function setBrand(slug: string) {
    const res = await fetch('/api/demo/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
    if (!res.ok) return
    window.location.assign('/')
  }

  return (
    <div
      className="text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      style={{ backgroundColor: 'var(--brand-green)', color: '#FFFFFF' }}
    >
      <span>
        {activeSlug
          ? `Branded tour: ${brand.pto}. Same demo app. Sample data only.`
          : `Demo: ${brand.pto}. Sample school. Clicks are preview-only.`}
      </span>
      <span className="flex flex-wrap items-center gap-3">
        <Link href="/review" className="underline font-semibold">
          Demo join
        </Link>
        {packs.map((p) => (
          <button
            key={p.slug}
            type="button"
            className="underline font-semibold"
            onClick={() => void setBrand(activeSlug === p.slug ? '' : p.slug)}
          >
            {activeSlug === p.slug ? 'Back to Riverside' : `Show as ${p.pto}`}
          </button>
        ))}
        <button type="button" className="underline font-semibold" onClick={() => void switchLane('both')}>
          Open staff (no code)
        </button>
        <button
          type="button"
          className="underline font-semibold"
          onClick={() => void switchLane('parent', 'paid')}
        >
          Parent tour
        </button>
      </span>
      {switchError ? (
        <span className="w-full text-center text-xs opacity-90">{switchError}</span>
      ) : null}
    </div>
  )
}
