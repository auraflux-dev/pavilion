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
    summary: 'Public site, family portal, and staff portal on your school brand.',
    body: `${PRODUCT_NAME} is the PTO operating system.

Parents see your school brand, not our product name.
Staff run membership, events, programs, and board work from one login.

Your school keeps its own Square for parent cards and in-person sales.
${PRODUCT_NAME} software billing is separate, on HSKRG LLC Stripe.`,
  },
  {
    slug: 'public-family-staff',
    title: 'Public site, family portal, and staff portal',
    summary: 'Three surfaces. One school year login for the board.',
    body: `Public site: membership, events, programs, and fundraising without a stitch of tools.

Family portal: household, students, membership, and store card when you use one.

Staff portal: role workspaces, in-app Help, Google and Canva inside the board app.

Parents never need our product name. Boards inherit one place next spring.`,
  },
  {
    slug: 'pricing-and-addons',
    title: 'Pricing and add-ons',
    summary: '$399/mo core. Store and creative are optional.',
    body: `${PRODUCT_NAME} is $399 per school per month on a 12-month term.
Same price as long as you stay.

Add-ons ($99/mo each when configured):
On-site school store (window, register, family prepaid card).
Done-for-you creative (flyers and video).

Parent card processing stays on your school Square and is not this invoice.`,
  },
  {
    slug: 'billing-and-account',
    title: 'Billing and invoices',
    summary: 'Magic-link sign-in, Stripe Customer Portal, add-ons.',
    body: `Use /account with the email on your ${PRODUCT_NAME} invoice.

We email a one-time sign-in link.
From there you open the Stripe billing portal for invoices, cards, and cancel.

Add-ons (school store, creative) can start from /account when prices are configured.
Otherwise email us and we add them on your subscription.`,
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
    summary: 'Trial first. Pay locks look and feel. Deeper work after pay.',
    body: `Sales builds a branded private trial with your logo, colors, and school name.

During the trial, the board prunes surfaces you do not offer.
Store, spirit wear, card, programs, and more can hide so the trial feels like your PTO.

Pay is a small start: approved look and feel, pruned set, HSKRG Stripe billing.
Deeper onboarding happens with you after pay.

We do not auto-provision a live tenant the moment checkout completes.`,
  },
  {
    slug: 'day-to-day-support',
    title: 'Where to get day-to-day support',
    summary: 'Platform help here. School ops in your Staff Help.',
    body: `This /help site is for ${PRODUCT_NAME} as a product: billing, add-ons, partners, how buying works.

Day-to-day PTO ops (membership, events, register, Cove-style store how-tos) live in your school Staff and Member Help after go-live.

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
