'use client'

import { useEffect, useState } from 'react'
import { CreditCard, User, Star, LogOut, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createVisitorClient } from '@/lib/wix-oauth-client'

interface MemberData {
  member: {
    id: string
    name: string
    email: string
    profileImage: string | null
  }
  storeCards: { balance: number; studentName: string }[]
  membership: { tier: string; expiresAt: string } | null
}

const TIER_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  ruby: { bg: '#FDF0F0', text: '#8B1A1A', accent: '#8B1A1A' },
  supreme: { bg: '#EEF2FF', text: '#1A3A5C', accent: '#1A3A5C' },
  faculty: { bg: '#EEF6EE', text: '#085508', accent: '#085508' },
}

export function MemberDashboard() {
  const [data, setData] = useState<MemberData | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ok'>('loading')

  async function load() {
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error()
      setData(await res.json())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => { load() }, [])

  async function handleLogout() {
    try {
      // Clear server-side cookie
      await fetch('/api/auth/logout', { method: 'POST' })
      // Get Wix logout URL and redirect
      const client = createVisitorClient()
      const { logoutUrl } = await client.auth.logout(window.location.href)
      window.location.href = logoutUrl
    } catch {
      window.location.href = '/'
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#085508' }} />
      </div>
    )
  }

  if (status === 'error' || !data) {
    return (
      <div className="text-center py-24">
        <p className="text-[#5A6070] mb-4">Could not load your profile.</p>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    )
  }

  const { member, storeCards, membership } = data
  const tierKey = membership?.tier?.toLowerCase() ?? null
  const tierColors = tierKey ? TIER_COLORS[tierKey] : null
  const totalBalance = storeCards.reduce((sum, c) => sum + c.balance, 0)

  return (
    <div className="space-y-6">

      {/* Header: name + logout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {member.profileImage ? (
            <img
              src={member.profileImage}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: '#085508' }}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-[#1A1A1A]">{member.name || 'PTO Member'}</p>
            <p className="text-sm text-[#5A6070]">{member.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-[#5A6070] hover:text-[#1A1A1A] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Membership card */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: tierColors?.bg ?? '#F5F0E8' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: tierColors?.accent ?? '#5A6070' }} />
            <span
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: tierColors?.text ?? '#5A6070' }}
            >
              {membership ? `${membership.tier} Member` : 'No Active Membership'}
            </span>
          </div>
          {membership && (
            <span className="text-xs text-[#5A6070]">
              Expires {new Date(membership.expiresAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        {!membership && (
          <div>
            <p className="text-sm text-[#5A6070] mb-3">Join the PTO to unlock priority registration, event perks, and more.</p>
            <a
              href="/membership"
              className="inline-flex items-center gap-1.5 text-sm font-bold"
              style={{ color: '#085508' }}
            >
              View membership options <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Store card balances */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8E4DC]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" style={{ color: '#085508' }} />
            <h2 className="font-bold text-[#1A1A1A]">Store Card Balance</h2>
          </div>
          <a
            href="/store"
            className="text-xs font-semibold"
            style={{ color: '#085508' }}
          >
            Load more →
          </a>
        </div>

        {storeCards.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-[#5A6070] mb-4">No store cards yet. Load a card and your student taps it at the store window.</p>
            <Button
              className="font-bold text-[#1A1A1A]"
              style={{ backgroundColor: '#FFD700' }}
              onClick={() => window.location.href = '/store'}
            >
              Load a Store Card
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {storeCards.map((card, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b border-[#F5F0E8] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: '#085508' }}
                  >
                    {card.studentName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#1A1A1A]">{card.studentName}</span>
                </div>
                <span className="text-lg font-bold" style={{ color: '#085508' }}>
                  ${card.balance.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-bold text-[#5A6070]">Total balance</span>
              <span className="text-xl font-bold" style={{ color: '#085508' }}>
                ${totalBalance.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Programs', href: '/programs', icon: '📚' },
          { label: 'Events', href: '/events', icon: '📅' },
          { label: 'Volunteer', href: '/volunteer', icon: '🙋' },
          { label: 'Store', href: '/store', icon: '🛒' },
        ].map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            className="bg-white rounded-xl p-4 border border-[#E8E4DC] flex items-center gap-3 hover:shadow-sm transition-shadow"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">{label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
