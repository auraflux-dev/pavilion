'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { publicBrandFace } from '@/lib/demo/brand'

/**
 * Quiet demo chrome: sample-data notice only.
 * Portal switching lives on /review (too busy as a sticky bar).
 */
export function DemoBanner() {
  const pathname = usePathname()
  const brand = publicBrandFace()
  const [activeSlug, setActiveSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!isPublicDemoInstance()) return
    fetch('/api/demo/brand')
      .then(async (r) => {
        const d = (await r.json()) as { slug?: string | null }
        setActiveSlug(d.slug || null)
      })
      .catch(() => {})
  }, [])

  if (!isPublicDemoInstance()) return null
  if (pathname === '/review' || pathname === '/trial') return null

  return (
    <div
      className="px-4 py-2 text-center text-sm"
      style={{ backgroundColor: 'var(--brand-green)', color: '#FFFFFF' }}
    >
      {activeSlug
        ? `Preview: ${brand.pto}. Sample data only.`
        : `Demo: ${brand.pto}. Sample school. Preview only.`}
    </div>
  )
}
