'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StaffWorkspace } from '@/lib/audience'
import type { BuiltOnboardingItem, StaffOnboardingRole } from '@/lib/staff/onboarding'

type TrackPayload = {
  role: StaffOnboardingRole
  title: string
  summary: string
  items: BuiltOnboardingItem[]
  doneCount: number
  total: number
  complete: boolean
}

type Props = {
  onOpenWorkspace: (id: StaffWorkspace) => void
}

export function StaffOnboardingPanel({ onOpenWorkspace }: Props) {
  const [tracks, setTracks] = useState<TrackPayload[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [collapsedComplete, setCollapsedComplete] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/staff/onboarding')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not load onboarding')
      setTracks(d.tracks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load onboarding')
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleStep(role: StaffOnboardingRole, stepId: string, currentlyDone: boolean) {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, stepId, done: !currentlyDone }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not update')
      if (d.track) {
        setTracks((prev) => prev.map((t) => (t.role === role ? d.track : t)))
      } else {
        await load()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[#5A6070]">Loading role onboarding…</p>
  }

  if (!tracks.length) return null

  const incomplete = tracks.filter((t) => !t.complete)
  const complete = tracks.filter((t) => t.complete)
  const show = incomplete.length > 0 ? incomplete : collapsedComplete ? [] : complete

  if (incomplete.length === 0 && complete.length > 0 && collapsedComplete) {
    return (
      <div className="rounded-xl border border-[var(--brand-line)] bg-[#FAFCF9] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--brand-green)' }} />
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">Role onboarding complete</p>
            <p className="text-xs text-[#5A6070] mt-0.5">
              {complete.map((t) => t.title.replace(' onboarding', '')).join(' · ')}
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setCollapsedComplete(false)}>
          Review steps
        </Button>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      {error ? <p className="text-sm text-amber-900">{error}</p> : null}
      {show.map((track) => (
        <div key={track.role} className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-3">
          <div className="flex items-start gap-3">
            <ListChecks className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--brand-green)' }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1A1A1A]">
                {track.title}
                <span className="font-semibold text-[#5A6070]">
                  {' '}
                  · {track.doneCount}/{track.total}
                </span>
              </p>
              <p className="text-xs text-[#5A6070] mt-0.5 leading-relaxed">{track.summary}</p>
            </div>
          </div>

          <ul className="space-y-2">
            {track.items.map((item) => {
              const Icon = item.done ? CheckCircle2 : Circle
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-[#F0EDE8] bg-[#FAFAF8] px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: item.done ? 'var(--brand-green)' : '#8A8F9C' }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {item.title}
                        {item.autoDone ? (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[var(--brand-green)]">
                            Auto
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#5A6070] mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:shrink-0">
                    {item.workspace ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenWorkspace(item.workspace as StaffWorkspace)}
                      >
                        {item.actionLabel}
                      </Button>
                    ) : null}
                    {item.externalHref ? (
                      <Button type="button" size="sm" variant="outline" asChild>
                        <a
                          href={item.externalHref}
                          {...(item.externalHref.startsWith('/')
                            ? {}
                            : { target: '_blank', rel: 'noreferrer' })}
                        >
                          {item.actionLabel}
                        </a>
                      </Button>
                    ) : null}
                    {!item.autoDone ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void toggleStep(track.role, item.id, item.done)}
                        className={item.done ? undefined : 'text-white'}
                        style={item.done ? undefined : { backgroundColor: 'var(--brand-green)' }}
                        variant={item.done ? 'outline' : 'default'}
                      >
                        {item.done ? 'Undo' : 'Mark done'}
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {incomplete.length === 0 && complete.length > 0 && !collapsedComplete ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setCollapsedComplete(true)}>
          Collapse completed onboarding
        </Button>
      ) : null}
    </section>
  )
}
