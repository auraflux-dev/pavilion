/** Newsletter signup block (newsletter page + events footer). */

export const NEWSLETTER_SIGNUP_DEFAULTS: Record<string, string> = {
  'signup.title': 'Subscribe to the Newsletter',
  'signup.body': 'Join hundreds of SHMS PTO families already in the loop.',
  'signup.emailLabel': 'Email address',
  'signup.emailPlaceholder': 'yourname@email.com',
  'signup.submit': 'Subscribe',
  'signup.sending': 'Subscribing…',
  'signup.successTitle': "You're subscribed!",
  'signup.successBody':
    "Welcome to the SHMS PTO newsletter. You'll hear from us soon.",
  'signup.successDemo':
    'Preview only. This demo does not add you to a live list.',
  'signup.error': 'Something went wrong. Please try again.',
}

/** /contact general inquiry form. */

export const CONTACT_FORM_DEFAULTS: Record<string, string> = {
  'form.title': 'Send us a message',
  'form.nameLabel': 'Your name',
  'form.emailLabel': 'Email',
  'form.topicLabel': 'Topic',
  'form.messageLabel': 'Message',
  'form.messagePlaceholder': 'How can we help?',
  'form.submit': 'Send message',
  'form.sending': 'Sending…',
  'form.successTitle': 'Message sent!',
  'form.successBody':
    'Thank you for reaching out. A PTO board member will get back to you within one business day.',
  'form.previewTitle': 'Preview only',
  'form.previewBody':
    'This demo does not send mail. On a live school, a board member would reply within one business day.',
  'form.error':
    'Something went wrong. Please try again or email us directly.',
  'form.topic.general': 'General Question',
  'form.topic.programs': 'Programs & Registration',
  'form.topic.cove': 'The Cove / store card',
  'form.topic.volunteer': 'Volunteer Opportunities',
  'form.topic.membership': 'Membership',
  'form.topic.fundraising': 'Fundraising',
  'form.topic.events': 'Event Information',
  'form.topic.board': 'Board / Governance',
  'form.topic.other': 'Other',
}

/** Events page sections below the hero (not PageHero fields). */

export const EVENTS_PAGE_DEFAULTS: Record<string, string> = {
  'list.heading': 'All Events',
  'list.loadError': 'Unable to load events right now. Please try again later.',
  'list.emptyTitle': 'No upcoming events scheduled.',
  'list.emptyBody': 'Check back soon. Events are added regularly.',
  'ideas.title': 'Have an event idea?',
  'ideas.intro':
    'Parents and community members can suggest celebrations, family nights, and fundraisers.\nIdeas go to the VP of Events.',
  'newsletter.title': 'Never miss an event',
  'newsletter.body':
    'Subscribe to our newsletter and get event reminders delivered straight to your inbox.',
  'newsletter.cta': 'Subscribe to Newsletter',
}

/** Fundraising page shell copy (not live dollar totals). */

export const FUNDRAISING_PAGE_DEFAULTS: Record<string, string> = {
  'hero.badge': 'Fundraising',
  'hero.totalLabel': 'Total Raised',
  'hero.goalLabel': 'Annual Goal',
  'hero.of': 'of',
  'hero.goalPct': '{pct}% of annual goal',
  'hero.updated': 'Updated from live totals',
  'initiatives.eyebrow': 'By Initiative',
  'initiatives.title': 'Every Way You Can Help',
  'initiatives.body':
    'Memberships, Cove Digital Cards, event tickets, and volunteering. It all adds up.',
  'allocations.eyebrow': 'Transparency',
  'allocations.title': 'Where the Funds Go',
  'allocations.body':
    '100% of gifts support SHMS PTO programs for Stone Hill students, not the school district.',
  'sponsors.eyebrow': 'Thank you',
  'sponsors.title': 'Our sponsors',
  'sponsors.empty': 'Sponsor logos appear here when published in CMS.',
  'business.title': 'Business owners in the portal',
  'business.body':
    'Stone Hill families who run local businesses can share a listing in the member portal.',
}
