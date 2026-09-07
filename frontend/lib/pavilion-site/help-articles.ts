import { PRODUCT_NAME } from '@/lib/pavilion-site/brand'

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

How: branded trial, then Staff onboarding (connectors and brand), then go live.
${PRODUCT_NAME} platform Staff supports your org. Day-to-day work stays in your Staff portal.

${PRODUCT_NAME} software billing is separate, on HSKRG LLC Stripe.`,
  },
  {
    slug: 'public-family-staff',
    title: 'Public site, family login, and Staff',
    summary: 'Parents use public + family login. Your board lives in Staff.',
    body: `Public site: membership, events, programs, and fundraising on your school brand.

Family login: household, students, membership, and store card when you use one.
That is for parents at your school. It is not a ${PRODUCT_NAME} customer member portal.

Staff portal: where your board buys and runs ${PRODUCT_NAME}.
Onboarding, connectors (Square, Google, Canva), roles, and day-to-day ops live here.

${PRODUCT_NAME} platform Staff (@onpavilion.com) can support your org from our Staff side.
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
    summary: 'Magic-link /account for Stripe. School work stays in Staff.',
    body: `Use /account with the email on your ${PRODUCT_NAME} invoice.

We email a one-time sign-in link.
From there you open the Stripe billing portal for invoices, cards, and cancel.

/account is billing only.
Onboarding, connectors, and school ops live in your Staff portal.`,
  },
  {
    slug: 'school-square-vs-saas',
    title: `Square at your school vs Stripe for ${PRODUCT_NAME}`,
    summary: 'Two money paths. Do not mix them.',
    body: `Parent memberships, store cards, and in-person sales stay on your school Square.

${PRODUCT_NAME} software is $399 per month on HSKRG LLC Stripe.
That invoice is for the platform, not for parent checkout fees.`,
  },
  {
    slug: 'trial-then-pay',
    title: 'Getting started after purchase',
    summary: 'Trial first. Staff onboarding next. Pay locks look and feel.',
    body: `Sales builds a branded private trial with your logo, colors, and school name.

During the trial, the board prunes surfaces you do not offer in Staff.

Pay is a small start: approved look and feel, pruned set, HSKRG Stripe billing.
Deeper onboarding happens in Staff: Square, Google, Canva, brand, and content.

We do not auto-provision a live tenant the moment checkout completes.`,
  },
  {
    slug: 'day-to-day-support',
    title: 'Where to get day-to-day support',
    summary: 'Platform help here. School ops in your Staff Help.',
    body: `This /help site is for ${PRODUCT_NAME} as a product: billing, partners, how buying works.

Day-to-day PTO ops (membership, events, register, store how-tos) live in your school Staff Help after go-live.

For platform billing questions, use /account or email hello@hskrg.com.`,
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
