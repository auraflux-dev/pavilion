'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Button } from '@/components/ui/button'

const TOKEN_KEY = 'shms_plaid_link_token'

type PlaidStatus = {
  configured: boolean
  connected?: boolean
  institutionName?: string
  accountLabel?: string
  lastSyncedAt?: string
  lastBalance?: number
  needsReauth?: boolean
  error?: string
  env?: string
  redirectUri?: string
}

function isOauthReturn() {
  return typeof window !== 'undefined' && window.location.search.includes('oauth_state_id=')
}

export function StaffPlaidConnect({
  busy,
  onMessage,
  onSynced,
}: {
  busy: boolean
  onMessage: (message: string) => void
  onSynced: () => void
}) {
  const [status, setStatus] = useState<PlaidStatus | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [localBusy, setLocalBusy] = useState(false)
  const openWhenReady = useRef(false)

  const loadStatus = useCallback(async () => {
    const r = await fetch('/api/staff/plaid/status')
    const d = (await r.json()) as PlaidStatus & { error?: string }
    if (!r.ok) throw new Error(d.error ?? 'Plaid status failed')
    setStatus(d)
    return d
  }, [])

  useEffect(() => {
    void loadStatus().catch((err) => onMessage(err instanceof Error ? err.message : 'Plaid status failed'))
  }, [loadStatus, onMessage])

  useEffect(() => {
    if (!isOauthReturn()) return
    const stored = sessionStorage.getItem(TOKEN_KEY)
    if (stored) {
      openWhenReady.current = true
      setLinkToken(stored)
    }
  }, [])

  const onSuccess = useCallback(
    async (publicToken: string | null, metadata: { institution: { name: string; institution_id: string } | null; accounts: Array<{ mask: string | null; name: string }> }) => {
      if (!publicToken) {
        onMessage('Plaid did not return a token.')
        return
      }
      setLocalBusy(true)
      try {
        sessionStorage.removeItem(TOKEN_KEY)
        const r = await fetch('/api/staff/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
            accounts: metadata.accounts,
          }),
        })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error ?? 'Bank connect failed')
        if (isOauthReturn()) {
          window.history.replaceState({}, '', '/staff')
        }
        onMessage(
          d.message
            ? String(d.message)
            : `Bank connected${typeof d.added === 'number' ? ` · ${d.added} new BoA rows` : ''}.`,
        )
        await loadStatus()
        onSynced()
      } catch (err) {
        onMessage(err instanceof Error ? err.message : 'Bank connect failed')
      } finally {
        setLocalBusy(false)
      }
    },
    [loadStatus, onMessage, onSynced],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri: isOauthReturn() ? window.location.href : undefined,
    onSuccess,
  })

  useEffect(() => {
    if (!ready || !linkToken || !openWhenReady.current) return
    openWhenReady.current = false
    open()
  }, [ready, linkToken, open])

  async function startLink(update = false) {
    setLocalBusy(true)
    onMessage('')
    try {
      const r = await fetch('/api/staff/plaid/link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ update }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not start Plaid')
      sessionStorage.setItem(TOKEN_KEY, d.link_token)
      openWhenReady.current = true
      setLinkToken(d.link_token)
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not start Plaid')
    } finally {
      setLocalBusy(false)
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect Bank of America from Staff Budget?')) return
    setLocalBusy(true)
    try {
      const r = await fetch('/api/staff/plaid/disconnect', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Disconnect failed')
      onMessage('Bank disconnected.')
      await loadStatus()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setLocalBusy(false)
    }
  }

  const disabled = busy || localBusy
  const connected = Boolean(status?.connected)

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[#F7F4EE] px-3 py-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold">Bank of America via Plaid</p>
          {!status?.configured ? (
            <p className="text-xs text-[#5A6070] mt-1">
              Add PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV on Vercel, and allow redirect{' '}
              <code className="text-[11px]">{status?.redirectUri || 'https://www.shmspto.org/staff'}</code> in the
              Plaid dashboard.
            </p>
          ) : connected ? (
            <p className="text-xs text-[#5A6070] mt-1">
              {status?.institutionName}
              {status?.accountLabel ? ` · ${status.accountLabel}` : ''}
              {typeof status?.lastBalance === 'number'
                ? ` · balance $${status.lastBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : ''}
              {status?.lastSyncedAt ? ` · synced ${status.lastSyncedAt.slice(0, 16).replace('T', ' ')}` : ''}
              {status?.needsReauth ? ' · login expired. Reconnect' : ''}
            </p>
          ) : (
            <p className="text-xs text-[#5A6070] mt-1">
              Connect the PTO checking account. Square and PayPal payouts already land here. This is the cash feed for
              actuals.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {status?.configured && !connected ? (
            <Button
              size="sm"
              className="text-white"
              style={{ backgroundColor: 'var(--brand-green)' }}
              disabled={disabled}
              onClick={() => void startLink(false)}
            >
              {localBusy ? 'Connecting…' : 'Connect Bank of America'}
            </Button>
          ) : null}
          {connected && status?.needsReauth ? (
            <Button size="sm" disabled={disabled} onClick={() => void startLink(true)}>
              Reconnect
            </Button>
          ) : null}
          {connected ? (
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
