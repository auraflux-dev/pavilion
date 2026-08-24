import { getPageStrings, pickString } from '@/lib/api/page-strings'
import {
  CONTACT_FORM_DEFAULTS,
  EVENTS_PAGE_DEFAULTS,
  FUNDRAISING_PAGE_DEFAULTS,
  NEWSLETTER_SIGNUP_DEFAULTS,
} from '@/lib/defaults/visitor-forms-defaults'
import { formString } from '@/lib/copy/form-string'

export async function getNewsletterSignupCopy() {
  const cms = await getPageStrings('newsletter-signup')
  return { ...NEWSLETTER_SIGNUP_DEFAULTS, ...cms }
}

export async function getContactFormCopy() {
  const cms = await getPageStrings('contact-form')
  return { ...CONTACT_FORM_DEFAULTS, ...cms }
}

export async function getEventsPageCopy() {
  const cms = await getPageStrings('events-strings')
  return { ...EVENTS_PAGE_DEFAULTS, ...cms }
}

export async function getFundraisingPageCopy() {
  const cms = await getPageStrings('fundraising-strings')
  return { ...FUNDRAISING_PAGE_DEFAULTS, ...cms }
}

export function visitorFormString(
  copy: Record<string, string>,
  key: string,
  vars?: Record<string, string | number | undefined | null>,
): string {
  return formString(copy, key, pickString(copy, key, key), vars)
}
