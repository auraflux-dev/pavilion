export type HelpArticle = {
  slug: string
  title: string
  summary: string
  body: string
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'what-is-commons',
    title: 'What Commons is',
    summary: 'Public site, family portal, and staff portal on your school brand.',
    body: `Commons is the PTO operating system.

Parents see your school brand, not our product name.
Staff run membership, events, programs, and board work from one login.

Your school keeps its own Square for parent cards and in-person sales.
Commons software billing is separate, on HSKRG LLC Stripe.`,
  },
  {
    slug: 'trial-then-pay',
    title: 'How trial and pay work',
    summary: 'Branded private trial first. Pay starts the small ship, not auto-provision.',
    body: `Sales builds a branded private trial with your logo, colors, and school name.

During the trial, the board prunes surfaces you do not offer.
Store, spirit wear, card, programs, and more can hide so the site feels like your PTO.

Pay is a small start: approved look and feel, pruned set, HSKRG Stripe billing.
Deeper onboarding happens with you after pay.

We do not auto-provision a live tenant the moment checkout completes.`,
  },
  {
    slug: 'billing-and-account',
    title: 'Billing and /account',
    summary: 'Magic-link sign-in, Stripe Customer Portal, add-ons.',
    body: `Use /account with the email on your Commons invoice.

We email a one-time sign-in link.
From there you open the Stripe billing portal for invoices, cards, and cancel.

Add-ons (school store, creative) can start from /account when prices are configured.
Otherwise email us and we add them on your subscription.`,
  },
  {
    slug: 'school-square-vs-saas',
    title: 'School Square vs Commons SaaS',
    summary: 'Two money paths. Do not mix them.',
    body: `Parent memberships, store cards, and in-person sales stay on your school Square.

Commons software is $399 per month on HSKRG LLC Stripe.
That invoice is for the platform, not for parent checkout fees.`,
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
