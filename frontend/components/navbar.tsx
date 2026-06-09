'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navLinks = [
  { label: 'Programs', href: '/programs' },
  { label: 'Events', href: '/events' },
  { label: 'Store', href: '/store' },
  { label: 'Volunteer', href: '/volunteer' },
  { label: 'Membership', href: '/membership' },
  { label: 'Newsletter', href: '/newsletter' },
]

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Stone Hill Middle School PTO Home"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#085508' }}
            aria-hidden="true"
          >
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <span
              className="font-bold text-sm leading-tight block"
              style={{ color: '#085508' }}
            >
              Stone Hill Middle School
            </span>
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: '#8B1A1A' }}
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

        {/* Desktop nav links */}
        <ul className="hidden lg:flex items-center gap-1" role="list">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-[#F3F6FC] text-[#1A1A1A] hover:text-[#085508]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/auth/login">
            <Button
              size="sm"
              className="text-white font-semibold"
              style={{ backgroundColor: '#085508' }}
            >
              Member Login
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
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

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-[#D8E0ED] bg-white"
        >
          <ul className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1" role="list">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[#F3F6FC] text-[#1A1A1A] hover:text-[#085508] transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2 border-t border-[#D8E0ED] mt-1">
              <Link href="/auth/login" onClick={() => setMenuOpen(false)}>
                <Button
                  className="w-full text-white font-semibold"
                  style={{ backgroundColor: '#085508' }}
                >
                  Member Login
                </Button>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
