import { PRODUCT_NAME } from '@/lib/brand'
import { DEMO_URL } from '@/lib/pricing'

export { DEMO_URL }

export const HERO_EYEBROW = 'For PTO and PTA boards'

export const HERO_HEADLINE = 'Run your whole PTO in one place.'

export const HERO_SUPPORT =
  'Your board works in Staff.\nParents get your public site and family login.\nThey see your school. Not Pavilion.'

/** Who / what / why / how / whom for marketing clarity. */
export const STORY = {
  whom: 'PTO and PTA boards and school community orgs.\nParents use your brand. They are not Pavilion customers.',
  who: `${PRODUCT_NAME} is the PTO operating system.`,
  what: 'One branded public site, family login for households, and Staff workspaces that survive board turnover.\nYour school keeps its Square.',
  why: 'Boards turn over. Tools scatter.\nParents should never see the vendor.',
  how: 'Branded trial. Staff onboarding for connectors and brand. Go live.\nPavilion platform Staff supports your org.',
} as const

export const PILLARS = [
  {
    id: 'engage',
    title: 'Engage',
    body: 'Families join, renew, and stay in the loop on your brand.',
  },
  {
    id: 'simplify',
    title: 'Simplify',
    body: 'Programs, events, and volunteer sign-ups together.',
  },
  {
    id: 'sell',
    title: 'Sell',
    body: 'Online and in-person sales on your school Square.',
  },
  {
    id: 'streamline',
    title: 'Streamline',
    body: 'Staff is where your board lives: onboarding, connectors, and ops.',
  },
] as const

export const SURFACES = [
  {
    id: 'public',
    title: 'Public site',
    body: `Membership, events, programs, and fundraising on your school brand.\nParents do not see ${PRODUCT_NAME}. They see your PTO.`,
    imageSrc: '/gallery/riverside-public.jpg',
    imageAlt: 'Riverside demo public site homepage',
    href: '/product#public',
  },
  {
    id: 'member',
    title: 'Family login',
    body: 'Household login for students, membership, and the store card.\nFor parents at your school. Not a Pavilion customer portal.',
    imageSrc: '/gallery/riverside-member.jpg',
    imageAlt: 'Riverside demo family membership page',
    href: '/product#member',
  },
  {
    id: 'staff',
    title: 'Staff portal',
    body: 'Where your board buys and runs Pavilion.\nOnboarding, Square, Google, Canva, and day-to-day work live here.',
    imageSrc: '/gallery/riverside-staff.jpg',
    imageAlt: 'Riverside demo staff home',
    href: '/product#staff',
  },
] as const

export const AUDIENCES = [
  'PTOs / PTAs',
  'Schools / districts',
  'Enrichment programs',
  'Camps',
  'Clubs / boosters',
  'Arts / music',
  'Sports orgs',
  'Education nonprofits',
] as const

export const CLOSE_SLOGAN = 'Ready when your board is.'

export const CLOSE_SUPPORT =
  'Start with a branded trial.\nOnboard in Staff.\nOr tour the Riverside demo first.'
