'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Mail, Facebook, Twitter, Instagram, Youtube, ArrowRight, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { NavLink } from '@/lib/api/nav'
import { useAuth } from '@/lib/hooks/use-auth'

interface Props {
  storeHours: string
  presidentEmail: string
  link6: string
  link7: string
  link8: string
  socialFacebook: string
  socialInstagram: string
  socialTwitter: string
  socialYoutube: string
  footerLinks: NavLink[]
}

export function FooterClient({ storeHours, presidentEmail, link6, link7, link8, socialFacebook, socialInstagram, socialTwitter, socialYoutube, footerLinks }: Props) {
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

  const socialLinks = [
    { icon: Facebook,  label: 'Facebook',    href: socialFacebook },
    { icon: Instagram, label: 'Instagram',   href: socialInstagram },
    { icon: Twitter,   label: 'Twitter / X', href: socialTwitter },
    { icon: Youtube,   label: 'YouTube',     href: socialYoutube },
  ].filter(s => s.href)

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
              aria-label="Stone Hill Middle School PTO Home"
            >
              <Image
                src="/shms-logo.png"
                alt="Stone Hill Middle School Stingrays logo"
                width={44}
                height={44}
                className="shrink-0"
              />
              <div>
                <div className="font-bold text-sm text-white leading-tight">
                  Stone Hill Middle School
                </div>
                <div
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: '#FFD700' }}
                >
                  PTO
                </div>
              </div>
            </a>

            <p className="text-[#5A6070] text-sm leading-relaxed mb-6">
              Enriching the academic and social experience for all SHMS
              students and families in Ashburn, Virginia.
            </p>

            {/* Social icons — only rendered when URLs are set in SiteSettings */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map(({ icon: Icon, label, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-white"
                    style={{ backgroundColor: '#2a2a2a', color: '#5A6070' }}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-5">
              Quick Links
            </h3>
            <ul className="space-y-2.5" role="list">
              {footerLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    className="text-sm text-[#5A6070] hover:text-white transition-colors flex items-center gap-1.5 group"
                  >
                    <ArrowRight
                      className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                      aria-hidden="true"
                    />
                    {link.label}
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
                  style={{ color: '#085508' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm text-[#5A6070] leading-relaxed">
                    23415 Evergreen Ridge Drive
                    <br />
                    Ashburn, VA 20148
                  </p>
                  <a
                    href="https://maps.google.com/?q=23415+Evergreen+Ridge+Drive+Ashburn+VA+20148"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-1 inline-block hover:underline"
                    style={{ color: '#085508' }}
                  >
                    Get Directions
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: '#085508' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-[#5A6070] uppercase tracking-wider mb-0.5">
                    President
                  </p>
                  <a
                    href={`mailto:${presidentEmail}`}
                    className="text-sm hover:text-white transition-colors"
                    style={{ color: '#5A6070' }}
                  >
                    {presidentEmail}
                  </a>
                </div>
              </div>

              {/* WhatsApp — only after free/paid member login (no tease for visitors) */}
              {status === 'member' && gradeLinks.length > 0 && (
                <div
                  className="rounded-xl p-3.5 mt-2"
                  style={{ backgroundColor: '#2a2a2a' }}
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
                        style={{ color: '#5A6070' }}
                      >
                        {grade} Grade Parents —{' '}
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
            <p className="text-sm text-[#5A6070] leading-relaxed mb-5">
              Subscribe to our newsletter for the latest updates, event
              announcements, and PTO news delivered to your inbox.
            </p>

            {subscribed ? (
              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: '#0d3b0d', borderColor: '#085508' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#FFD700' }}>
                  Thanks for subscribing!
                </p>
                <p className="text-xs text-[#5A6070] mt-1">
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
                    className="text-sm border-0 text-white placeholder:text-[#5A6070] focus-visible:ring-1 focus-visible:ring-[#085508]"
                    style={{ backgroundColor: '#2a2a2a' }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={subBusy}
                  className="w-full font-semibold text-white group"
                  style={{ backgroundColor: '#085508' }}
                >
                  <Send className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  {subBusy ? 'Subscribing…' : 'Subscribe to Newsletter'}
                </Button>
                {subError && <p className="text-xs text-red-400">{subError}</p>}
              </form>
            )}

            {/* School store hours — from CMS */}
            <div
              className="mt-4 rounded-lg p-3 border"
              style={{ backgroundColor: '#2a2a2a', borderColor: '#333333' }}
            >
              <p className="text-xs font-semibold" style={{ color: '#FFD700' }}>
                School Store Hours
              </p>
              <p className="text-xs text-[#5A6070] mt-0.5">
                {storeHours}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: '#333333' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#5A6070] text-center sm:text-left">
            &copy; 2026 Stone Hill Middle School PTO. All rights reserved.
          </p>
          <p
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color: '#FFD700' }}
          >
            Go Stingrays!
          </p>
        </div>
      </div>
    </footer>
  )
}
