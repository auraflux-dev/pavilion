'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { createVisitorClient } from '@/lib/wix-oauth-client'

type Props = {
  children: React.ReactNode
}

async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
  const client = createVisitorClient()
  const { logoutUrl } = await client.auth.logout(window.location.origin + '/')
  window.location.href = logoutUrl
}

/**
 * Lightweight chrome for /member-portal. not the public marketing nav.
 * Free vs paid only changes labels / upgrade emphasis.
 */
export function MemberShell({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { member, accountType, isStaff, status } = useAuth()
  const isPaid = accountType === 'paid'
  const audienceLabel = status === 'loading' ? '…' : isPaid ? 'Paid member' : 'Free member'

  // Cove opens the full Cove page; PortalReturnBar brings members back.
  const links = [
    { href: '/member-portal', label: 'My Portal' },
    { href: '/membership', label: isPaid ? 'Membership' : 'Upgrade' },
    { href: '/cove', label: 'The Cove' },
    { href: '/programs', label: 'Programs' },
    { href: '/member-portal/help', label: 'Help' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E8E4DC] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link href="/member-portal" className="flex items-center gap-2.5 min-w-0">
            <Image src="/shms-logo.png" alt="" width={36} height={36} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#085508' }}>
                {audienceLabel}
              </p>
              <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                {member?.name || 'Member portal'}
              </p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Member portal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#1A1A1A] hover:bg-[#EEF6EE]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {isStaff ? (
              <Link href="/staff">
                <Button size="sm" variant="outline" className="h-8 text-xs font-semibold">
                  Staff
                </Button>
              </Link>
            ) : null}
            <Link href="/">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                View site
              </Button>
            </Link>
            <Button
              size="sm"
              className="h-8 text-xs text-white font-semibold"
              style={{ backgroundColor: '#085508' }}
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-md hover:bg-gray-100"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="md:hidden border-t border-[#E8E4DC] px-4 py-3 space-y-1 bg-white">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 rounded-md text-sm font-semibold hover:bg-[#EEF6EE]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-[#E8E4DC] space-y-2">
              {isStaff ? (
                <Link href="/staff" onClick={() => setMenuOpen(false)}>
                  <Button size="sm" variant="outline" className="w-full font-semibold">
                    Staff workspace
                  </Button>
                </Link>
              ) : null}
              <Link href="/" onClick={() => setMenuOpen(false)}>
                <Button size="sm" variant="outline" className="w-full">
                  View site
                </Button>
              </Link>
              <Button
                size="sm"
                className="w-full text-white font-semibold"
                style={{ backgroundColor: '#085508' }}
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      {children}

      <footer className="border-t border-[#E8E4DC] bg-[#FAFCF9] py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5A6070]">
          <span>{audienceLabel} · SHMS PTO</span>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <Link href="/data-security" className="underline">Data security</Link>
          <Link href="/photo-release" className="underline">Photo release</Link>
        </div>
      </footer>
    </div>
  )
}
