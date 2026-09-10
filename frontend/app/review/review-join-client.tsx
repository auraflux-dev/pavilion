'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEMO_BRAND, publicBrandFace } from '@/lib/demo/brand'
import { DEMO_JOIN_PROFILES } from '@/lib/demo/seed'

export function ReviewJoinClient({ isDemoHost }: { isDemoHost: boolean }) {
  const searchParams = useSearchParams()
  const presetCode = useMemo(() => searchParams.get('code') ?? '', [searchParams])
  const autoStaff = searchParams.get('staff') === '1'
  const deskHint = (searchParams.get('desk') || '').trim().toLowerCase()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState<string>(DEMO_BRAND.pto)
  const [code, setCode] = useState(presetCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packs, setPacks] = useState<Array<{ slug: string; pto: string; town: string }>>([])
  const [brandSlug, setBrandSlug] = useState<string | null>(null)
  const face = publicBrandFace()
  const highlightPlatform = deskHint === 'platform' || deskHint === 'br'

  useEffect(() => {
    const presetBrand = searchParams.get('brand')
    fetch('/api/demo/brand')
      .then(async (r) => {
        const d = (await r.json()) as {
          slug?: string | null
          packs?: Array<{ slug: string; pto: string; town: string }>
        }
        setPacks(Array.isArray(d.packs) ? d.packs : [])
        setBrandSlug(d.slug || null)
        if (presetBrand && presetBrand !== (d.slug || '')) {
          await fetch('/api/demo/brand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug: presetBrand }),
          })
          window.location.replace(
            '/review' + (presetCode ? `?code=${encodeURIComponent(presetCode)}` : ''),
          )
        }
      })
      .catch(() => {})
  }, [searchParams, presetCode])

  async function applyBrand(slug: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/demo/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      if (!res.ok) throw new Error('Could not set brand')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set brand')
    } finally {
      setBusy(false)
    }
  }

  async function openSchoolClientStaff() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/demo/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane: 'both' }),
      })
      const data = (await res.json()) as { error?: string; next?: string }
      if (!res.ok) throw new Error(data.error || 'Could not open school Staff')
      await fetch('/api/staff/platform/tenants?product=pavilion').catch(() => null)
      await fetch('/api/staff/platform/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'client', organizationId: 'org_riverside' }),
      }).catch(() => null)
      window.location.assign(data.next || '/staff')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open school Staff')
    } finally {
      setBusy(false)
    }
  }

  async function openPlatformStaff(product: 'pavilion' | 'businessrocket' = 'pavilion') {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/demo/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane: 'both' }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not open Platform Staff')
      await fetch('/api/staff/platform/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'platform' }),
      }).catch(() => null)
      await fetch(`/api/staff/platform/tenants?product=${product}`).catch(() => null)
      window.location.assign('/staff?view=tenants')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Platform Staff')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!isDemoHost || busy) return
    if (autoStaff) {
      void openSchoolClientStaff()
      return
    }
    if (deskHint === 'platform') {
      void openPlatformStaff('pavilion')
      return
    }
    if (deskHint === 'br') {
      void openPlatformStaff('businessrocket')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStaff, deskHint, isDemoHost])

  if (!isDemoHost) {
    return (
      <main id="main-content" className="max-w-lg mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--brand-green)' }}>
          Review join is on the demo site
        </h1>
        <p className="text-sm text-[#5A6070] whitespace-pre-line">
          Open the public Pavilion demo, not a live school site.
          {'\n'}
          <a href="https://demo.onpavilion.com/review" className="underline font-semibold">
            demo.onpavilion.com/review
          </a>
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
    <main id="main-content" className="max-w-lg mx-auto px-4 py-12 md:py-16">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--brand-green)' }}
      >
        Pavilion demo gate
      </p>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
        Choose what to open
      </h1>
      <p className="text-sm text-[#5A6070] mb-6 leading-relaxed whitespace-pre-line">
        {`This page is the door into the demo.
Pick company Staff for a product fleet, or the sample school Client Staff.
Nothing is charged or emailed.`}
      </p>

      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

      <div
        className={`mb-4 rounded-xl border p-4 space-y-3 ${
          highlightPlatform
            ? 'border-[var(--brand-green)] bg-[#E8F3E8]'
            : 'border-[var(--border)] bg-[#F7F8FA]'
        }`}
      >
        <p className="text-sm font-semibold text-[#1A1A1A]">1. Company Staff</p>
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          {`Two separate fleets.
Pavilion Platform Staff manages Pavilion schools.
Business Rocket Brand Staff manages BR customers only.
Your login email picks the fleet.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void openPlatformStaff('pavilion')}
          >
            {busy ? 'Opening…' : 'Open Pavilion Platform Staff'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void openPlatformStaff('businessrocket')}
          >
            {busy ? 'Opening…' : 'Open Brand Staff'}
          </Button>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">2. Sample school Client Staff</p>
        <p className="text-xs text-[#5A6070] whitespace-pre-line">
          {`Uses ${DEMO_JOIN_PROFILES.staff.firstName} ${DEMO_JOIN_PROFILES.staff.lastName} on ${face.pto}.
This is the school board desk, not the company fleet.`}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="w-full sm:w-auto"
          onClick={() => void openSchoolClientStaff()}
        >
          {busy ? 'Opening…' : 'Open Riverside school Staff'}
        </Button>
      </div>

      {packs.length ? (
        <div className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070]">
            Preview skins
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={brandSlug ? 'outline' : 'default'}
              size="sm"
              disabled={busy}
              onClick={() => void applyBrand('')}
            >
              {DEMO_BRAND.pto}
            </Button>
            {packs.map((p) => (
              <Button
                key={p.slug}
                type="button"
                variant={brandSlug === p.slug ? 'default' : 'outline'}
                size="sm"
                disabled={busy}
                onClick={() => void applyBrand(p.slug)}
              >
                {p.pto}
                {p.town ? ` · ${p.town}` : ''}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6070] mb-2">
        Or join with your name (sales / CRM capture)
      </p>
      <p className="text-xs text-[#5A6070] mb-3 whitespace-pre-line">
        Review code required below.
        Sample profiles fill the form for you.
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
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" disabled={busy} variant="outline" className="flex-1">
            {busy ? 'Opening…' : 'Join with review code → staff'}
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
          Ask about a private Pavilion trial
        </a>
      </p>
    </main>
  )
}
