'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Mail, Twitter, Youtube, ArrowRight, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SocialFooterLinks } from '@/components/social-footer-links'
import type { NavLink } from '@/lib/api/nav'
import { useAuth } from '@/lib/hooks/use-auth'
import { trackGenerateLead } from '@/lib/ga'
import { DemoMark } from '@/components/demo/demo-mark'

interface Props {
  presidentEmail: string
  link6: string
  link7: string
  link8: string
  socialFacebook: string
  socialInstagram: string
  socialTwitter: string
  socialYoutube: string
  footerLinks: NavLink[]
  address: string
  brand: {
    school: string
    short: string
    pto: string
    cheer: string
    town: string
    store: string
    logoPath: string
  }
  mode: 'demo' | 'commons' | 'stone-hill'
}

export function FooterClient({
  presidentEmail,
  link6,
  link7,
  link8,
  socialFacebook,
  socialInstagram,
  socialTwitter,
  socialYoutube,
  footerLinks,
  address,
  brand,
  mode,
}: Props) {
  const addressLines = address.split(',').map((part) => part.trim()).filter(Boolean)
  const street = addressLines[0] || address
  const cityLine = addressLines.slice(1).join(', ')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const { status } = useAuth()

  const [subError, setSubError] = useState<string | null>(null)
  const [subBusy, setSubBusy] = useState(false)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!value) return
    setSubBusy(true)
    setSubError(null)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Subscribe failed')
      }
      trackGenerateLead({ formId: 'newsletter', leadType: 'newsletter' })
      setSubscribed(true)
      setEmail('')
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Subscribe failed')
    } finally {
      setSubBusy(false)
    }
  }

  const gradeLinks = [
    { grade: '6th', href: link6 },
    { grade: '7th', href: link7 },
    { grade: '8th', href: link8 },
  ].filter(g => g.href)

  const extraSocial = [
    { icon: Twitter, label: 'Twitter / X', href: socialTwitter },
    { icon: Youtube, label: 'YouTube', href: socialYoutube },
  ].filter((s) => s.href)

  return (
    <footer
      id="contact"
      style={{ backgroundColor: '#1A1A1A' }}
      aria-label="Site footer"
    >
      {/* Main footer content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          {/* Col 1: Logo + social */}
          <div className="sm:col-span-2 lg:col-span-1">
            <a
              href="/"
              className="inline-flex items-center gap-3 mb-5 group"
              aria-label={`${brand.pto} Home`}
            >
              {mode === 'demo' ? (
                <DemoMark size={44} />
              ) : (
                <Image
                  src={brand.logoPath}
                  alt={`${brand.school} logo`}
                  width={44}
                  height={44}
                  className="shrink-0"
                />
              )}
              <div>
                <div className="font-bold text-sm text-white leading-tight">
                  {brand.school}
                </div>
                <div
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: 'var(--brand-gold)' }}
                >
                  PTO
                </div>
              </div>
            </a>

            <p className="text-sm leading-relaxed mb-6" style={{ color: '#C5CCD6' }}>
              {mode === 'stone-hill'
                ? 'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.'
                : `${brand.school} in ${brand.town}. Membership, ${brand.store}, and the family portal.`}
            </p>

            <div className="flex items-center gap-2.5 flex-wrap">
              <SocialFooterLinks
                variant="dark"
                facebook={socialFacebook}
                instagram={socialInstagram}
                allowDefaults={mode === 'stone-hill'}
              />
              {extraSocial.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[#3a3a3a]"
                  style={{ backgroundColor: '#3a3a3a', color: '#F0F2F5' }}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links. centered on mobile */}
          <div className="flex flex-col items-center w-full">
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-5 text-center">
              Quick Links
            </h3>
            <ul
              className="grid grid-cols-2 gap-x-6 gap-y-2.5 w-full max-w-[17rem] mx-auto text-center"
              role="list"
            >
              {footerLinks.map((link) => (
                <li key={link.id} className="min-w-0">
                  <a
                    href={link.href}
                    className="text-sm hover:text-white transition-colors inline-flex items-center justify-center gap-1 group text-center leading-snug"
                    style={{ color: '#C5CCD6' }}
                  >
                    {link.label}
                    <ArrowRight
                      className="w-3 h-3 opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-5">
              Contact Us
            </h3>
            <address className="not-italic space-y-4">
              <div className="flex items-start gap-3">
                <MapPin
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: 'var(--brand-gold)' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm leading-relaxed" style={{ color: '#C5CCD6' }}>
                    {street}
                    {cityLine ? (
                      <>
                        <br />
                        {cityLine}
                      </>
                    ) : null}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-1 inline-block hover:underline"
                    style={{ color: 'var(--brand-gold)' }}
                  >
                    Get Directions
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: 'var(--brand-gold)' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: '#9AA3B0' }}>
                    President
                  </p>
                  <a
                    href={`mailto:${presidentEmail}`}
                    className="text-sm hover:text-white transition-colors"
                    style={{ color: '#C5CCD6' }}
                  >
                    {presidentEmail}
                  </a>
                </div>
              </div>

              {/* WhatsApp. only after free/paid member login (no tease for visitors) */}
              {status === 'member' && gradeLinks.length > 0 && (
                <div
                  className="rounded-xl p-3.5 mt-2"
                  style={{ backgroundColor: '#2F2F2F' }}
                >
                  <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                    WhatsApp Parent Groups
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {gradeLinks.map(({ grade, href }) => (
                      <a
                        key={grade}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs transition-colors hover:text-white"
                        style={{ color: '#C5CCD6' }}
                      >
                        {grade} Grade Parents:{' '}
                        <span className="underline">Join Here</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </address>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-5">
              Stay Connected
            </h3>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#C5CCD6' }}>
              Subscribe to our newsletter for the latest updates, event
              announcements, and PTO news delivered to your inbox.
            </p>

            {subscribed ? (
              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: '#0d3b0d', borderColor: 'var(--brand-green)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--brand-gold)' }}>
                  Thanks for subscribing!
                </p>
                <p className="text-xs mt-1" style={{ color: '#C5CCD6' }}>
                  You&apos;ll receive our next newsletter soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-3" noValidate>
                <div>
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="newsletter-email"
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-sm border-0 text-white placeholder:text-[#9AA3B0] focus-visible:ring-1 focus-visible:ring-[var(--brand-gold)]"
                    style={{ backgroundColor: '#2F2F2F' }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={subBusy}
                  className="w-full font-semibold text-white group"
                  style={{ backgroundColor: 'var(--brand-green)' }}
                >
                  <Send className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  {subBusy ? 'Subscribing…' : 'Subscribe to Newsletter'}
                </Button>
                {subError && <p className="text-xs text-red-400">{subError}</p>}
              </form>
            )}

          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: '#333333' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-center sm:text-left space-y-1" style={{ color: '#C5CCD6' }}>
            <p>&copy; 2026 {brand.pto}. All rights reserved.</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-start">
              <a href="/privacy" className="hover:text-white transition-colors underline-offset-2 hover:underline">Privacy</a>
              <a href="/terms" className="hover:text-white transition-colors underline-offset-2 hover:underline">Terms</a>
              <a href="/data-security" className="hover:text-white transition-colors underline-offset-2 hover:underline">Data security</a>
              <a href="/photo-release" className="hover:text-white transition-colors underline-offset-2 hover:underline">Photo release</a>
            </p>
          </div>
          <p
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color: 'var(--brand-gold)' }}
          >
            {brand.cheer}
          </p>
        </div>
      </div>
    </footer>
  )
}
