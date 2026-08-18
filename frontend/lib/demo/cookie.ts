export const DEMO_REVIEW_COOKIE = 'demo_review'

export function hasDemoReviewCookie(raw: string | undefined): boolean {
  return Boolean(raw && raw.includes('.') && raw.length > 20)
}
