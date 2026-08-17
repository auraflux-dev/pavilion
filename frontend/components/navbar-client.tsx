'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, Menu, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NavLink } from '@/lib/api/nav'
import { useAuth } from '@/lib/hooks/use-auth'
import { PortalReturnBar } from '@/components/portal-return-bar'

interface Props {
  links: NavLink[]
}

type OverflowItem = { id: string; label: string; href: string }

const DESKTOP_LINK_CLASS =
  'px-2 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508]'

function DesktopOverflowNav({ items }: { items: OverflowItem[] }) {
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLUListElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(items.length)
  const [moreOpen, setMoreOpen] = useState(false)
  const itemKey = items.map((item) => `${item.id}:${item.label}`).join('|')

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const measure = measureRef.current
    if (!wrap || !measure) return

    const fit = () => {
      const budget = wrap.clientWidth
      const kids = Array.from(measure.children) as HTMLElement[]
      const moreW = 76
      let used = 0
      let count = 0
      for (let i = 0; i < kids.length; i++) {
        const width = kids[i].getBoundingClientRect().width
        const last = i === kids.length - 1
        if (used + width + (last ? 0 : moreW) > budget + 0.5) break
        used += width
        count += 1
      }
      setVisibleCount(count)
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [itemKey])

  useEffect(() => {
    if (!moreOpen) return
    function onDocClick(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [moreOpen])

  const overflow = items.slice(visibleCount)

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <ul
        ref={measureRef}
        className="absolute left-0 top-0 -z-10 flex items-center opacity-0 pointer-events-none"
        aria-hidden="true"
      >
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <span className={DESKTOP_LINK_CLASS}>{item.label}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-center">
        <ul className="flex items-center flex-nowrap overflow-hidden" role="list">
          {items.slice(0, visibleCount).map((item) => (
            <li key={item.id} className="shrink-0">
              <Link href={item.href} className={DESKTOP_LINK_CLASS}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {overflow.length > 0 ? (
          <div className="relative shrink-0" ref={moreRef}>
            <button
              type="button"
              className={`${DESKTOP_LINK_CLASS} inline-flex items-center gap-0.5`}
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {moreOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 min-w-[11rem] rounded-lg border border-[#E8E4DC] bg-white py-1 shadow-lg z-50"
              >
                {overflow.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="menuitem"
                    className="block px-3 py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#EEF6EE] hover:text-[#085508]"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function NavbarClient({ links }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const pathname = usePathname()
  const router = useRouter()
  const { status, isStaff } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Clear pending once the route has actually changed
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  // Prefetch mobile destinations when the drawer opens
  useEffect(() => {
    if (!menuOpen) return
    for (const link of links) {
      try {
        router.prefetch(link.href)
      } catch {
        // ignore
      }
    }
  }, [menuOpen, links, router])

  const isMember = status === 'member'
  const portalLabel = 'Member Portal'
  const desktopItems = useMemo<OverflowItem[]>(
    () => [
      ...links.map((link) => ({ id: link.id, label: link.label, href: link.href })),
      ...(isMember
        ? [{ id: 'help', label: 'Help', href: '/member-portal/help' }]
        : []),
    ],
    [links, isMember],
  )

  function navigate(href: string) {
    if (href === pathname) {
      setMenuOpen(false)
      return
    }
    setPendingHref(href)
    setMenuOpen(false)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      {pendingHref ? (
        <div
          className="h-0.5 w-full overflow-hidden"
          style={{ backgroundColor: '#EEF6EE' }}
          aria-hidden="true"
        >
          <div
            className="h-full w-1/3 animate-pulse"
            style={{ backgroundColor: '#085508', animation: 'nav-progress 0.9s ease-in-out infinite' }}
          />
        </div>
      ) : null}

      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Stone Hill Middle School PTO Home"
          onClick={() => setPendingHref('/')}
        >
          <Image
            src="/shms-logo.png"
            alt="Stone Hill Middle School Stingrays logo"
            width={44}
            height={44}
            className="shrink-0"
            priority
          />
          <div className="hidden xl:block">
            <span
              className="font-bold text-sm leading-tight block"
              style={{ color: '#085508' }}
            >
              Stone Hill Middle School
            </span>
            <span
              className="text-xs font-semibold tracking-wide uppercase whitespace-nowrap"
              style={{ color: '#FFD700' }}
            >
              PTO · Go Stingrays!
            </span>
          </div>
          <div className="xl:hidden">
            <span className="font-bold text-sm" style={{ color: '#085508' }}>
              SHMS PTO
            </span>
          </div>
        </Link>

        <div className="hidden lg:flex flex-1 min-w-0 items-center">
          <DesktopOverflowNav items={desktopItems} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Auth stays visible from sm; page links show from lg instead of hamburger-only */}
          <div className="hidden sm:flex items-center gap-2">
            {status === 'loading' ? (
              <div className="h-9 w-24 rounded-md bg-[#EEF6EE] animate-pulse" />
            ) : isMember ? (
              <>
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
              </>
            ) : (
              <>
                <Link href="/auth/join?mode=login&returnTo=%2Fmember-portal">
                  <Button size="sm" variant="outline" className="font-semibold">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/join?returnTo=%2Fmembership">
                  <Button
                    size="sm"
                    className="text-white font-semibold"
                    style={{ backgroundColor: '#085508' }}
                  >
                    Join
                  </Button>
                </Link>
              </>
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
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden border-t border-[#E8E4DC] bg-white"
        >
          <ul className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1" role="list">
            {links.map((link) => {
              const isPending = pendingHref === link.href
              return (
                <li key={link.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508] transition-colors flex items-center justify-between gap-2 ${
                      isPending ? 'bg-[#EEF6EE] text-[#085508]' : ''
                    }`}
                    onClick={() => navigate(link.href)}
                    disabled={Boolean(pendingHref)}
                  >
                    <span>{link.label}</span>
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              )
            })}
            {isMember ? (
              <li>
                <button
                  type="button"
                  className="w-full text-left block px-3 py-2.5 text-sm font-medium rounded-md hover:bg-[#EEF6EE] text-[#1A1A1A] hover:text-[#085508] transition-colors"
                  onClick={() => navigate('/member-portal/help')}
                  disabled={Boolean(pendingHref)}
                >
                  Help
                </button>
              </li>
            ) : null}
            <li className="pt-2 border-t border-[#E8E4DC] mt-1">
              {isMember ? (
                <div className="space-y-2">
                  {isStaff ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full font-semibold"
                      onClick={() => navigate('/staff')}
                      disabled={Boolean(pendingHref)}
                    >
                      Staff workspace
                    </Button>
                  ) : null}
                  <Button
                    className="w-full text-white font-semibold"
                    style={{ backgroundColor: '#085508' }}
                    onClick={() => navigate('/member-portal')}
                    disabled={Boolean(pendingHref)}
                  >
                    {pendingHref === '/member-portal' ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Opening…
                      </span>
                    ) : (
                      portalLabel
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full text-white font-semibold"
                    style={{ backgroundColor: '#085508' }}
                    onClick={() => navigate('/auth/join?returnTo=%2Fmembership')}
                    disabled={Boolean(pendingHref)}
                  >
                    Join
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full font-semibold"
                    onClick={() => navigate('/auth/join?mode=login&returnTo=%2Fmember-portal')}
                    disabled={Boolean(pendingHref)}
                  >
                    Log in
                  </Button>
                </div>
              )}
            </li>
          </ul>
        </div>
      )}

      <PortalReturnBar />
    </header>
  )
}
