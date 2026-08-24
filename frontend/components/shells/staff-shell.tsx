'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SocialFooterLinks } from '@/components/social-footer-links'
import { type StaffWorkspace } from '@/lib/audience'
import {
  groupStaffNavItemsWithCopy,
  staffCopy as staffStr,
  staffWorkspaceLabel,
} from '@/lib/api/staff-portal-copy'
import { STAFF_PORTAL_DEFAULTS } from '@/lib/defaults/staff-portal-defaults'
import type { StaffWorkspaceGroup } from '@/lib/staff/workspace-groups'
import { groupStaffNavItems } from '@/lib/staff/workspace-groups'
import { createVisitorClient } from '@/lib/wix-oauth-client'
import { publicBrandFace } from '@/lib/demo/brand'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { DemoMark } from '@/components/demo/demo-mark'

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
  shellCopy?: Record<string, string>
  workspaceGroups?: StaffWorkspaceGroup[]
}

/** How many workspace tabs to show before collapsing into More (admins unlock many). */
const DESKTOP_VISIBLE = 6

async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' })
  const client = createVisitorClient()
  const { logoutUrl } = await client.auth.logout(window.location.origin + '/')
  window.location.href = logoutUrl
}

function splitNav(items: NavItem[], active: StaffWorkspace) {
  if (items.length <= DESKTOP_VISIBLE) {
    return { primary: items, overflow: [] as NavItem[] }
  }
  const activeItem = items.find((i) => i.id === active)
  const rest = items.filter((i) => i.id !== active)
  // Keep current workspace on the bar; tuck the rest into More
  const primary = activeItem
    ? [...rest.slice(0, DESKTOP_VISIBLE - 1), activeItem]
    : items.slice(0, DESKTOP_VISIBLE - 1)
  const primaryIds = new Set(primary.map((i) => i.id))
  const overflow = items.filter((i) => !primaryIds.has(i.id))
  return { primary, overflow }
}

