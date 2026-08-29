import { VisitorChrome } from '@/components/site/visitor-chrome'
import { ContactForm } from '@/components/contact/contact-form'
import { PageHero } from '@/components/page-hero'
import { Mail, MapPin, Clock } from 'lucide-react'
import { getSiteSettings } from '@/lib/api/site-settings'
import { getPageContent } from '@/lib/api/page-content'
import { getContactFormCopy } from '@/lib/api/visitor-forms-copy'
import { CONTACT_DEFAULTS } from '@/lib/defaults/page-content'
import { normalizeStaffInbox, resolveTreasurerInboxes } from '@/lib/staff/inbox'
import { vanillaizeIfDemo } from '@/lib/demo/brand'
import { getPageSections } from '@/lib/api/page-sections'
import { PageSectionsRenderer } from '@/components/cms/page-sections-renderer'

export async function generateMetadata() {
  return {
    title: 'Contact',
    description: vanillaizeIfDemo('Get in touch with the Stone Hill Middle School PTO board.'),
  }
}

export const revalidate = 300

export default async function ContactPage() {
  const composed = await getPageSections('contact')
  if (composed?.length) {
    return (
      <VisitorChrome pageKey="contact">
        <PageSectionsRenderer sections={composed} />
      </VisitorChrome>
    )
  }

  const [settings, page, formCopy] = await Promise.all([
    getSiteSettings(),
    getPageContent('contact'),
    getContactFormCopy(),
  ])

  const general = normalizeStaffInbox(
    settings.get('contactEmailGeneral', CONTACT_DEFAULTS.contactEmailGeneral),
  )
  const treasurerList = resolveTreasurerInboxes(
    settings.get('contactEmailTreasurer', CONTACT_DEFAULTS.contactEmailTreasurer),
  )
  const treasurer = treasurerList.join(', ') || 'treasurer@shmspto.org'
  const address = settings.get('contactAddress', CONTACT_DEFAULTS.contactAddress)
  const storeHours = settings.get(
    'contactStoreHours',
    settings.get('storeHours', CONTACT_DEFAULTS.contactStoreHours)
  )

  const contactInfo = [
    {
      icon: Mail,
      label: 'General Inquiries',
      value: general,
      href: `mailto:${general}`,
    },
    {
      icon: Mail,
      label: 'Treasurer',
      value: treasurer,
      href: `mailto:${treasurer}`,
    },
    {
      icon: MapPin,
      label: 'School Address',
      value: address,
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
    },
    {
      icon: Clock,
      label: vanillaizeIfDemo('The Cove (in-person snack window)'),
      value: `${storeHours} · Online shopping and store-card reloads available anytime with a free or paid parent login.`,
      href: null as string | null,
    },
  ]

  return (
    <VisitorChrome pageKey="contact">
        <PageHero content={page} pageKey="contact" />

        <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--brand-warm)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Contact Details</h2>
                <div className="space-y-5">
                  {contactInfo.map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'var(--brand-soft)' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: 'var(--brand-green)' }} aria-hidden="true" />
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

                <div className="mt-10 p-5 rounded-2xl border border-[var(--border)] bg-white">
                  <p className="text-sm font-bold text-[#1A1A1A] mb-2">{page.sectionTitle}</p>
                  <p className="text-sm text-[#5A6070] leading-relaxed">{page.sectionBody}</p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <ContactForm copy={formCopy} />
              </div>
            </div>
          </div>
        </section>
    </VisitorChrome>
  )
}
