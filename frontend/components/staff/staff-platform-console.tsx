'use client'

/**
 * Platform Staff fleet console. Same /staff entry as Client Staff; different catalog.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  PLATFORM_WORKSPACE_BLURB,
  PLATFORM_WORKSPACE_GROUPS,
  PLATFORM_WORKSPACE_LABEL,
  parsePlatformWorkspace,
  type PlatformWorkspace,
} from '@/lib/staff/platform-workspaces'
import { StaffModulesPanel } from '@/components/staff/staff-modules-panel'

type Me = {
  email: string
  name: string
  boardTitle: string
}

type Tenant = {
  id: string
  name: string
  slug: string
  plan: string
  tempHost: string
  customDomain: string
  brandPackSlug: string
  trialEndsAt: string | null
  squareConnected: boolean
  plaidConnected: boolean
  vipReadonly: boolean
  needsAttention: string[]
}

type Attention = { id: string; label: string; organizationId: string; tone: 'warn' | 'info' }

type Props = {
  me: Me
  onExitToClient?: never
}

export function StaffPlatformConsole({ me }: Props) {
  const [active, setActive] = useState<PlatformWorkspace>('home')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [attention, setAttention] = useState<Attention[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [tenantDetail, setTenantDetail] = useState<Tenant | null>(null)
  const [tenantTab, setTenantTab] = useState<
    'overview' | 'connectors' | 'brand' | 'notes'
  >('overview')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [health, setHealth] = useState<{
    targets: { id: string; label: string; url: string; ok: boolean; note: string }[]
    connectors: {
      dbEnabled: boolean
      orgsEditable: number
      orgsWithSquare: number
      orgsWithoutSquare: number
      orgsWithPlaid: number
    }
    vipNote: string
  } | null>(null)

  const loadFleet = useCallback(async () => {
    setError('')
    try {
      const r = await fetch('/api/staff/platform/tenants')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not load tenants')
      setTenants(Array.isArray(d.tenants) ? d.tenants : [])
      setAttention(Array.isArray(d.attention) ? d.attention : [])
      setSelectedOrgId(String(d.selectedOrganizationId || ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load tenants')
    }
  }, [])

  useEffect(() => {
    void loadFleet()
  }, [loadFleet])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const view = parsePlatformWorkspace(params.get('view'))
    if (view) setActive(view)
    const org = params.get('org')?.trim()
    if (org) {
      setSelectedOrgId(org)
      setActive('tenant')
    }
  }, [])

  function go(id: PlatformWorkspace, orgId?: string) {
    setActive(id)
    const url = new URL(window.location.href)
    url.searchParams.set('view', id)
    if (orgId) {
      url.searchParams.set('org', orgId)
      setSelectedOrgId(orgId)
    } else if (id !== 'tenant') {
      url.searchParams.delete('org')
    }
    window.history.replaceState({}, '', url.toString())
  }

  useEffect(() => {
    if (active !== 'tenant' || !selectedOrgId) {
      setTenantDetail(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/staff/platform/tenants/${encodeURIComponent(selectedOrgId)}`)
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Tenant not found')
        if (!cancelled) setTenantDetail(d.tenant as Tenant)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Tenant load failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active, selectedOrgId])

  useEffect(() => {
    if (active !== 'health') return
    fetch('/api/staff/platform/health')
      .then(async (r) => {
        const d = await r.json()
        if (r.ok) setHealth(d)
      })
      .catch(() => null)
  }, [active])

  async function enterClientStaff(organizationId: string) {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/staff/platform/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'client', organizationId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not open client Staff')
      window.location.href = '/staff?view=home'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open client Staff')
      setBusy(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tenants
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.plan.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    )
  }, [tenants, query])

  const navItems: { id: PlatformWorkspace; label: string }[] = [
    { id: 'home', label: PLATFORM_WORKSPACE_LABEL.home },
    { id: 'tenants', label: PLATFORM_WORKSPACE_LABEL.tenants },
    { id: 'modules', label: PLATFORM_WORKSPACE_LABEL.modules },
    { id: 'onboarding', label: PLATFORM_WORKSPACE_LABEL.onboarding },
    { id: 'support', label: PLATFORM_WORKSPACE_LABEL.support },
    { id: 'health', label: PLATFORM_WORKSPACE_LABEL.health },
    { id: 'help', label: PLATFORM_WORKSPACE_LABEL.help },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6070]">
              Platform Staff
            </p>
            <p className="text-sm font-bold text-[#1A1A1A]">
              {me.name}
              {me.boardTitle ? ` · ${me.boardTitle}` : ''}
            </p>
            <p className="text-xs text-[#5A6070]">{me.email}</p>
          </div>
          <nav className="flex flex-wrap gap-1" aria-label="Platform workspaces">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  active === item.id || (active === 'tenant' && item.id === 'tenants')
                    ? 'bg-[var(--brand-green)] text-white'
                    : 'text-[#1A1A1A] hover:bg-[#F0F2F5]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error ? <p className="text-sm text-amber-800 whitespace-pre-line">{error}</p> : null}

        {active === 'home' ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Platform Home</h1>
              <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
                {`Fleet view for Pavilion operators.
Open a tenant to check connectors and brand, or enter Client Staff to serve that school.`}
              </p>
            </div>
            {attention.length > 0 ? (
              <div className="rounded-xl border border-[var(--brand-green)]/25 bg-[#E8F3E8] p-4 space-y-2">
                <p className="text-sm font-bold text-[var(--brand-green)]">Needs attention</p>
                <ul className="space-y-1.5">
                  {attention.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="w-full text-left text-sm text-[#1A1A1A] hover:underline"
                        onClick={() => go('tenant', item.organizationId)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-[#5A6070]">No fleet blockers right now.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {PLATFORM_WORKSPACE_GROUPS.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl border border-[var(--border)] bg-white p-4 space-y-2"
                >
                  <p className="text-sm font-bold text-[#1A1A1A]">{group.label}</p>
                  <p className="text-xs text-[#5A6070]">{group.blurb}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {group.workspaces.map((id) => (
                      <Button key={id} type="button" size="sm" variant="outline" onClick={() => go(id)}>
                        {PLATFORM_WORKSPACE_LABEL[id]}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {active === 'modules' ? <StaffModulesPanel /> : null}

        {active === 'tenants' ? (
          <section className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Tenants</h1>
              <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
                {`Trials and customer orgs on the Pavilion platform.
VIP SHMS is dedicated and not editable here.`}
              </p>
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, slug, plan…"
              className="w-full max-w-md rounded border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
            <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-white">
              {filtered.map((t) => (
                <li key={t.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{t.name}</p>
                    <p className="text-xs text-[#5A6070] mt-0.5">
                      {t.slug} · {t.plan}
                      {t.vipReadonly ? ' · VIP read-only' : ''}
                    </p>
                    <p className="text-[11px] text-[#5A6070] mt-1">
                      Square {t.squareConnected ? 'on' : 'off'} · Plaid {t.plaidConnected ? 'on' : 'off'}
                    </p>
                    {t.needsAttention.length ? (
                      <p className="text-[11px] text-amber-800 mt-1">{t.needsAttention.join(' · ')}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => go('tenant', t.id)}>
                      Open
                    </Button>
                    {!t.vipReadonly && t.plan !== 'platform' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => void enterClientStaff(t.id)}
                      >
                        Open client Staff
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
              {!filtered.length ? (
                <li className="p-4 text-sm text-[#5A6070]">No tenants match.</li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {active === 'tenant' && tenantDetail ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--brand-green)] hover:underline"
                  onClick={() => go('tenants')}
                >
                  ← Tenants
                </button>
                <h1 className="text-2xl font-bold text-[#1A1A1A] mt-1">{tenantDetail.name}</h1>
                <p className="text-sm text-[#5A6070]">
                  {tenantDetail.slug} · {tenantDetail.plan}
                </p>
              </div>
              {!tenantDetail.vipReadonly && tenantDetail.plan !== 'platform' ? (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void enterClientStaff(tenantDetail.id)}
                >
                  {busy ? 'Opening…' : 'Open client Staff'}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
              {(['overview', 'connectors', 'brand', 'notes'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTenantTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                    tenantTab === tab
                      ? 'bg-[var(--brand-green)] text-white'
                      : 'text-[#1A1A1A] hover:bg-[#F0F2F5]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {tenantTab === 'overview' ? (
              <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-2">
                <p>
                  <span className="font-semibold">Org id:</span> {tenantDetail.id}
                </p>
                <p>
                  <span className="font-semibold">Temp host:</span>{' '}
                  {tenantDetail.tempHost || '—'}
                </p>
                <p>
                  <span className="font-semibold">Custom domain:</span>{' '}
                  {tenantDetail.customDomain || '—'}
                </p>
                <p>
                  <span className="font-semibold">Brand pack:</span>{' '}
                  {tenantDetail.brandPackSlug || '—'}
                </p>
                <p>
                  <span className="font-semibold">Trial ends:</span>{' '}
                  {tenantDetail.trialEndsAt
                    ? new Date(tenantDetail.trialEndsAt).toLocaleDateString()
                    : '—'}
                </p>
                {tenantDetail.vipReadonly ? (
                  <p className="text-amber-800 whitespace-pre-line">
                    {`VIP / dedicated school.
Serve from the SHMS customer tree, not this fleet console.`}
                  </p>
                ) : null}
              </div>
            ) : null}
            {tenantTab === 'connectors' ? (
              <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-2">
                <p>Square: {tenantDetail.squareConnected ? 'Connected' : 'Not connected'}</p>
                <p>Plaid: {tenantDetail.plaidConnected ? 'Connected' : 'Not connected'}</p>
                <p className="text-xs text-[#5A6070] whitespace-pre-line mt-2">
                  {`Google and Canva status live in Client Staff for that org.
Open client Staff to connect or review.`}
                </p>
              </div>
            ) : null}
            {tenantTab === 'brand' ? (
              <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-2">
                <p className="whitespace-pre-line">
                  {`Brand and Pages edit under the selected CMS org.
Open client Staff, then Brand workspace.
Suggest-from-URL is a light pass. Use Inspect steps in Brand when thin.`}
                </p>
                {!tenantDetail.vipReadonly ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void enterClientStaff(tenantDetail.id)}
                  >
                    Open Brand via client Staff
                  </Button>
                ) : null}
              </div>
            ) : null}
            {tenantTab === 'notes' ? (
              <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-2">
                <p className="whitespace-pre-line">
                  {`Operator notes stay out of school CMS for now.
Do not paste parent emails, student names, or dollar amounts.
Use HSKRG Work tickets for lasting context.`}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {active === 'tenant' && !tenantDetail ? (
          <p className="text-sm text-[#5A6070]">Loading tenant…</p>
        ) : null}

        {active === 'onboarding' ? (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Onboarding</h1>
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {`Sales → trial org + host → board invite → connectors → brand → go-live.
Client boards finish connectors in their Staff. You track gaps here.`}
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-[#1A1A1A]">
              <li>Create or claim trial org and temp host.</li>
              <li>Invite board roles on the client Staff access workspace.</li>
              <li>Payments (Square) and board mail (Google). Microsoft later.</li>
              <li>Brand: URL suggest or Inspect + upload.</li>
              <li>Unlock live commerce when Square is ready.</li>
            </ol>
            <Button type="button" size="sm" onClick={() => go('tenants')}>
              Review tenants
            </Button>
          </section>
        ) : null}

        {active === 'support' ? (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Support</h1>
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {`Cross-tenant asks without live school PII.
Use Tenants → Open client Staff for hands-on help.
Billing invoices stay on marketing /account (Stripe).`}
            </p>
            <ul className="rounded-xl border border-[var(--border)] bg-white divide-y divide-[var(--border)]">
              {attention.slice(0, 12).map((item) => (
                <li key={item.id} className="p-3 text-sm">
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => go('tenant', item.organizationId)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              {!attention.length ? (
                <li className="p-3 text-sm text-[#5A6070]">No open fleet items.</li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {active === 'health' ? (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Health</h1>
            <p className="text-sm text-[#5A6070] whitespace-pre-line">
              {`Deploy hosts and connector counts.
No parent or payment PII on this board.`}
            </p>
            {health ? (
              <>
                <ul className="space-y-2">
                  {health.targets.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm"
                    >
                      <p className="font-semibold text-[#1A1A1A]">
                        {t.label} · {t.ok ? 'OK' : 'Check'}
                      </p>
                      <p className="text-xs text-[#5A6070] mt-1">{t.note}</p>
                      <a
                        href={t.url}
                        className="text-xs font-semibold text-[var(--brand-green)] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.url}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-1">
                  <p>Editable orgs: {health.connectors.orgsEditable}</p>
                  <p>Square connected: {health.connectors.orgsWithSquare}</p>
                  <p>Square missing: {health.connectors.orgsWithoutSquare}</p>
                  <p>Plaid connected: {health.connectors.orgsWithPlaid}</p>
                  <p className="text-xs text-[#5A6070] mt-2">{health.vipNote}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#5A6070]">Loading health…</p>
            )}
          </section>
        ) : null}

        {active === 'help' ? (
          <section className="space-y-4">
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Platform help</h1>
            <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-sm space-y-3 whitespace-pre-line">
              {`Platform Staff is for @onpavilion.com operators.

Enter client Staff to edit Brand, Pages, and connectors as that school.
Exit with the Serving banner to return to the fleet.

Brand suggest-from-URL is light. Teach boards Inspect:
right-click logo → copy image URL; Inspect colors → paste hex.

VIP SHMS: promote from pavilion only when intentional. Never put treasurer secrets on robert-4220.

See docs/PLATFORM-STAFF.md and docs/CLIENT-ONBOARDING.md.`}
            </div>
            <p className="text-xs text-[#5A6070]">
              {PLATFORM_WORKSPACE_BLURB.help}
            </p>
          </section>
        ) : null}
      </main>
    </div>
  )
}