export function StaffShell({
  name,
  boardTitle,
  email,
  items,
  active,
  onNavigate,
  children,
  shellCopy = STAFF_PORTAL_DEFAULTS,
  workspaceGroups,
}: Props) {
  const sc = (key: string, fallback?: string) => staffStr(shellCopy, key, fallback)
  const wsLabel = (id: StaffWorkspace) => staffWorkspaceLabel(shellCopy, id)
  const groupNav = (navItems: NavItem[]) =>
    workspaceGroups
      ? groupStaffNavItemsWithCopy(navItems, workspaceGroups, shellCopy)
      : groupStaffNavItems(navItems)
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const { primary, overflow } = splitNav(items, active)
  const activeInMore = overflow.some((i) => i.id === active)
  const brand = publicBrandFace()

  useEffect(() => {
    if (!moreOpen) return
    function onDocClick(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [moreOpen])

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--brand-warm)' }}>
      <header className="sticky top-0 z-50 bg-[var(--brand-dark)] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 rounded-md hover:bg-white/10 px-1 py-0.5 -ml-1"
            aria-label={`Return to ${brand.short} home`}
          >
            {isPublicDemoInstance() ? (
              <DemoMark size={36} className="rounded-sm" />
            ) : (
              <Image
                src={brand.logoPath}
                alt=""
                width={36}
                height={36}
                className="shrink-0 rounded-sm bg-white/10"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-gold)]">{sc('shell.staff')}</p>
              <p className="text-sm font-semibold truncate">
                {name || sc('shell.boardMember')}
                {boardTitle ? (
                  <span className="font-normal text-white/70"> · {boardTitle}</span>
                ) : null}
              </p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 min-w-0" aria-label="Staff workspaces">
            {primary.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                  active === item.id
                    ? 'bg-white text-[var(--brand-dark)]'
                    : 'text-white/85 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
            {overflow.length > 0 ? (
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    activeInMore || moreOpen
                      ? 'bg-white text-[var(--brand-dark)]'
                      : 'text-white/85 hover:bg-white/10'
                  }`}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                >
                  {sc('shell.more')}
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {moreOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 min-w-[14rem] max-h-[70vh] overflow-y-auto rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg text-[#1A1A1A]"
                  >
                    {groupNav(overflow).map(({ group, items: groupItems }) => (
                      <div key={group.id} className="py-1">
                        <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
                          {group.label}
                        </p>
                        {groupItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              onNavigate(item.id)
                              setMoreOpen(false)
                            }}
                            className={`block w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-[var(--brand-soft)] ${
                              active === item.id
                                ? 'bg-[var(--brand-soft)] text-[var(--brand-green)]'
                                : ''
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className="inline-flex rounded-md border border-white/30 p-0.5">
              <Link
                href="/member-portal"
                className="px-2.5 py-1 rounded text-xs font-semibold text-white/90 hover:bg-white/10"
              >
                {sc('shell.member')}
              </Link>
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-white text-[var(--brand-dark)]">
                {sc('shell.staff')}
              </span>
            </span>
            <Link href="/">
              <Button
                size="sm"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 bg-transparent h-8 text-xs"
              >
                {sc('shell.viewSite')}
              </Button>
            </Link>
            <Button
              size="sm"
              className="h-8 text-xs bg-[var(--brand-gold)] text-[var(--brand-dark)] hover:bg-[#ffe44d] font-bold"
              onClick={() => void signOut()}
            >
              {sc('shell.signOut')}
            </Button>
          </div>

          <button
            type="button"
            className="lg:hidden p-2 rounded-md hover:bg-white/10"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? sc('shell.closeMenu') : sc('shell.openMenu')}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="lg:hidden border-t border-white/15 bg-[var(--brand-dark)] px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
            {items.some((i) => i.id === 'home') ? (
              <button
                type="button"
                className={`block w-full text-left px-3 py-2 rounded-md text-sm font-semibold ${
                  active === 'home'
                    ? 'bg-white text-[var(--brand-dark)]'
                    : 'text-white hover:bg-white/10'
                }`}
                onClick={() => {
                  onNavigate('home')
                  setMenuOpen(false)
                }}
              >
                {wsLabel('home')}
              </button>
            ) : null}
            {groupNav(items).map(({ group, items: groupItems }) => (
              <div key={group.id} className="space-y-0.5">
                <p className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-gold)]">
                  {group.label}
                </p>
                {groupItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm font-semibold ${
                      active === item.id
                        ? 'bg-white text-[var(--brand-dark)]'
                        : 'text-white hover:bg-white/10'
                    }`}
                    onClick={() => {
                      onNavigate(item.id)
                      setMenuOpen(false)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-white/15 space-y-2">
              <p className="text-[11px] text-white/60 px-1 truncate">{email}</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/member-portal" className="block" onClick={() => setMenuOpen(false)}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-white/40 text-white bg-transparent"
                  >
                    {sc('shell.member')}
                  </Button>
                </Link>
                <Button size="sm" className="w-full bg-white text-[var(--brand-dark)] font-semibold">
                  {sc('shell.staff')}
                </Button>
              </div>
              <Link href="/" className="block" onClick={() => setMenuOpen(false)}>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-white/40 text-white bg-transparent"
                >
                  {sc('shell.viewSite')}
                </Button>
              </Link>
              <Button
                size="sm"
                className="w-full bg-[var(--brand-gold)] text-[var(--brand-dark)] font-bold"
                onClick={() => void signOut()}
              >
                {sc('shell.signOut')}
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      {active !== 'home' ? (
        <div
          className="border-b border-[var(--brand-line)] bg-[var(--brand-soft)]"
          role="navigation"
          aria-label="Staff navigation"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              style={{ color: 'var(--brand-green)' }}
            >
              ← {sc('shell.home')}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
              style={{ color: 'var(--brand-green)' }}
            >
              Site home
            </Link>
            <span className="text-xs text-[#5A6070]">
              {sc('shell.editing', 'Editing · {workspace}').replace('{workspace}', wsLabel(active))}
            </span>
          </div>
        </div>
      ) : null}

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-[var(--border)] bg-white/70 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#5A6070]">
          <span>{sc('shell.workspace', 'Staff workspace · {workspace}').replace('{workspace}', wsLabel(active))}</span>
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline">
            Terms
          </Link>
          <Link href="/data-security" className="underline">
            Data security
          </Link>
          <SocialFooterLinks variant="light" />
          <span className="text-[#9AA0A6]">Drive docs 26 to 40 for how-tos</span>
        </div>
      </footer>
    </div>
  )
}
