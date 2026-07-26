/**
 * Legal page content from PageContent CMS with code defaults.
 */
import { getPageContent } from '@/lib/api/page-content'

export type LegalDocSlug =
  | 'privacy'
  | 'terms'
  | 'photo-release'
  | 'membership-terms'
  | 'enrichment-waiver'
  | 'enrichment-medical'
  | 'data-security'

export type LegalDoc = {
  slug: LegalDocSlug
  title: string
  updated: string
  sections: { heading: string; body: string }[]
}

const DEFAULTS: Record<LegalDoc['slug'], LegalDoc> = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Who we are',
        body: 'Stone Hill Middle School PTO (SHMS PTO) operates shmspto.org to support students and families. Contact: president@shmspto.org.',
      },
      {
        heading: 'Information we collect',
        body: 'Account details (name, email, phone), student first name / last name / grade, program enrollments, store-card and membership purchase records, survey responses, and messages you send through the site.',
      },
      {
        heading: 'How we use information',
        body: 'We use data to run PTO programs, process payments via Square and Wix, communicate with members, improve events and membership, and meet legal or school-district requirements.',
      },
      {
        heading: 'Payments',
        body: 'Card payments are processed by Square and/or Wix Payments. SHMS PTO does not store full card numbers. Optional saved cards are vaulted by Square; we store only masked metadata (brand, last 4, expiration).',
      },
      {
        heading: 'Sharing',
        body: 'We do not sell personal information. We share data with service providers needed to run the site (Wix, Square, email/SMS tools) and with school administrators when required for student programs.',
      },
      {
        heading: 'Photos',
        body: 'Event photos may appear on the website or social channels only under our Photo Release policy. See /photo-release.',
      },
      {
        heading: 'Your choices',
        body: 'Update your profile in the member portal, remove a saved payment card anytime, or email the PTO to request account corrections.',
      },
      {
        heading: 'Security & retention',
        body: 'Technical and organizational measures for protecting family data, backups, monitoring, and retention are described in our Data Security Practices at /data-security.',
      },
    ],
  },
  terms: {
    slug: 'terms',
    title: 'Terms of Use',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Agreement',
        body: 'By using shmspto.org you agree to these terms and our Privacy Policy. The site is operated by SHMS PTO for school community purposes.',
      },
      {
        heading: 'Accounts',
        body: 'You must provide accurate information. You are responsible for activity under your login. Parents may only manage students in their household.',
      },
      {
        heading: 'Purchases',
        body: 'Memberships, spirit wear, store-card reloads, and program fees are subject to the pricing and refund practices posted at purchase. Prepaid store-card balances are for PTO snack/store use.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not misuse the site, attempt unauthorized access, harass others, or post unlawful content. Staff tools are limited to assigned PTO roles.',
      },
      {
        heading: 'Content',
        body: 'Site content is owned by SHMS PTO or licensed partners. Do not republish materials without permission except for personal family use.',
      },
      {
        heading: 'Contact',
        body: 'Questions: president@shmspto.org or the Contact page.',
      },
    ],
  },
  'photo-release': {
    slug: 'photo-release',
    title: 'Photo & Media Release',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Purpose',
        body: 'SHMS PTO may photograph or record events to celebrate students and promote programs on the website, newsletters, and social media.',
      },
      {
        heading: 'What we avoid',
        body: 'We do not post student last names with photos on public social channels unless a parent has given explicit written permission. Classroom work is shared carefully and never with sensitive academic records.',
      },
      {
        heading: 'Opt out',
        body: 'Email marketing@shmspto.org or president@shmspto.org with your student name and grade to opt out of public photo use. We will honor opt-outs going forward; previously published posts may remain until reasonably removable.',
      },
      {
        heading: 'Marketing compliance',
        body: 'The VP Marketing is responsible for reviewing graphics and posts for student privacy before publishing.',
      },
    ],
  },
  'membership-terms': {
    slug: 'membership-terms',
    title: 'PTO Membership Terms',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Membership term & conduct',
        body: 'Paid membership covers the current school year (or remaining portion thereof). Members may vote at PTO meetings while in good standing. Respectful conduct toward students, families, staff, and volunteers is required. The PTO may revoke membership for serious misconduct.',
      },
      {
        heading: 'Refund & cancellation',
        body: 'Membership dues and tier donations are non-refundable once payment is processed, except when required by law or when the PTO cancels the membership benefit before it begins. Store-card credit loaded with membership is subject to Cove store-card policies.',
      },
      {
        heading: 'Financial disclosure & tax acknowledgment',
        body: 'SHMS PTO is a 501(c)(3) nonprofit. A portion of membership dues or tier donations may be tax-deductible to the extent allowed by law; consult your tax advisor. You will receive a receipt for your records. Cove store-card credit is a prepaid benefit, not a deductible donation.',
      },
    ],
  },
  'enrichment-waiver': {
    slug: 'enrichment-waiver',
    title: 'Enrichment Liability, Pick-Up & Conduct',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Liability waiver & hold harmless',
        body: 'I acknowledge that evening enrichment at Stone Hill Middle School involves ordinary risks of physical activity and after-hours campus use. I agree to hold harmless SHMS PTO, Stone Hill Middle School, and Loudoun County Public Schools (LCPS) for non-negligent injuries or loss of personal property arising from participation.',
      },
      {
        heading: 'Student pick-up & dismissal',
        body: 'Parents must provide an authorized pick-up list. Students may only be released to listed adults (or under an approved self-release for eligible grades, if granted). Repeated late pickups may result in a late fee or removal from the program. Self-release, if allowed, does not apply before the end of class.',
      },
      {
        heading: 'Code of conduct & attendance',
        body: 'Students must follow behavior expectations during non-school hours. Disruptive conduct may result in dismissal without refund. Missed classes (student absence, weather, or school closures) are not refunded or automatically rescheduled unless the PTO announces otherwise.',
      },
    ],
  },
  'data-security': {
    slug: 'data-security',
    title: 'Data Security Practices',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Purpose',
        body: 'This statement describes how SHMS PTO protects personal information on shmspto.org. It supplements our Privacy Policy and is intended for parents, staff, and school partners who need assurance that student and family data is handled with care.',
      },
      {
        heading: 'Where data lives (not SQLite)',
        body: 'The website does not use a local SQLite database. Application content and family records are stored in Wix CMS (Wix Data) as the system of record. Payment card numbers are never stored by SHMS PTO; card processing is handled by Square and/or Wix Payments. Session tokens are httpOnly cookies on Vercel-hosted Next.js.',
      },
      {
        heading: 'Access control',
        body: 'Parents authenticate with Wix Members (including Google sign-in where enabled) and only see their own household. Staff tools require an @shmspto.org identity plus an assigned role (admin, treasurer, membership, etc.). Sensitive staff actions such as act-as are role-gated and written to an audit log.',
      },
      {
        heading: 'Transport & application security',
        body: 'Production traffic is HTTPS-only with HSTS. The application sets security headers (frame denial, content-type sniffing protection, referrer policy, permissions policy, and a content security policy tuned for Wix, Square, PayPal, and POWR embeds). Mutating API calls from browsers are checked for same-origin. Public forms are rate-limited. Webhooks and cron jobs require shared secrets.',
      },
      {
        heading: 'Backups',
 body: 'Wix retains CMS data under Wix commercial backup practices. In addition, SHMS PTO runs scheduled exports of operational CMS collections to encrypted object storage (Cloudflare R2) when backup credentials are configured. Backups are for disaster recovery and authorized board access only. not for marketing use.',
      },
      {
        heading: 'Monitoring & error reporting',
        body: 'Uptime monitoring (UptimeRobot) checks public health endpoints. When error reporting is enabled in the deployment environment, application errors are logged with an event reference parents or staff can share with support (and optionally forwarded to a secure webhook). Reporting can be turned off by clearing the ERROR_REPORTING_ENABLED environment signal.',
      },
      {
        heading: 'Vendor processors',
        body: 'We rely on vetted processors: Wix (hosting identity & CMS), Vercel (application hosting), Square / PayPal (payments), Google Workspace (staff email/calendar/docs), and optional POWR for embedded surveys. Each vendor processes data under their own terms and security programs.',
      },
      {
        heading: 'Incident contact',
        body: 'Suspected unauthorized access or data issues: email president@shmspto.org and treasurer@shmspto.org immediately. Include any on-screen error reference ID if shown.',
      },
    ],
  },
  'enrichment-medical': {
    slug: 'enrichment-medical',
    title: 'Emergency Medical Authorization',
    updated: 'July 2026',
    sections: [
      {
        heading: 'Authorization',
        body: 'I authorize program coordinators to seek emergency medical treatment for my student if I cannot be reached immediately. I confirm that emergency contacts, allergies, medical conditions, and special accommodations on my student profile are accurate and current.',
      },
      {
        heading: 'Information I must keep updated',
        body: 'Primary and secondary parent/guardian phone numbers, an emergency contact if parents are unavailable, severe allergies (including EpiPen needs), medications, and any accommodations required for safe participation.',
      },
    ],
  },
}

function parseSections(bullets: string[] | undefined) {
  if (!bullets?.length) return null
  const sections: { heading: string; body: string }[] = []
  for (const line of bullets) {
    const idx = line.indexOf('|')
    if (idx === -1) continue
    sections.push({ heading: line.slice(0, idx).trim(), body: line.slice(idx + 1).trim() })
  }
  return sections.length ? sections : null
}

export async function getLegalDoc(slug: LegalDoc['slug']): Promise<LegalDoc> {
  const fallback = DEFAULTS[slug]
  try {
    const page = await getPageContent(`legal-${slug}`)
    if (!page) return fallback
    const sections = parseSections(page.bullets) ?? fallback.sections
    return {
      slug,
      title: page.title || fallback.title,
      updated: page.sectionTitle || fallback.updated,
      sections,
    }
  } catch {
    return fallback
  }
}
