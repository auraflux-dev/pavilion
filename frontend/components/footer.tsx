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

              {/* WhatsApp Groups */}
              <div
                className="rounded-xl p-3.5 mt-2"
                style={{ backgroundColor: '#2A2A2A' }}
              >
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                  WhatsApp Parent Groups
                </p>
                <div className="flex flex-col gap-1.5">
                  <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw7wHf914EK5vqRprpKrvBevGlPnNTq53DPP-2FB5-2FnFytolE8QGU24GCqUVJF6IGPEYyrwrOWusSxxJH7RnR-2F1TAOyc3BiQACuoZ8G50wL-2FjNKABdS6HrwzKeBBRtt5gjhm9byBTwvuwaLRDZi6lhVunogxEPkBsxYwHA7qm5lMCopZuc-2BYPFbiVrefsTtHSQYvpFQRhkqKlvFwdtW42eHVExkTFQSWY1OnGWDIuT5jCskr3J7sZYmxdwf71sA0UXQauD3V1KIa3EUkPmAUwwyUOh0Fev1t-2BGb5op7BLf4F2AACQyX0lGTPMyB-2BiBatmBEHVxE8IjwMq1oYyoDADrAEdYavKy7uNczRMW7k2-2FNDdWXxhq6OTLWUJ-2BkTOLD4nnLVGBDThCroBr8Ae98p-2F-2FDyIEUn9S7wkeGwMCd24nXig4t8fWVdQxDiUDYDQp6R2B3I5qiRHrjI9Ne7JBNmS8m8ZpssC-2Bvrpl4Yg3KvFPLmXQqOT4fH7GtPamNNKVXBjFAZE-3DzJJ2_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2Bwk7m1CbaiHvhvlXd4k52vMLxl3XZwJkPo-2BxB1xrMfofeZCOO5K07LH-2FTJriIQaT6s1lbiKBe5-2BTTfYAZFFaHXLSsXxABRqxtcYgruHb0bZkeMKBh33tgoyI5usWtsgRB0-3D" target="_blank" rel="noopener noreferrer" className="text-xs transition-colors hover:text-white" style={{ color: '#9CA3AF' }}>6th Grade Parents — <span className="underline">Join Here</span></a>
                  <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw5P4288h-2B10Rv9QtaoiU92hDPWA5ycVlMbSfpirBadG-2F-2FjyvDho1CN7bGx8Ow2SMuaOBs9Y71ypFQUMkzdqyBLBLSPzEiHZng2tUN2xBKyA2s-2F-2BH56vh2M72dxBwbOJIAQvdcOGs1afGPDJtql80G6GCirdA4L5MgDCNFn3sNZuSmFggPWuUSgYsPYaR33bIIPe-2Bmhfvg-2Fyn1vf-2FaFltzpuZn3-2Bcxxf5O9ulIL8B-2B6D8esriE93p4ab1HZkB9IWokL7fnhPqaCUGKd0qnxlAu9S0TPtaznNxH5pMSrkexPdyaS-2F34a-2BiRfPbp7DfuGbvbSYqTcsv2z-2BoHrF0YAXuT-2FrT0gUznIpfipbp0cW9jaaHuiKsrUitY1GnKZvNCofA-2F5U9TUmfhVtAtYtDWticm0gARd8Bo2Fc50LOC-2FeiH-2FZgS3qoQtxhtDoAzNLbmuZP7YKS9SdzcUttY9zO3dRjMt8uryWVDu-2BaQaLiy1RvTf0RoX2L3PyZgqAvk1YS2FLjUk-3Da9Lq_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2BzaLmUwnlCdkUFBd7hJyxo8BMlE1SpmkJpVOf7X5K7OPnlceWcAW6mCE7BlfBoMDKVPycByxG6OFbT4P-2BWfLO250yzzdwqFes6VBI-2B1kI7kdhtpANDszMBmjHOwVD9MK80-3D" target="_blank" rel="noopener noreferrer" className="text-xs transition-colors hover:text-white" style={{ color: '#9CA3AF' }}>7th Grade Parents — <span className="underline">Join Here</span></a>
                  <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw54VCIy3PABIW0WZyYSzMX-2BVqOBZq1pudOdsclmMfREFj0A12mlo5rPxbCVauGhkRjeOTlCGm8NNGh4Vho85PeIBS6LGb9rUZq7Dh94-2BfWjYORvtZBOB3EZ1Y0G0YU0bhbl61bm4xITxoHQZR2TSbieHMsq01w6h-2BcyJ2uOUcjUR-2FQAgb5G-2BLyaJg7DkblRNzixU4cURpCta9NC-2FBZvUkihHd38zNs6ZDAHF4sI0AMKyVzLn-2F3YB4jxjUaSaKQL-2FsN62xJxpSPEsWI7HX63-2BRWSWEXTACBG-2Fd8jcRhCFzqlGQklNcHJokq-2F-2FepjNJQVft8TBzaIcVKNMP9Y4tH7Tlq9oL9JjKyjObqhmQeJgtHxVtmo0aFFB-2FgXWPafTk7I1MYv9GDg17BrBupb-2FY9Xni48K5WhXdbA396ReAmaIHc5JjBzJ4NKomkpjLHaN-2B1pnyn4U1ZJq-2BHoEvci8k4N-2Bti8HBWa-2BcKN-2Bg0eJt-2BgjdlH3auNEd7scV-2FlY3rX-2FYg7RDU-3Dvk0y_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2BwNxsbeSquOdFYpUi7QMfglGKnOW-2BudiJ6Sam7tsj5k-2BudjxT9Vurw8U1LSiIjoGSnb1-2FlYD5NpZis-2FhsH4gAdPNMJ7ZrGl22S4FNVveSoLEsHSnb9H1vp0a29rxW0koSU-3D" target="_blank" rel="noopener noreferrer" className="text-xs transition-colors hover:text-white" style={{ color: '#9CA3AF' }}>8th Grade Parents — <span className="underline">Join Here</span></a>
                  <a href="https://u345601.ct.sendgrid.net/ls/click?upn=u001.paU4U0F-2BFgHrcb1wbOPv-2FQDw500ISwfc41VAhCV2pOf0s7LU7CzjHHgxf1piscT03VfAGMtJUKorJQLvubICcbImVM6FobAuJAkkIsjbxw6MCRewZzrd1-2FP-2FEwxqidS3FRJjTx6na1FEtw6vny5O9LRQkd-2Fk8Uag45ChAhOozLCkF-2FbNIcOIOAh7Lq8l8xEznechpWkcAx7q-2FNsSTFe7uUcQzFNAmPy9YAB7-2FEGkmn09ctXVaMNLCTFW75Mh05kamWjsgKKlSgi7aVItW8Wm3gyPfKd8j6lRlNzbpnuOcJN7BzSgnb-2B-2F2KL2vvIdh47wA8l-2B-2BVRVJu9i1X1Sq0KeF6haDj4X-2Blwtg9-2FYOw4AIM-2Fnczvow2nNMr2GUKWC55BYQk7BXqHGoB6ViI63KLrgYSq6CJhqEqibgSR5A0-2FO1BlayQIIemdLyt0b4iu1g-2FIOsxorP8NeS91pzeXndtXCc1fgL-2B8-2Bxe30cv7Qz2mhZekHn402ei-2FWUErUTY5mkksPckQJp1zYxynP0ahepHVR8AGD8dIevw3b2EY0cDQQZgc4QT2VQbLxv-2F-2BOHnhY-2BmONUYy1DF8KvwyEGuouIhC9kXYe6s-2BSpQutOwxnOt2a3NM-3D6vQ7_cFjCzFrpjdiMerga4PMoxINvpmfSA8EbsXEwqV5PS70iw6qIiXDYoWAl6KAYB4G2Q2Qn6U-2FSZINFWvmLovgUDzzznyp5WPSE8vfHwxR9W0jK5pIQpddgvWDncpISgZFlDROjcsjPUkaJxCcgZy-2FBREcHISDN6eriL-2BRQjGrb2-2Bzp2-2FwSGPj-2Fph5c4S3tSOvQwcXQKPANn77IKi1baStaWyEMqTgvUaymZOX2R3cpeuc5Db7Bf8jxiQLPOqmnpbOOZY5NSdtaMgite0aYfhA7cRrkuSIWIe1KV1Tl2ssSOL0-3D" target="_blank" rel="noopener noreferrer" className="text-xs transition-colors hover:text-white" style={{ color: '#9CA3AF' }}>Volunteers — <span className="underline">Join Here</span></a>
                </div>
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
