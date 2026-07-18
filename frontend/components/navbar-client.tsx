'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NavLink } from '@/lib/api/nav'
import { useAuth } from '@/lib/hooks/use-auth'

interface Props {
  links: NavLink[]
}

export function NavbarClient({ links }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { status, member, accountType, isStaff } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isMember = status === 'member'
  const portalLabel =
    accountType === 'paid'
      ? 'Member Portal'
      : member?.name
        ? 'My Account'
        : 'Member Portal'
  // Only show audience when logged in — visitors get no role label in the nav.
  // Auth status still tracks visitor until free/paid member (or staff) session exists.
  const audienceHint =
    status === 'member'
      ? accountType === 'paid'
        ? 'Paid member'
        : 'Free member'
      : null

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Stone Hill Middle School PTO Home"
        >
          <Image
            src="/shms-logo.png"
            alt="Stone Hill Middle School Stingrays logo"
            width={44}
            height={44}
            className="shrink-0"
            priority
          />
          <div className="hidden sm:block">
            <span
              className="font-bold text-sm leading-tight block"
              style={{ color: '#085508' }}
            >
              Stone Hill Middle School
            </span>
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: '#FFD700' }}
            >
              PTO · Go Stingrays!
            </span>
          </div>
          <div className="sm:hidden">
            <span className="font-bold text-sm" style={{ color: '#085508' }}>
              SHMS PTO
            </span>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-1" role="list">
          {links.map((link) => (
            <li key={link.id}>
              <Link
                href={link.href}
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508]"
              >
                {link.label}
              </Link>
            </li>
          ))}
          {isMember ? (
            <li>
              <Link
                href="/member-portal#help"
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508]"
              >
                Help
              </Link>
            </li>
          ) : null}
        </ul>

        <div className="hidden lg:flex items-center gap-3">
          {audienceHint ? (
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6070]">
              {audienceHint}
            </span>
          ) : null}
          {status === 'loading' ? (
            <div className="h-9 w-28 rounded-md bg-[#EEF6EE] animate-pulse" />
          ) : isMember ? (
            <div className="flex items-center gap-2">
              {isStaff ? (
                <Link href="/staff">
                  <Button size="sm" variant="outline" className="font-semibold">
                    Staff
                  </Button>
                </Link>
              ) : null}
              <Link href="/member-portal">
                <Button
                  size="sm"
                  className="text-white font-semibold"
                  style={{ backgroundColor: '#085508' }}
                >
                  {portalLabel}
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/auth/login?returnTo=%2Fmember-portal">
              <Button
                size="sm"
                className="text-white font-semibold"
                style={{ backgroundColor: '#085508' }}
              >
                Log in / Sign up
              </Button>
            </Link>
          )}
        </div>

        <button
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#085508]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? (
            <X className="w-5 h-5 text-[#1A1A1A]" />
          ) : (
            <Menu className="w-5 h-5 text-[#1A1A1A]" />
          )}
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-[#E8E4DC] bg-white"
        >
          <ul className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1" role="list">
            {links.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.href}
                  className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {isMember ? (
              <li>
                <Link
                  href="/member-portal#help"
                  className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Help
                </Link>
              </li>
            ) : null}
            <li className="pt-2 border-t border-[#E8E4DC] mt-1">
              {isMember ? (
                <div className="space-y-2">
                  {isStaff ? (
                    <Link href="/staff" onClick={() => setMenuOpen(false)}>
                      <Button size="sm" variant="outline" className="w-full font-semibold">
                        Staff workspace
                      </Button>
                    </Link>
                  ) : null}
                  <Link href="/member-portal" onClick={() => setMenuOpen(false)}>
                    <Button
                      className="w-full text-white font-semibold"
                      style={{ backgroundColor: '#085508' }}
                    >
                      {portalLabel}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link
                  href="/auth/login?returnTo=%2Fmember-portal"
                  onClick={() => setMenuOpen(false)}
                >
                  <Button
                    className="w-full text-white font-semibold"
                    style={{ backgroundColor: '#085508' }}
                  >
                    Log in / Sign up
                  </Button>
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
