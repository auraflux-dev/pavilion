'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SocialFooterLinks } from '@/components/social-footer-links'
import { useAuth, clearAuthCache } from '@/lib/hooks/use-auth'
import { publicBrandFace, vanillaizeIfDemo } from '@/lib/demo/brand'
import { isCommonsPlatform } from '@/lib/crm/active-trial'
import { isPublicDemoInstance } from '@/lib/demo/instance'
import { DemoMark } from '@/components/demo/demo-mark'
import { createVisitorClient } from '@/lib/wix-oauth-client'

type Props = {
  children: React.ReactNode
}

async function signOut() {
  clearAuthCache()
  await fetch('/api/auth/logout', { method: 'POST' })
  const client = createVisitorClient()
  const { logoutUrl } = await client.auth.logout(window.location.origin + '/')
  window.location.href = logoutUrl
}

/**
 * Lightweight chrome for /member-portal, not the public marketing nav.
 * Free vs paid only changes labels / upgrade emphasis.
 */
export function MemberShell({ children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const {
    member,
    accountType,
    isStaff,
    status,
    boardTitle,
    staffName,
    needsPersonalEmail,
    linkedHousehold,
    viewingEmail,
  } = useAuth()
  const isPaid = accountType === 'paid'
  const commons = isCommonsPlatform()
  const brand = publicBrandFace()
  const audienceLabel = status === 'loading' ? 'Member' : isPaid ? 'Paid member' : 'Free member'
  const signedInEmail = String(member?.email ?? '').trim().toLowerCase()
  const staffChrome =
    isStaff ||
    (!isPublicDemoInstance() && !commons && signedInEmail.endsWith('@shmspto.org'))
  const displayName = staffChrome
    ? boardTitle || staffName || member?.name || 'Board member'
    : member?.name || 'Member portal'

  const links = [
    { href: '/member-portal', label: 'Portal' },
    { href: '/membership', label: status === 'loading' || isPaid ? 'Membership' : 'Upgrade' },
    ...(commons ? [] : [{ href: '/cove', label: vanillaizeIfDemo('The Cove') }]),
    ...(commons ? [] : [{ href: '/programs', label: 'Programs' }]),
    {
      href: '/member-portal/payment-methods',
      label: 'Payments',
      title: 'Saved payment methods',
    },
    ...(isPublicDemoInstance() || commons
      ? []
      : [{ href: '/member-portal/videos', label: 'Videos' }]),
    { href: '/member-portal/help', label: 'Help' },
  ]

  const actionButtons = (
    <>
      {staffChrome ? (
        <>
          <span className="inline-flex rounded-md border border-[var(--border)] p-0.5">
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[var(--brand-green)] text-white">
              Member
            </span>
            <Link
              href="/staff"
              className="px-2.5 py-1 rounded text-xs font-semibold text-[#1A1A1A] hover:bg-[var(--brand-soft)]"
            >
              Staff
            </Link>
          </span>
          <Link href="/">
            <Button size="sm" variant="outline" className="h-8 text-xs whitespace-nowrap">
              View site
            </Button>
          </Link>
        </>
      ) : (
        <Link href="/">
          <Button size="sm" variant="outline" className="h-8 text-xs whitespace-nowrap">
            View site
          </Button>
        </Link>
      )}
      <Button
        size="sm"
        className="h-8 text-xs text-white font-semibold whitespace-nowrap"
        style={{ backgroundColor: 'var(--brand-green)' }}
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
    </>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-2.5 min-h-14">
            <Link
              href="/member-portal"
              className="flex items-center gap-2.5 min-w-0 max-w-[11rem] sm:max-w-[13rem] col-start-1 row-start-1"
            >
              {isPublicDemoInstance() ? (
                <DemoMark size={36} />
              ) : (
                <Image
                  src={brand.logoPath}
                  alt=""
                  width={36}
                  height={36}
                  className="shrink-0"
                />
              )}
              <div className="min-w-0">
                <p
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--brand-green)' }}
                >
                  {staffChrome ? 'Member view' : audienceLabel}
                </p>
                <p className="text-sm font-semibold text-[#1A1A1A] truncate leading-tight">
                  {displayName}
                </p>
                {signedInEmail ? (
                  <p className="hidden xl:block text-[10px] text-[#5A6070] truncate leading-tight">
                    {signedInEmail}
                  </p>
                ) : null}
              </div>
            </Link>

            <nav
              className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1 min-w-0 col-start-2 row-start-1"
              aria-label="Member portal"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  title={'title' in link ? link.title : undefined}
                  className="px-2 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-xs font-semibold text-[#1A1A1A] hover:bg-[var(--brand-soft)] whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-2 shrink-0 col-start-3 row-start-1">
              {actionButtons}
            </div>

            <button
              type="button"
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 col-start-2 row-start-1 justify-self-end"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="lg:hidden border-t border-[var(--border)] px-4 py-3 space-y-1 bg-white">
            {signedInEmail ? (
              <p className="px-3 pb-2 text-[11px] text-[#5A6070] truncate">{signedInEmail}</p>
            ) : null}
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                title={'title' in link ? link.title : undefined}
                className="block px-3 py-2.5 rounded-md text-sm font-semibold hover:bg-[var(--brand-soft)]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label === 'Payments' ? 'Saved payment methods' : link.label}
              </Link>
            ))}
            <div className="pt-2 mt-2 border-t border-[var(--border)] space-y-2">
              {staffChrome ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="w-full text-white font-semibold"
                    style={{ backgroundColor: 'var(--brand-green)' }}
                  >
                    Member
                  </Button>
                  <Link href="/staff" onClick={() => setMenuOpen(false)}>
                    <Button size="sm" variant="outline" className="w-full font-semibold">
                      Staff
                    </Button>
                  </Link>
                </div>
              ) : null}
              <Link href="/" onClick={() => setMenuOpen(false)}>
                <Button size="sm" variant="outline" className="w-full">
                  View site
                </Button>
              </Link>
              <Button
                size="sm"
                className="w-full text-white font-semibold"
                style={{ backgroundColor: 'var(--brand-green)' }}
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      {isStaff && needsPersonalEmail ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <p>
              Link your personal email in Staff → Home so Member view shows your family (students,
              Cove). Right now this board login has no household linked.
            </p>
            <Link href="/staff" className="font-semibold underline shrink-0">
              Open Staff to link
            </Link>
          </div>
        </div>
      ) : null}

      {isStaff && linkedHousehold && viewingEmail ? (
        <div className="border-b border-[var(--brand-line)] bg-[#FAFCF9] px-4 py-1.5 text-[11px] text-[#5A6070]">
          <div className="max-w-7xl mx-auto">
            Member household: <span className="font-semibold text-[#1A1A1A]">{viewingEmail}</span>
          </div>
        </div>
      ) : null}

      {children}

      <footer className="border-t border-[var(--border)] bg-[#FAFCF9] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#5A6070]">
          <span>
            {audienceLabel} · {brand.short}
          </span>
          <Link href="/privacy" className="underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline">
            Terms
          </Link>
          <Link href="/data-security" className="underline">
            Data security
          </Link>
          <Link href="/photo-release" className="underline">
            Photo release
          </Link>
          <SocialFooterLinks variant="light" />
        </div>
      </footer>
    </div>
  )
}
