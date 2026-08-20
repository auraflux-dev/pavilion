'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEMO_BRAND } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { DEMO_JOIN_PROFILES } from '@/lib/demo/seed'

function ReviewJoinInner() {
  const searchParams = useSearchParams()
  const presetCode = useMemo(() => searchParams.get('code') ?? '', [searchParams])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState<string>(DEMO_BRAND.pto)
  const [code, setCode] = useState(presetCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isPublicDemoInstance()) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--brand-green)' }}>
          Review join is on the demo site
        </h1>
        <p className="text-sm text-[#5A6070]">
          This page is for PTO officers touring a vanilla instance. Stone Hill
          production does not use it.
        </p>
      </main>
    )
  }

  function fillProfile(kind: keyof typeof DEMO_JOIN_PROFILES) {
    const profile = DEMO_JOIN_PROFILES[kind]
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setEmail(profile.email)
    setSchool(profile.school)
    setError(null)
  }

  async function onSubmit(
    event: FormEvent,
    lane: 'both' | 'parent',
    parentKind: 'paid' | 'free' = 'paid',
  ) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/demo/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          school,
          code,
          lane,
          parentKind,
        }),
      })
      const data = (await res.json()) as { error?: string; next?: string }
      if (!res.ok) throw new Error(data.error || 'Could not join')
      window.location.assign(data.next || '/staff')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--brand-green)' }}>
        PTO operating system demo
      </p>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
        Review {DEMO_BRAND.pto}
      </h1>
      <p className="text-sm text-[#5A6070] mb-8 leading-relaxed">
        Sample school for a board walkthrough. Same product: public site,
        family portal, staff workspace, membership, store, and books. Nothing
        you click is saved, charged, or emailed. Join with the review code from
        the person who sent you this link.
      </p>

      <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070] mb-2">
        Use a sample family from the demo roster
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button type="button" variant="outline" size="sm" onClick={() => fillProfile('staff')}>
          {DEMO_JOIN_PROFILES.staff.firstName} {DEMO_JOIN_PROFILES.staff.lastName} · staff
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fillProfile('paid')}>
          {DEMO_JOIN_PROFILES.paid.firstName} {DEMO_JOIN_PROFILES.paid.lastName} · paid parent
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fillProfile('free')}>
          {DEMO_JOIN_PROFILES.free.firstName} {DEMO_JOIN_PROFILES.free.lastName} · free parent
        </Button>
      </div>

      <form className="space-y-4" onSubmit={(e) => void onSubmit(e, 'both')}>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            First name
            <Input
              className="mt-1"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Last name
            <Input
              className="mt-1"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </label>
        </div>
        <label className="block text-sm font-medium">
          Work email
          <Input
            className="mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Your school or PTO
          <Input
            className="mt-1"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Oak Street Elementary PTO"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Review code
          <Input
            className="mt-1"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? 'Opening…' : 'Open staff workspace'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={(e) => void onSubmit(e, 'parent', 'paid')}
          >
            Tour paid parent
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={(e) => void onSubmit(e, 'parent', 'free')}
          >
            Tour free parent
          </Button>
        </div>
      </form>
      <p className="text-xs text-[#5A6070] mt-6 whitespace-pre-line">
        You can browse the public site without joining.
        {'\n'}
        <a href="/" className="underline" style={{ color: 'var(--brand-green)' }}>
          View {DEMO_BRAND.school}
        </a>
        {' · '}
        <a href="/trial" className="underline" style={{ color: 'var(--brand-green)' }}>
          Start a 30-day trial for your school
        </a>
      </p>
    </main>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-center py-16 text-sm text-[#5A6070]">Loading…</p>}>
      <ReviewJoinInner />
    </Suspense>
  )
}
