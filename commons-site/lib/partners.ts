export type Partner = {
  name: string
  category: string
  blurb: string
  url: string
}

export const PARTNERS: Partner[] = [
  {
    name: 'Square',
    category: 'Payments',
    blurb: 'School Square for parent cards and in-person. Not for Pavilion SaaS billing.',
    url: 'https://squareup.com',
  },
  {
    name: 'Stripe',
    category: 'Platform billing',
    blurb: 'HSKRG LLC uses Stripe Checkout and Customer Portal for Pavilion software.',
    url: 'https://stripe.com',
  },
  {
    name: 'Google Workspace',
    category: 'School IT',
    blurb: 'Domain and staff email connect during onboarding when the school is ready.',
    url: 'https://workspace.google.com',
  },
  {
    name: 'ProPublica Nonprofit Explorer',
    category: 'Research',
    blurb: 'Public 990 filings help sales understand PTO scale. Not a product integration.',
    url: 'https://projects.propublica.org/nonprofits/',
  },
]
