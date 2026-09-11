/** Launch marketing posts (mirrors commons-site/content/blog/*.md). */
export const MARKETING_BLOG_SEED = [
  {
    slug: 'survive-pto-officer-turnover',
    title: 'How PTOs keep history when officers change every June',
    date: '2026-09-01',
    category: 'Continuity',
    excerpt:
      'Role-based workspaces keep budgets, Drive folders, and volunteer queues with the school instead of a personal Gmail account.',
    minutes: 4,
    bodyMarkdown: `Every June, a new slate of officers inherits a pile of shared passwords and leftover folders.

Pavilion treats the role as the owner. Incoming chairs pick up files, context, and Staff queues without a scavenger hunt.

Parents keep the same public site and family login. Only Staff seats change.`,
  },
  {
    slug: 'three-surfaces-one-school-brand',
    title: 'Public site, family login, and Staff: one brand for your school',
    date: '2026-08-18',
    category: 'Product',
    excerpt:
      'Parents should never see the vendor. Your PTO needs a front door, a household login, and a place officers actually work.',
    minutes: 5,
    bodyMarkdown: `A brochure site is not enough when membership, programs, and volunteer shifts live in three other tools.

Pavilion keeps the public site, family login, and Staff portal on your school brand.

Your team works in Staff. Parents see the school. Not Pavilion.`,
  },
  {
    slug: 'branded-trial-before-you-buy',
    title: 'Why a branded trial beats a slideshow demo',
    date: '2026-08-04',
    category: 'Launch',
    excerpt:
      'Walk your officers through a private host with your logo and colors before you commit to the annual plan.',
    minutes: 3,
    bodyMarkdown: `Cold product tours ask boards to imagine their school on someone else's brand.

A branded trial applies your colors and name first. Your team logs in on a private host.

Book a live walkthrough and we configure that trial with you.`,
  },
] as const
