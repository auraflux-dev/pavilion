/**
 * Legal page content from PageContent CMS with code defaults.
 */
import { getPageContent } from '@/lib/api/page-content'

export type LegalDoc = {
  slug: 'privacy' | 'terms' | 'photo-release'
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
