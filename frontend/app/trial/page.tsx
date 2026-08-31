'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isPublicDemoInstance } from '@/lib/demo/instance'

function TrialForm() {
  const onDemoHost = isPublicDemoInstance()
  const search = useSearchParams()
  const provisionKey = search.get('key') || ''
  const [schoolName, setSchoolName] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [brandPack, setBrandPack] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{
    tempHost: string
    trialEndsAt: string
    email: string
    brandPackSlug: string
  } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/commons/trial/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provisionKey ? { 'x-commons-provision-key': provisionKey } : {}),
        },
        body: JSON.stringify({
          schoolName,
          slug,
          email,
          password,
          provisionKey: provisionKey || undefined,
          brandPack: brandPack.trim() || undefined,
        }),
      })
      const d = (await r.json()) as {
        error?: string
        next?: string
        tempHost?: string
        trialEndsAt?: string
        brandPackSlug?: string
      }
      if (!r.ok) throw new Error(d.error || 'Could not start trial')
      setDone({
        tempHost: d.tempHost || '',
        trialEndsAt: d.trialEndsAt || '',
        email: email.trim().toLowerCase(),
        brandPackSlug: d.brandPackSlug || '',
      })
      // Stay on this page with handoff copy. Host attach may still be pending.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start trial')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = Boolean(provisionKey) && !busy

  return (
    <main className="max-w-lg mx-auto px-4 py-12 md:py-16">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--brand-green)' }}
      >
        Pavilion · private trial
      </p>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
        Provision a school trial
      </h1>
      <p className="text-sm text-[#5A6070] mb-6 whitespace-pre-line leading-relaxed">
        Pavilion ops only. Requires the provision key.
        {'\n'}
        Creates a private school: URL + treasurer login.
        {'\n'}
        Leave brand pack blank for a vanilla (no prospect skin) trial.
        {'\n'}
        They sign in at /login. 30 days.
      </p>

      {done ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-2">
          <p className="text-sm font-bold">Private trial ready. Send them this.</p>
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            URL: https://{done.tempHost}/login
            {'\n'}
            Email: {done.email}
            {'\n'}
            Password: (the one you set above)
            {'\n'}
            Brand: {done.brandPackSlug || 'vanilla (school name only)'}
            {'\n'}
            Trial ends: {done.trialEndsAt ? new Date(done.trialEndsAt).toLocaleDateString() : ''}
          </p>
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            Next: attach {done.tempHost} on commons-pto-demo Domains.
            {'\n'}
            Add the verify TXT on the SHMS onpavilion.com DNS zone if prompted.
            {'\n'}
            See docs/TRIAL-NEW-LEAD.md.
          </p>
          <p className="text-sm">
            <a
              href={`https://${done.tempHost}/login`}
              className="underline"
              style={{ color: 'var(--brand-green)' }}
            >
              Open trial login
            </a>
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {!provisionKey ? (
            <p className="text-sm text-amber-800 whitespace-pre-line">
              Open this page as /trial?key=… with COMMONS_PROVISION_SECRET.
              {'\n'}
              Schools never use this form.
              {'\n'}
              They get /login from us.
            </p>
          ) : null}
          <label className="block text-sm font-medium">
            School or PTO name
            <Input
              className="mt-1"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              placeholder="Oak Street Elementary PTO"
            />
          </label>
          <label className="block text-sm font-medium">
            Temp URL slug
            <Input
              className="mt-1"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="oak-street"
            />
            <span className="text-xs text-[#5A6070]">
              Becomes https://your-slug.onpavilion.com (private until login)
            </span>
          </label>
          <label className="block text-sm font-medium">
            Brand pack (optional)
            <Input
              className="mt-1"
              value={brandPack}
              onChange={(e) => setBrandPack(e.target.value)}
              placeholder="Leave blank for vanilla"
            />
            <span className="text-xs text-[#5A6070]">
              Named packs only (e.g. spring-hill). Blank = school name + default colors, empty catalog.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Treasurer email
            <Input
              className="mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Password (give this to them)
            <Input
              className="mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error ? <p className="text-sm text-red-700 whitespace-pre-line">{error}</p> : null}
          <Button type="submit" disabled={!canSubmit} className="w-full">
            {busy ? 'Starting…' : !provisionKey ? 'Need provision key' : 'Create private trial'}
          </Button>
        </form>
      )}

      <p className="text-xs text-[#5A6070] mt-6">
        <Link
          href={onDemoHost ? '/' : '/login'}
          className="underline"
          style={{ color: 'var(--brand-green)' }}
        >
          {onDemoHost ? 'Back to public demo' : 'School sign-in'}
        </Link>
      </p>
    </main>
  )
}

export default function TrialPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-lg mx-auto px-4 py-12">
          <p className="text-sm text-[#5A6070]">Loading…</p>
        </main>
      }
    >
      <TrialForm />
    </Suspense>
  )
}
