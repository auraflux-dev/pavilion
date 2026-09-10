import { PRODUCT_NAME } from '@/lib/brand'

export type HelpArticle = {
  slug: string
  title: string
  summary: string
  body: string
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'what-is-pavilion',
    title: `What ${PRODUCT_NAME} is`,
    summary: 'The PTO operating system. Parents see your school. Your board works in Staff.',
    body: `${PRODUCT_NAME} is the PTO operating system.

Whom we serve: PTO and PTA boards and school community orgs.
Parents are end users of your school brand. They are not ${PRODUCT_NAME} customers.

What we do well: one branded public site, a family login for households, and Staff workspaces that survive board turnover.
Your school keeps its own Square for parent cards and in-person sales.

Why: boards turn over and tools scatter. Parents should never see the vendor.

How: branded trial, then Staff setup for tools and brand, then go live.
Pavilion support stays with your board after launch.
Day-to-day work stays in your Staff portal.

${PRODUCT_NAME} software billing is separate from your school Square.`,
  },
  {
    slug: 'public-family-staff',
    title: 'Public site, family login, and Staff',
    summary: 'Parents use public + family login. Your board lives in Staff.',
    body: `Public site: membership, events, programs, and fundraising on your school brand.

Family login: household, students, membership, and store card when you use one.
That is for parents at your school. It is not a ${PRODUCT_NAME} customer member portal.

Staff portal: where your board buys and runs ${PRODUCT_NAME}.
Setup, tools (Square, Google, Canva), roles, and day-to-day ops live here.

Our team can support your org from our side when you need help.
Your board does not need a separate ${PRODUCT_NAME} member portal for billing or setup.`,
  },
  {
    slug: 'pricing',
    title: 'Pricing',
    summary: '$399/mo core. One school. One invoice.',
    body: `${PRODUCT_NAME} is $399 per school per month on a 12-month term.
Same price as long as you stay.

Includes public site, family login for parents, and Staff for your board.

Parent card processing stays on your school Square and is not this invoice.`,
  },
  {
    slug: 'pricing-and-addons',
    title: 'Pricing',
    summary: '$399/mo core. One school. One invoice.',
    body: `${PRODUCT_NAME} is $399 per school per month on a 12-month term.
Same price as long as you stay.

Includes public site, family login for parents, and Staff for your board.

Parent card processing stays on your school Square and is not this invoice.`,
  },
  {
    slug: 'billing-and-account',
    title: 'Billing and invoices',
    summary: 'Sign in at /account for invoices. School work stays in Staff.',
    body: `Use /account with the email on your ${PRODUCT_NAME} invoice.

We email a one-time sign-in link.
From there you manage invoices, cards, and cancel in your billing portal.

/account is billing only.
Setup and school ops live in your Staff portal.`,
  },
  {
    slug: 'school-square-vs-saas',
    title: `Square at your school vs ${PRODUCT_NAME} billing`,
    summary: 'Two money paths. Do not mix them.',
    body: `Parent memberships, store cards, and in-person sales stay on your school Square.

${PRODUCT_NAME} software is $399 per month on a separate board invoice.
That invoice is for your workspace, not for parent payment fees.`,
  },
  {
    slug: 'trial-then-pay',
    title: 'Getting started after purchase',
    summary: 'Trial first. Staff setup next. Pay locks look and feel.',
    body: `We start with a branded private trial with your logo, colors, and school name.

During the trial, the board turns off areas you do not offer.

Paying locks in approved look and feel and your annual board license.
Deeper setup happens in Staff: Square, Google, Canva, brand, and content.

Your live school workspace is set up with you after purchase. It is not instant the moment you pay.`,
  },
  {
    slug: 'day-to-day-support',
    title: 'Where to get day-to-day support',
    summary: 'Product help here. School ops in your Staff Help.',
    body: `This /help site is for ${PRODUCT_NAME} as a product: billing, partners, how buying works.

Day-to-day PTO ops (membership, events, register, store how-tos) live in your school Staff Help after you launch.

For billing questions, use /account or email hello@hskrg.com.`,
  },
  {
    slug: 'partners',
    title: 'Partners directory',
    summary: 'Curated tools that fit a PTO year.',
    body: `See /partners for integrations and services we recommend.

Listing is curated. It is not a paid ad wall.
Ask if you want something added after a real school uses it.`,
  },
]
