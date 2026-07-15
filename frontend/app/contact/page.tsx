import { AnnouncementBar } from '@/components/announcement-bar'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ContactForm } from '@/components/contact/contact-form'
import { Mail, MapPin, Clock, Phone } from 'lucide-react'

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'General Inquiries',
    value: 'info@shmspto.org',
    href: 'mailto:info@shmspto.org',
  },
  {
    icon: Mail,
    label: 'Treasurer',
    value: 'treasurer@shmspto.org',
    href: 'mailto:treasurer@shmspto.org',
  },
  {
    icon: MapPin,
    label: 'School Address',
    value: '23415 Evergreen Ridge Drive, Ashburn, VA 20148',
    href: 'https://maps.google.com/?q=23415+Evergreen+Ridge+Drive+Ashburn+VA+20148',
  },
  {
    icon: Clock,
    label: 'Store Window Hours',
    value: 'Open during lunch periods, Mon–Fri',
    href: null,
  },
]

export const metadata = {
  title: 'Contact | SHMS PTO',
  description: 'Get in touch with the Stone Hill Middle School PTO board.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <Navbar />

      <main id="main-content">
        {/* Hero */}
        <section className="py-16 md:py-24" style={{ backgroundColor: '#085508' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
            >
              Get in Touch
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Contact the PTO
            </h1>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Questions about programs, the school store, volunteering, or membership?
              We&apos;ll get back to you within one business day.
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 md:py-24" style={{ backgroundColor: '#F5F0E8' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

              {/* Left: contact details */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Contact Details</h2>
                <div className="space-y-5">
                  {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#EEF6EE' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: '#085508' }} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#5A6070] uppercase tracking-wider mb-0.5">
                          {label}
                        </p>
                        {href ? (
                          <a
                            href={href}
                            className="text-sm font-medium text-[#1A1A1A] hover:underline"
                            target={href.startsWith('http') ? '_blank' : undefined}
                            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {value}
                          </a>
                        ) : (
                          <p className="text-sm text-[#1A1A1A]">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* PTO note */}
                <div
                  className="mt-10 p-5 rounded-2xl border border-[#E8E4DC] bg-white"
                >
                  <p className="text-sm font-bold text-[#1A1A1A] mb-2">About the PTO Board</p>
                  <p className="text-sm text-[#5A6070] leading-relaxed">
                    The SHMS PTO is run entirely by parent volunteers. We try to respond to all messages
                    within one business day during the school year.
                  </p>
                </div>
              </div>

              {/* Right: form */}
              <div className="lg:col-span-3">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
