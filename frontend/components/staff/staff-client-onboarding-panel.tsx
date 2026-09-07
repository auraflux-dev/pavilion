'use client'

/**
 * Client org onboarding for Pavilion platform (demo / trial).
 * Buyers live in Staff. Links existing Square / Google / Canva connect flows.
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StaffWorkspace } from '@/lib/audience'
import { isPavilionProductPlatformPublic } from '@/lib/crm/platform-env'

type StepId = 'square' | 'google' | 'canva' | 'brand'

type Step = {
  id: StepId
  title: string
  detail: string
  done: boolean
  actionLabel: string
  workspace?: StaffWorkspace
  href?: string
}

type Props = {
  onOpenWorkspace: (id: StaffWorkspace) => void
}

export function StaffClientOnboardingPanel({ onOpenWorkspace }: Props) {
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const [connRes, actRes, canvaRes] = await Promise.all([
        fetch('/api/commons/connectors'),
        fetch('/api/staff/activity'),
        fetch('/api/staff/canva/status'),
      ])

      const conn = (await connRes.json().catch(() => ({}))) as {
        squareConnected?: boolean
        configured?: boolean
        error?: string
      }
      const act = (await actRes.json().catch(() => ({}))) as {
        googleConnected?: boolean
      }
      const canva = (await canvaRes.json().catch(() => ({}))) as {
        connected?: boolean
        staffConnected?: boolean
      }

      const squareDone = Boolean(conn.squareConnected)
      const googleDone = Boolean(act.googleConnected)
      const canvaDone = Boolean(canva.connected || canva.staffConnected)

      setSteps([
        {
          id: 'square',
          title: 'Connect Square',
          detail: 'Unlock live membership, Cove, and POS for this school.',
          done: squareDone,
          actionLabel: squareDone ? 'Review Payments' : 'Connect Square',
          workspace: 'payments',
          href: squareDone ? undefined : '/api/commons/square/oauth/start',
        },
        {
          id: 'google',
          title: 'Connect Google',
          detail: 'Inbox, Calendar, and Docs for your board mailbox.',
          done: googleDone,
          actionLabel: googleDone ? 'Open Inbox' : 'Connect Google',
          workspace: 'inbox',
          href: googleDone ? undefined : '/api/staff/workspace/connect',
        },
        {
          id: 'canva',
          title: 'Connect Canva',
          detail: 'Optional. Design flyers and newsletter art inside Staff.',
          done: canvaDone,
          actionLabel: canvaDone ? 'Open Canva' : 'Open Canva',
          workspace: 'canva',
        },
        {
          id: 'brand',
          title: 'Set school brand',
          detail: 'Logo, colors, and name so parents see your PTO, not Pavilion.',
          done: false,
          actionLabel: 'Open Brand',
          workspace: 'brand',
        },
      ])
      if (squareDone) setCollapsed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load onboarding')
      setSteps([])
    }
  }, [])

  useEffect(() => {
    if (!isPavilionProductPlatformPublic()) return
    void load()
  }, [load])

  if (!isPavilionProductPlatformPublic()) return null
  if (!steps) {
    return <p className="text-sm text-[#5A6070]">Loading client onboarding…</p>
  }

  const squareDone = Boolean(steps.find((s) => s.id === 'square')?.done)
  const complete = squareDone

  if (complete && collapsed) {
    return (
      <div className="rounded-xl border border-[var(--brand-line)] bg-[#FAFCF9] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--brand-green)' }} />
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">Client onboarding ready</p>
            <p className="text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
              {`Square is connected.\nDay-to-day work stays in Staff.`}
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setCollapsed(false)}>
          Review steps
        </Button>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Client onboarding</h2>
          <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
            {`Your board lives in Staff.
Parents use the public site and family login.
Connect what this school needs, then go live.`}
          </p>
        </div>
        {complete ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setCollapsed(true)}>
            Collapse
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      <ul className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex flex-wrap items-start justify-between gap-3 border-t border-[var(--border)] pt-3 first:border-t-0 first:pt-0"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {step.done ? (
                <CheckCircle2
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: 'var(--brand-green)' }}
                />
              ) : (
                <Circle className="w-5 h-5 shrink-0 mt-0.5 text-[#9AA3B2]" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A]">{step.title}</p>
                <p className="text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">{step.detail}</p>
              </div>
            </div>
            {step.href ? (
              <Button asChild size="sm" variant={step.done ? 'outline' : 'default'}>
                <a href={step.href}>{step.actionLabel}</a>
              </Button>
            ) : step.workspace ? (
              <Button
                type="button"
                size="sm"
                variant={step.done ? 'outline' : 'default'}
                onClick={() => onOpenWorkspace(step.workspace!)}
              >
                {step.actionLabel}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
