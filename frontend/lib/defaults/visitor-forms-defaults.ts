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

/** Newsletter page perks (left column). */

export const NEWSLETTER_PAGE_DEFAULTS: Record<string, string> = {
  'perks.title': "What you'll get",
  'perks.1.title': 'Event Reminders',
  'perks.1.body': 'Never miss Dance Night, NOVA Math, PTO meetings, or any school event.',
  'perks.2.title': 'Program Announcements',
  'perks.2.body': 'Be first to know when enrichment program registration opens.',
  'perks.3.title': 'Monthly Recap',
  'perks.3.body': "A concise summary of what happened and what's coming up next month.",
  'perks.4.title': 'Important Updates',
  'perks.4.body': 'School store news, fundraiser launches, and board announcements.',
  'perks.footer':
    'No spam. Unsubscribe at any time. We send 1 to 2 emails per month.',
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
  'hero.raisedVsSpent':
    'Raised is money in this school year. Spent below is money out so far — they will not match until year end.',
  'initiatives.eyebrow': 'By Initiative',
  'initiatives.title': 'Every Way You Can Help',
  'initiatives.body':
    'Memberships, Cove Digital Cards, event tickets, gifts, and volunteering. Cards below add up to Total Raised (volunteer hours are separate).',
  'allocations.eyebrow': 'Transparency',
  'allocations.title': 'Where the Funds Go',
  'allocations.body':
    'Spent so far this school year, by category. Unspent stays in the PTO bank account for instructor pay, restock, and events still ahead. 100% supports SHMS PTO programs for Stone Hill students, not the school district.',
  'allocations.unspentLabel': 'Still available (raised − spent to date)',
  'allocations.spentLabel': 'Spent to date',
  'sponsors.eyebrow': 'Thank you',
  'sponsors.title': 'Our sponsors',
  'sponsors.empty': 'Sponsor logos appear here when published in CMS.',
  'business.title': 'Business owners in the portal',
  'business.body':
    'Stone Hill families who run local businesses can share a listing in the member portal.',
}
