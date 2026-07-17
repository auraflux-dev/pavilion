'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { STAFF_WORKSPACE_LABEL, type StaffWorkspace } from '@/lib/audience'
import { createVisitorClient } from '@/lib/wix-oauth-client'

type NavItem = {
  id: StaffWorkspace
  label: string
}

type Props = {
  name: string
  boardTitle?: string
  email: string
  items: NavItem[]
  active: StaffWorkspace
  onNavigate: (id: StaffWorkspace) => void
  children: React.ReactNode
}

async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
  const client = createVisitorClient()
  const { logoutUrl } = await client.auth.logout(window.location.origin + '/')
  window.location.href = logoutUrl
}

export function StaffShell({ name, boardTitle, email, items, active, onNavigate, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F0E8' }}>
      <header className="sticky top-0 z-50 bg-[#0B3D0B] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/shms-logo.png"
              alt=""
              width={36}
              height={36}
              className="shrink-0 rounded-sm bg-white/10"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#FFD700]">Staff</p>
              <p className="text-sm font-semibold truncate">
                {name || 'Board member'}
                {boardTitle ? <span className="font-normal text-white/70"> · {boardTitle}</span> : null}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-0.5" aria-label="Staff workspaces">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  active === item.id
                    ? 'bg-white text-[#0B3D0B]'
                    : 'text-white/85 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link href="/member-portal">
              <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent h-8 text-xs">
                Parent portal
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 bg-transparent h-8 text-xs">
                View site
              </Button>
            </Link>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#FFD700] text-[#0B3D0B] hover:bg-[#ffe44d] font-bold"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-md hover:bg-white/10"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="md:hidden border-t border-white/15 bg-[#0B3D0B] px-4 py-3 space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`block w-full text-left px-3 py-2.5 rounded-md text-sm font-semibold ${
                  active === item.id ? 'bg-white text-[#0B3D0B]' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => {
                  onNavigate(item.id)
                  setMenuOpen(false)
                }}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-white/15 space-y-2">
              <p className="text-[11px] text-white/60 px-1 truncate">{email}</p>
              <Link href="/member-portal" className="block" onClick={() => setMenuOpen(false)}>
                <Button size="sm" variant="outline" className="w-full border-white/40 text-white bg-transparent">
                  Parent portal
                </Button>
              </Link>
              <Link href="/" className="block" onClick={() => setMenuOpen(false)}>
                <Button size="sm" variant="outline" className="w-full border-white/40 text-white bg-transparent">
                  View site
                </Button>
              </Link>
              <Button
                size="sm"
                className="w-full bg-[#FFD700] text-[#0B3D0B] font-bold"
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[#E8E4DC] bg-white/70 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5A6070]">
          <span>Staff workspace · {STAFF_WORKSPACE_LABEL[active]}</span>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <span className="text-[#9AA0A6]">Drive docs 26–31 for how-tos</span>
        </div>
      </footer>
    </div>
  )
}
