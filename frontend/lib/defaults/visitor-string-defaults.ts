/** Visitor site strings beyond home-strings (per-page PageContent keys). */

export const VISITOR_VIDEO_DEFAULTS: Record<string, string> = {
  'video.membership.eyebrow': 'Watch',
  'video.membership.title': 'Membership tiers in about 3 minutes',
  'video.membership.body': 'Reef, Lagoon, and Tide explained before you choose a plan.',
  'video.board.eyebrow': 'Watch',
  'video.board.title': 'Thinking about joining the board?',
  'video.board.body': 'A short look at why parents volunteer and how to get involved.',
  'video.cove.eyebrow': 'Watch',
  'video.cove.title': 'See how the Cove Digital Card works',
  'video.cove.body':
    'Load credit online, show your QR at the snack window, and shop spirit wear.',
  'video.portal.eyebrow': 'Watch',
  'video.portal.title': 'Parent videos',
  'video.portal.body': 'Short guides for the member portal, Cove, and programs.',
}

export const DONATE_FORM_DEFAULTS: Record<string, string> = {
  'donate.chooseAmount': 'Choose an amount',
  'donate.other': 'Other',
  'donate.amountLabel': 'Amount ($)',
  'donate.amountPlaceholder': 'Enter any amount',
  'donate.noteLabel': 'Optional note',
  'donate.notePlaceholder': 'Add a note if you like',
  'donate.signIn': 'Sign in to donate',
  'donate.taxNote':
    'Stone Hill Middle School PTO is a 501(c)(3) nonprofit. Donations may be tax deductible.',
  'donate.thankYou': 'Thank you for supporting SHMS PTO.',
  'donate.defaultTitle': 'Donate to the PTO',
  'donate.defaultEyebrow': 'Support SHMS PTO',
  'donate.defaultBody':
    'Any amount helps fund enrichment, The Cove, and events for Stone Hill students.',
  'donate.giftNote':
    'Gifts go to SHMS PTO (501(c)(3)), not Loudoun County Public Schools. You will receive a receipt. Consult your tax advisor about deductibility.',
  'donate.amountError': 'Enter an amount between ${min} and ${max}.',
  'donate.button': 'Donate ${amount}',
  'donate.checkoutTitle': 'PTO Donation',
  'donate.thanksComplete': 'Thank you. Your ${amount} donation is complete.',
  'donate.fundraisingTitle': 'Make a gift to SHMS PTO',
  'donate.fundraisingBody':
    'Choose any amount. Your gift goes to the PTO: enrichment, The Cove, teacher support, and events for Stone Hill students. Not a donation to the school district.',
  'donate.membershipTitle': 'Not joining a paid tier? You can still donate',
  'donate.membershipBody':
    'Reef, Lagoon, and Tide are optional. If paid membership is not for you right now, any gift still helps the PTO fund enrichment, The Cove, and events for Stone Hill students.',
}

export const RFC_DEFAULTS: Record<string, string> = {
  'rfc.earlyBirdBadge': 'Early bird through Aug 15 · Race day Sun Sep 13',
  'rfc.raceDayBadge': 'Race day · Sunday Sep 13',
  'rfc.eyebrow': 'Community event',
  'rfc.title': 'Run for Charity 1K & 5K',
  'rfc.body':
    'Best Runners hosts the race. Our register link applies school code SHMS so Stone Hill receives 100% of your registration fee.',
  'rfc.register': 'Register on Best Runners',
  'rfc.flyer': 'Download flyer',
  'rfc.details': 'Full event details',
  'rfc.registerHint': 'Tap register. Best Runners fills in SHMS for you.',
  'rfc.flyerTap': 'Official flyer · tap to register on Best Runners',
  'rfc.raceDayHeading': 'Race day',
  'rfc.raceDate': 'Sunday, Sep 13, 2026',
  'rfc.raceLocation': 'Rock Ridge High School · Ashburn',
  'rfc.raceDetails': '1K & 5K · medal, race shirt, post-race snacks',
  'rfc.pricingHeadingEarly': 'Early bird pricing',
  'rfc.pricingHeading': 'Registration pricing',
  'rfc.earlyBirdLine': 'Adults $25 · Kids $15 · through Aug 15',
  'rfc.afterEarlyBird': 'After Aug 15: Adults $30 · Kids $20',
  'rfc.standardLine': 'Adults $30 · Kids $20',
}

/** Nav + footer chrome (global site shell). */
export const SITE_CHROME_DEFAULTS: Record<string, string> = {
  'nav.more': 'More',
  'nav.memberPortal': 'Member Portal',
  'nav.portalShort': 'Portal',
  'nav.help': 'Help',
  'nav.logIn': 'Log in',
  'nav.join': 'Join',
  'nav.staff': 'Staff',
  'nav.staffWorkspace': 'Staff workspace',
  'nav.opening': 'Opening…',
  'footer.tagline':
    'Enriching the academic and social experience for all SHMS PTO students and families in Ashburn, Virginia.',
  'footer.taglineDemo': '{school} in {town}. Membership, {store}, and the family portal.',
  'footer.quickLinks': 'Quick Links',
  'footer.contactUs': 'Contact Us',
  'footer.president': 'President',
  'footer.getDirections': 'Get Directions',
  'footer.stayConnected': 'Stay Connected',
  'footer.newsletterBlurb':
    'Subscribe to our newsletter for the latest updates, event announcements, and PTO news delivered to your inbox.',
  'footer.emailLabel': 'Email address',
  'footer.emailPlaceholder': 'Your email address',
  'footer.subscribe': 'Subscribe to Newsletter',
  'footer.subscribing': 'Subscribing…',
  'footer.thanksTitle': 'Thanks for subscribing!',
  'footer.thanksBody': "You'll receive our next newsletter soon.",
  'footer.privacy': 'Privacy',
  'footer.terms': 'Terms',
  'footer.dataSecurity': 'Data security',
  'footer.photoRelease': 'Photo release',
  'footer.whatsappTitle': 'WhatsApp Parent Groups',
  'footer.whatsappJoin': 'Join Here',
  'footer.gradeParents': '{grade} Grade Parents:',
  'announcement.grade6': '6th Grade',
  'announcement.grade7': '7th Grade',
  'announcement.grade8': '8th Grade',
}

export const CURRICULUM_PAGE_DEFAULTS: Record<string, string> = {
  'index.eyebrow': 'Share by email',
  'index.title': 'Program curricula',
  'index.body':
    'Curriculum only. No registration copy.\nOpen a program, then Print / save PDF, or paste the link in your email.',
  'doc.subtitle': 'Twelve weekly sessions. Curriculum only.',
  'doc.print': 'Print / save PDF',
  'doc.footer': 'Stone Hill Middle School PTO enrichment · www.shmspto.org',
  'season.fall-2026': 'Fall 2026',
  'season.spring-2027': 'Spring 2027',
}

export const LEGAL_SHELL_DEFAULTS: Record<string, string> = {
  'legal.eyebrow': 'SHMS PTO Legal',
  'legal.lastUpdated': 'Last updated:',
}

export const SURVEY_DEFAULTS: Record<string, string> = {
  'survey.eyebrow': 'SHMS PTO',
  'survey.thankYou': 'Thank you!',
  'survey.submit': 'Submit',
  'survey.error': 'Could not submit. Please try again.',
}
