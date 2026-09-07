'use client'

/**
 * Client org onboarding for Pavilion platform (demo / trial).
 * Buyers live in Staff. Connectors are choosable (not Square-only).
 */
import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StaffWorkspace } from '@/lib/audience'
import { isPavilionProductPlatformPublic } from '@/lib/crm/platform-env'

type StepId = 'payments' | 'mail' | 'creative' | 'brand'

type Step = {
  id: StepId
  title: string
  detail: string
  done: boolean
  primaryLabel: string
  workspace?: StaffWorkspace
  href?: string
  secondaryLabel?: string
  secondaryWorkspace?: StaffWorkspace
  comingSoon?: string
}

type Props = {
  onOpenWorkspace: (id: StaffWorkspace) => void
}

export function StaffClientOnboardingPanel({ onOpenWorkspace }: Props) {
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [brandUrl, setBrandUrl] = useState('')
  const [brandBusy, setBrandBusy] = useState(false)
  const [brandNote, setBrandNote] = useState('')
  const [brandDone, setBrandDone] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const [connRes, actRes, canvaRes, brandRes] = await Promise.all([
        fetch('/api/commons/connectors'),
        fetch('/api/staff/activity'),
        fetch('/api/staff/canva/status'),
        fetch('/api/staff/site-brand'),
      ])

      const conn = (await connRes.json().catch(() => ({}))) as {
        squareConnected?: boolean
      }
      const act = (await actRes.json().catch(() => ({}))) as {
        googleConnected?: boolean
      }
      const canva = (await canvaRes.json().catch(() => ({}))) as {
        connected?: boolean
        staffConnected?: boolean
      }
      const brandJson = (await brandRes.json().catch(() => ({}))) as {
        brand?: { logoUrl?: string; ptoName?: string; schoolName?: string }
      }

      const paymentsDone = Boolean(conn.squareConnected)
      const mailDone = Boolean(act.googleConnected)
      const creativeDone = Boolean(canva.connected || canva.staffConnected)
      const hasBrand = Boolean(
        brandJson.brand?.logoUrl?.trim() ||
          brandJson.brand?.ptoName?.trim() ||
          brandJson.brand?.schoolName?.trim(),
      )
      setBrandDone(hasBrand)

      setSteps([
        {
          id: 'payments',
          title: 'Payments',
          detail:
            'Square is ready now for membership, Cove, and POS.\nOther processors can be added later if a school needs them.',
          done: paymentsDone,
          primaryLabel: paymentsDone ? 'Review Payments' : 'Connect Square',
          workspace: 'payments',
          href: paymentsDone ? undefined : '/api/commons/square/oauth/start',
        },
        {
          id: 'mail',
          title: 'Board email and calendar',
          detail:
            'Google Workspace is ready now (Inbox, Calendar, Docs).\nMicrosoft 365 / Outlook is on the roadmap for schools that do not use Google.',
          done: mailDone,
          primaryLabel: mailDone ? 'Open Inbox' : 'Connect Google',
          workspace: 'inbox',
          href: mailDone ? undefined : '/api/staff/workspace/connect',
          comingSoon: 'Microsoft 365',
        },
        {
          id: 'creative',
          title: 'Creative (optional)',
          detail:
            'Canva connect is optional.\nYou can also upload PNG/JPG in Staff (newsletter, Canva workspace) without Canva.\nFigma or Adobe Express can be added later if boards ask.',
          done: creativeDone,
          primaryLabel: 'Open Canva',
          workspace: 'canva',
          secondaryLabel: 'Upload in Comms',
          secondaryWorkspace: 'comms',
        },
        {
          id: 'brand',
          title: 'School brand',
          detail:
            'Parents should see your PTO, not Pavilion.\nPaste your current site URL and we suggest logo and colors.\nOr upload a logo and set names in Brand.',
          done: hasBrand,
          primaryLabel: 'Open Brand',
          workspace: 'brand',
        },
      ])

      if (paymentsDone && mailDone && hasBrand) setCollapsed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load onboarding')
      setSteps([])
    }
  }, [])

  useEffect(() => {
    if (!isPavilionProductPlatformPublic()) return
    void load()
  }, [load])

  async function suggestBrand() {
    setBrandBusy(true)
    setBrandNote('')
    try {
      const r = await fetch('/api/staff/site-brand/suggest-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: brandUrl }),
      })
      const d = (await r.json()) as {
        error?: string
        suggestion?: {
          logoUrl: string
          faviconUrl: string
          colorPrimary: string
          siteTitle: string
          notes: string[]
        }
      }
      if (!r.ok || !d.suggestion) throw new Error(d.error || 'Could not scan that URL')

      const patch: Record<string, string> = {}
      if (d.suggestion.logoUrl) patch.logoUrl = d.suggestion.logoUrl
      if (d.suggestion.faviconUrl) patch.faviconUrl = d.suggestion.faviconUrl
      if (d.suggestion.colorPrimary) patch.colorPrimary = d.suggestion.colorPrimary
      if (d.suggestion.siteTitle && !patch.ptoName) {
        patch.ptoName = d.suggestion.siteTitle.slice(0, 80)
      }

      const save = await fetch('/api/staff/site-brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const saveJson = await save.json()
      if (!save.ok) throw new Error(saveJson.error || 'Could not save suggestions')

      setBrandDone(true)
      setBrandNote(
        [
          'Applied suggestions into Brand. Review and tweak in Brand.',
          ...(d.suggestion.notes || []),
        ].join('\n'),
      )
      await load()
    } catch (err) {
      setBrandNote(err instanceof Error ? err.message : 'Brand suggest failed')
    } finally {
      setBrandBusy(false)
    }
  }

  if (!isPavilionProductPlatformPublic()) return null
  if (!steps) {
    return <p className="text-sm text-[#5A6070]">Loading client onboarding…</p>
  }

  const paymentsDone = Boolean(steps.find((s) => s.id === 'payments')?.done)
  const mailDone = Boolean(steps.find((s) => s.id === 'mail')?.done)
  const complete = paymentsDone && mailDone && brandDone

  if (complete && collapsed) {
    return (
      <div className="rounded-xl border border-[var(--brand-line)] bg-[#FAFCF9] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--brand-green)' }} />
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">Client onboarding ready</p>
            <p className="text-xs text-[#5A6070] mt-0.5 whitespace-pre-line">
              {`Payments, board mail, and brand are set.\nCreative is optional.\nDay-to-day work stays in Staff.`}
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
Pick the connectors this school uses. Not every school needs every tool.`}
          </p>
        </div>
        {complete ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setCollapsed(true)}>
            Collapse
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-amber-800">{error}</p> : null}

      <ul className="space-y-4">
        {steps.map((step) => (
          <li
            key={step.id}
            className="border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
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
                  {step.comingSoon ? (
                    <p className="text-[11px] text-[#5A6070] mt-1">Coming: {step.comingSoon}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {step.href ? (
                  <Button asChild size="sm" variant={step.done ? 'outline' : 'default'}>
                    <a href={step.href}>{step.primaryLabel}</a>
                  </Button>
                ) : step.workspace ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={step.done ? 'outline' : 'default'}
                    onClick={() => onOpenWorkspace(step.workspace!)}
                  >
                    {step.primaryLabel}
                  </Button>
                ) : null}
                {step.secondaryWorkspace ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenWorkspace(step.secondaryWorkspace!)}
                  >
                    {step.secondaryLabel}
                  </Button>
                ) : null}
              </div>
            </div>

            {step.id === 'brand' ? (
              <div className="ml-8 space-y-2 rounded-lg border border-[var(--border)] bg-[#FAFCF9] p-3">
                <p className="text-xs font-semibold text-[#1A1A1A]">Pull from your current site</p>
                <p className="text-[11px] text-[#5A6070] whitespace-pre-line">
                  {`If you already have a PTO or school page, paste the URL.
We read public logo and theme hints. You can edit everything after.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    placeholder="https://yourschoolpto.org"
                    className="min-w-[14rem] flex-1 rounded border border-[var(--border)] bg-white px-2 py-1.5 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={brandBusy || !brandUrl.trim()}
                    onClick={() => void suggestBrand()}
                  >
                    {brandBusy ? 'Scanning…' : 'Suggest brand'}
                  </Button>
                </div>
                {brandNote ? (
                  <p className="text-[11px] text-[#5A6070] whitespace-pre-line">{brandNote}</p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
