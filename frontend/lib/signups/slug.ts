/** URL-safe slug from title; caller ensures uniqueness per org. */
export function slugifySignupTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'signup'
}

export function signupPublicPath(slug: string): string {
  return `/signups/${encodeURIComponent(slug)}`
}
