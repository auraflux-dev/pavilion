'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isPublicDemoInstance } from '@/lib/demo/instance'

export default function TrialPage() {
  const demo = isPublicDemoInstance()
  const [schoolName, setSchoolName] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ tempHost: string; trialEndsAt: string } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/commons/trial/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, slug, email, password }),
      })
      const d = (await r.json()) as {
        error?: string
        next?: string
        tempHost?: string
        trialEndsAt?: string
      }
      if (!r.ok) throw new Error(d.error || 'Could not start trial')
      setDone({ tempHost: d.tempHost || '', trialEndsAt: d.trialEndsAt || '' })
      if (d.next) window.location.assign(d.next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start trial')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12 md:py-16">
      <p
        className="text-xs font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--brand-green)' }}
      >
        Commons · 30-day trial
      </p>
      <h1 className="text-3xl font-bold mb-3" style={{ color: '#1A1A1A' }}>
        Start a trial for your school
      </h1>
      <p className="text-sm text-[#5A6070] mb-6 whitespace-pre-line leading-relaxed">
        {demo
          ? 'This public demo is Riverside sample data. Clicks here are preview-only.\nA trial is your own school on a temp URL, with writes on for 30 days.\nNo card to start. $399/month if you stay after day 30.'
          : 'Your own school. Temp URL first. Point your real domain when you are ready.\nWrites on for 30 days. No card to start.\nDay 31 unpaid: reads stay, writes lock. We keep data 30 more days, then export and delete.'}
      </p>

      {done ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-2">
          <p className="text-sm font-bold">Trial saved</p>
          <p className="text-sm text-[#5A6070] whitespace-pre-line">
            Temp host: {done.tempHost}
            {'\n'}
            Trial ends: {done.trialEndsAt ? new Date(done.trialEndsAt).toLocaleDateString() : ''}
          </p>
          <p className="text-sm">
            <Link href="/staff?view=help" className="underline" style={{ color: 'var(--brand-green)' }}>
              How to point DNS
            </Link>
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block text-sm font-medium">
            School or PTO name
            <Input
              className="mt-1"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Temp URL slug
            <Input
              className="mt-1"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="oak-street-pto"
            />
            <span className="text-xs text-[#5A6070]">Letters, numbers, hyphens. Becomes yourpto.commons-pto.org</span>
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
            Password
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
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Starting…' : demo ? 'Request a trial (not this demo)' : 'Start 30-day trial'}
          </Button>
        </form>
      )}

      <p className="text-xs text-[#5A6070] mt-6">
        <Link href={demo ? '/review' : '/'} className="underline" style={{ color: 'var(--brand-green)' }}>
          {demo ? 'Back to the sample school' : 'Back to the site'}
        </Link>
      </p>
    </main>
  )
}
