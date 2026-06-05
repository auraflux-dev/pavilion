'use client'

import { useState } from 'react'
import { GraduationCap, MapPin, Mail, Facebook, Twitter, Instagram, Youtube, ArrowRight, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const quickLinks = [
  { label: 'About the PTO', href: '#about' },
  { label: 'Programs', href: '#programs' },
  { label: 'Upcoming Events', href: '#events' },
  { label: 'School Store', href: '#store' },
  { label: 'Volunteer Opportunities', href: '#volunteer' },
  { label: 'Become a Member', href: '#membership' },
  { label: 'Contact Us', href: '#contact' },
  { label: 'Parent Login', href: '#login' },
]

const socialLinks = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter / X', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
    }
  }

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
              href="#"
              className="inline-flex items-center gap-3 mb-5 group"
              aria-label="Stone Hill Middle School PTO Home"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: '#085508' }}
                aria-hidden="true"
              >
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm text-white leading-tight">
                  Stone Hill Middle School
                </div>
                <div
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: '#2A8B7A' }}
                >
                  PTO
                </div>
              </div>
            </a>

            <p className="text-[#9CA3AF] text-sm leading-relaxed mb-6">
              Enriching the academic and social experience for all SHMS
              students and families in Ashburn, Virginia.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:text-white"
                  style={{ backgroundColor: '#2A2A2A', color: '#9CA3AF' }}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-5">
              Quick Links
            </h3>
            <ul className="space-y-2.5" role="list">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-[#9CA3AF] hover:text-white transition-colors flex items-center gap-1.5 group"
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
                  style={{ color: '#2A8B7A' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm text-[#9CA3AF] leading-relaxed">
                    23415 Evergreen Ridge Drive
                    <br />
                    Ashburn, VA 20148
                  </p>
                  <a
                    href="https://maps.google.com/?q=23415+Evergreen+Ridge+Drive+Ashburn+VA+20148"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-1 inline-block hover:underline"
                    style={{ color: '#2A8B7A' }}
                  >
                    Get Directions
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail
                  className="w-4 h-4 mt-0.5 shrink-0"
                  style={{ color: '#2A8B7A' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-0.5">
                    President
                  </p>
                  <a
                    href="mailto:president@shmspto.org"
                    className="text-sm hover:text-white transition-colors"
                    style={{ color: '#9CA3AF' }}
                  >
                    president@shmspto.org
                  </a>
                </div>
              </div>

              {/* Harris Teeter */}
              <div
                className="rounded-xl p-3.5 mt-2"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Harris Teeter VIC Code
                </p>
                <p
                  className="text-2xl font-bold tracking-widest"
                  style={{ color: '#2A8B7A' }}
                >
                  6711
                </p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Link your card to support SHMS!
                </p>
              </div>
            </address>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-5">
              Stay Connected
            </h3>
            <p className="text-sm text-[#9CA3AF] leading-relaxed mb-5">
              Subscribe to our newsletter for the latest updates, event
              announcements, and PTO news delivered to your inbox.
            </p>

            {subscribed ? (
              <div
                className="rounded-xl p-4 border"
                style={{ backgroundColor: '#0a1f0a', borderColor: '#085508' }}
              >
                <p className="text-sm font-semibold" style={{ color: '#a8d5a2' }}>
                  Thanks for subscribing!
                </p>
                <p className="text-xs text-[#6B7280] mt-1">
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
                    className="text-sm border-0 text-white placeholder:text-[#6B7280] focus-visible:ring-1 focus-visible:ring-[#085508]"
                    style={{ backgroundColor: '#2A2A2A' }}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full font-semibold text-white group"
                  style={{ backgroundColor: '#085508' }}
                >
                  <Send className="w-4 h-4 mr-2 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  Subscribe to Newsletter
                </Button>
              </form>
            )}

            {/* School store note */}
            <div
              className="mt-4 rounded-lg p-3 border"
              style={{ backgroundColor: '#200808', borderColor: '#8B1A1A' }}
            >
              <p className="text-xs font-semibold" style={{ color: '#f4a0a0' }}>
                School Store Hours
              </p>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Mon–Fri · 8:15 AM – 9:00 AM
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: '#2A2A2A' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#6B7280] text-center sm:text-left">
            &copy; 2026 Stone Hill Middle School PTO. All rights reserved.
          </p>
          <p
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color: '#2A8B7A' }}
          >
            Go Stingrays!
          </p>
        </div>
      </div>
    </footer>
  )
}
