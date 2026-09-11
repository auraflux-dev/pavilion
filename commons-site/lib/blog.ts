export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  date: string
  minutes: number
  body: string[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'survive-pto-officer-turnover',
    title: 'How PTOs keep history when officers change every June',
    excerpt:
      'Role-based workspaces keep budgets, Drive folders, and volunteer queues with the school instead of a personal Gmail account.',
    date: '2026-09-01',
    minutes: 4,
    body: [
      'Every June, a new slate of officers inherits a pile of shared passwords and leftover folders.',
      'Pavilion treats the role as the owner. Incoming chairs pick up files, context, and Staff queues without a scavenger hunt.',
      'Parents keep the same public site and family login. Only Staff seats change.',
    ],
  },
  {
    slug: 'three-surfaces-one-school-brand',
    title: 'Public site, family login, and Staff: one brand for your school',
    excerpt:
      'Parents should never see the vendor. Your PTO needs a front door, a household login, and a place officers actually work.',
    date: '2026-08-18',
    minutes: 5,
    body: [
      'A brochure site is not enough when membership, programs, and volunteer shifts live in three other tools.',
      'Pavilion keeps the public site, family login, and Staff portal on your school brand.',
      'Your team works in Staff. Parents see the school. Not Pavilion.',
    ],
  },
  {
    slug: 'branded-trial-before-you-buy',
    title: 'Why a branded trial beats a slideshow demo',
    excerpt:
      'Walk your officers through a private host with your logo and colors before you commit to the annual plan.',
    date: '2026-08-04',
    minutes: 3,
    body: [
      'Cold product tours ask boards to imagine their school on someone else’s brand.',
      'A branded trial applies your colors and name first. Your team logs in on a private host.',
      'Book a live walkthrough and we configure that trial with you.',
    ],
  },
] satisfies BlogPost[]

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}
