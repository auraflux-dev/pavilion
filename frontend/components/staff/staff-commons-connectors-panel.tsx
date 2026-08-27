'use client'

/**
 * Per-tenant Square / Plaid connect UI for Pavilion platform trials (not SHMS Wix payments).
 */
import { useCallback, useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'

type Status = {
  configured?: boolean
  squareOAuthReady?: boolean
  plaidReady?: boolean
  squareConnected?: boolean
  plaidConnected?: boolean
  squareMerchantId?: string
  plaidItemId?: string
  squareLastOkAt?: string | null
  plaidLastOkAt?: string | null
  squareError?: string
  plaidError?: string
  error?: string
}

function fmt(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function StaffCommonsConnectorsPanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [linkToken, setLinkToken] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/commons/connectors')
    const d = (await r.json()) as Status
    if (!r.ok) throw new Error(d.error || 'Could not load connectors')
    setStatus(d)
    return d
  }, [])

  useEffect(() => {
    void load().catch((err) => setNote(err instanceof Error ? err.message : 'Load failed'))
  }, [load])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setBusy(true)
      setNote('')
      try {
        const r = await fetch('/api/commons/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token: publicToken }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Plaid exchange failed')
        setNote('Plaid connected for this school.')
        await load()
      } catch (err) {
        setNote(err instanceof Error ? err.message : 'Plaid failed')
      } finally {
        setBusy(false)
        setLinkToken(null)
      }
    },
    onExit: () => setLinkToken(null),
  })

  useEffect(() => {
    if (linkToken && ready) open()
  }, [linkToken, ready, open])

  async function startPlaid() {
    setBusy(true)
    setNote('')
    try {
      const r = await fetch('/api/commons/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Could not start Plaid Link')
      setLinkToken(String(d.link_token || ''))
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Plaid failed')
    } finally {
      setBusy(false)
    }
  }

  async function disconnect(provider: 'square' | 'plaid') {
    if (!confirm(`Disconnect ${provider} for this school? Checkout/sync for this tenant stops until reconnected.`)) {
      return
    }
    setBusy(true)
    setNote('')
    try {
      const r = await fetch(`/api/commons/connectors?provider=${provider}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Disconnect failed')
      setNote(`${provider} disconnected.`)
      await load()
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  if (status && status.configured === false) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-2">
        <h2 className="text-lg font-bold">School connectors</h2>
        <p className="text-sm text-[#5A6070]">
          Database not configured on this host. Connectors stay off until Pavilion enables the CRM DB.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold">School connectors</h2>
        <p className="text-sm text-[#5A6070] mt-1 whitespace-pre-line">
          {`Per-tenant secrets for this trial school only.
Not Stone Hill Wix / shared env.
Connect Square before live checkout; Plaid for bank sync when ready.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
          <p className="text-sm font-bold">Square</p>
          <p className="text-xs text-[#5A6070]">
            {status?.squareConnected
              ? `Connected${status.squareMerchantId ? ` · ${status.squareMerchantId}` : ''}`
              : 'Not connected — membership, Cove, and POS stay off.'}
          </p>
          <p className="text-[11px] text-[#5A6070]">Last OK: {fmt(status?.squareLastOkAt)}</p>
          {status?.squareError ? (
            <p className="text-xs text-amber-800">{status.squareError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {status?.squareOAuthReady ? (
              <Button asChild size="sm" className="text-white" style={{ backgroundColor: 'var(--brand-green)' }}>
                <a href="/api/commons/square/oauth/start">
                  {status.squareConnected ? 'Reconnect Square' : 'Connect Square'}
                </a>
              </Button>
            ) : (
              <p className="text-xs text-amber-800">Square OAuth env not set on this project.</p>
            )}
            {status?.squareConnected ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void disconnect('square')}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
          <p className="text-sm font-bold">Plaid</p>
          <p className="text-xs text-[#5A6070]">
            {status?.plaidConnected
              ? `Connected${status.plaidItemId ? ` · ${status.plaidItemId}` : ''}`
              : 'Not connected — budget bank sync stays off.'}
          </p>
          <p className="text-[11px] text-[#5A6070]">Last OK: {fmt(status?.plaidLastOkAt)}</p>
          {status?.plaidError ? (
            <p className="text-xs text-amber-800">{status.plaidError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {status?.plaidReady ? (
              <Button
                type="button"
                size="sm"
                className="text-white"
                style={{ backgroundColor: 'var(--brand-green)' }}
                disabled={busy}
                onClick={() => void startPlaid()}
              >
                {status.plaidConnected ? 'Reconnect Plaid' : 'Connect Plaid'}
              </Button>
            ) : (
              <p className="text-xs text-amber-800">Plaid env not set on this project.</p>
            )}
            {status?.plaidConnected ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void disconnect('plaid')}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {note ? <p className="text-sm text-[#5A6070] whitespace-pre-line">{note}</p> : null}
    </section>
  )
}
