/** Member portal form + panel copy (PageContent page: portal-forms). */

export const PORTAL_FORM_DEFAULTS: Record<string, string> = {
  // Edit account
  'editProfile.cta': 'Edit profile',
  'editProfile.title': 'Edit your profile',
  'editProfile.firstName': 'First name',
  'editProfile.lastName': 'Last name',
  'editProfile.phone': 'Mobile phone (optional, 10 digits)',
  'editProfile.emailHint': 'Sign-in email: {email} (contact the PTO to change)',
  'editProfile.save': 'Save',
  'editProfile.cancel': 'Cancel',
  'editProfile.saved': 'Saved',
  'editProfile.errorSave': 'Could not save. Please try again.',
  'editProfile.successBanner': 'Your profile was saved.',

  // Edit student
  'editStudent.trigger': 'Edit student',
  'editStudent.firstName': 'First name',
  'editStudent.lastName': 'Last name',
  'editStudent.grade': 'Grade',
  'editStudent.safetyHeading': 'Safety & pick-up (required for enrichment)',
  'editStudent.safetyIncomplete': 'Safety profile incomplete. Fill the fields below.',
  'editStudent.allergyPrefix': 'Allergy:',
  'editStudent.parentPhone': 'Parent phone',
  'editStudent.secondaryPhone': 'Secondary phone (optional)',
  'editStudent.emergencyContact': 'Emergency contact name',
  'editStudent.emergencyPhone': 'Emergency phone',
  'editStudent.allergies': 'Allergies',
  'editStudent.allergiesPlaceholder': 'e.g. EpiPen',
  'editStudent.medical': 'Medical conditions / accommodations',
  'editStudent.medications': 'Medications (optional)',
  'editStudent.pickup': 'Authorized pick-up list',
  'editStudent.pickupPlaceholder': 'Names of people who may pick up',
  'editStudent.selfRelease': 'Allow self-release after class (7th/8th, if program permits)',
  'editStudent.save': 'Save',
  'editStudent.cancel': 'Cancel',
  'editStudent.errorNames': 'Enter first and last name.',
  'editStudent.errorGrade': 'Select a grade.',
  'editStudent.errorSave': 'Could not save. Please try again.',
  'editStudent.errorNoStudent': 'Save did not return updated student. Please refresh and try again.',

  // Add student validation (labels come from portal-hub)
  'addStudent.errorNames': 'Enter first and last name.',
  'addStudent.errorGrade': 'Select a grade.',
  'addStudent.gradeHint': 'Select a grade, then tap Add student.',
  'addStudent.errorNoStudent': 'Student was not returned after save. Please refresh and try again.',

  // Confirm family
  'confirmFamily.title': 'Confirm your family details',
  'confirmFamily.bodyWithStudents':
    'We found {count} student(s) on your account. Confirm or update the details below once. This unlocks the Cove Digital Card for your family.',
  'confirmFamily.bodyNoStudents': 'Add a student first, then confirm these details to unlock Cove.',
  'confirmFamily.sectionParent': 'Parent / guardian',
  'confirmFamily.sectionEmergency': 'Emergency & pick-up (applies to all students)',
  'confirmFamily.parentFirstName': 'First name',
  'confirmFamily.parentLastName': 'Last name',
  'confirmFamily.parentPhone': 'Parent phone',
  'confirmFamily.emergencyContact': 'Emergency contact name',
  'confirmFamily.emergencyPhone': 'Emergency phone',
  'confirmFamily.pickup': 'Who may pick up (names)',
  'confirmFamily.submit': 'Confirm and unlock Cove',
  'confirmFamily.submitSaving': 'Saving…',
  'confirmFamily.errorNames': 'Enter parent first and last name.',
  'confirmFamily.errorPhone': 'Enter a parent phone number.',
  'confirmFamily.errorEmergency': 'Enter emergency contact name and phone.',
  'confirmFamily.errorPickup': 'List who may pick up your student.',
  'confirmFamily.errorNoStudents': 'Add a student first, then confirm family details.',
  'confirmFamily.errorSave': 'Could not save. Please try again.',
  'confirmFamily.successBanner':
    'Family details confirmed.\nCove Digital Card is unlocked for your household.',

  // Dashboard extras
  'dashboard.sessionExpired':
    'Your session expired or could not load. Sign in again to continue.',
  'dashboard.signInAgain': 'Sign in again',
  'dashboard.retry': 'Retry',
  'dashboard.paidThanks': 'Thanks for supporting SHMS PTO.',
  'dashboard.upgradeLagoonTide': 'Upgrade to Lagoon or Tide',
  'dashboard.upgradeTide': 'Upgrade to Tide',
  'dashboard.badgeProgram': 'Program',
  'dashboard.badgeEvent': 'Event',
  'dashboard.coveGateError': 'Complete family setup first.',
  'dashboard.whatsappSingle': 'Join the {grade} WhatsApp for reminders and PTO updates.',

  // Onboarding
  'onboarding.completeTitle': "You're set up",
  'onboarding.completeBody':
    'Student profiles are complete. Cove Digital Card and programs are unlocked.',
  'onboarding.titlePrefix': 'Family setup checklist',
  'onboarding.titleSuffix': 'required',
  'onboarding.intro':
    'You can browse anytime. Cove QR, card loads, and enrichment stay locked until you confirm family details (parent name, phone, emergency contact, pick-up).',
  'onboarding.coveLocked': 'The Cove Digital Card is locked until setup is complete',
  'onboarding.lockedHint': 'Confirm family details to unlock Cove Digital Card.',

  // Dashboard help + WhatsApp
  'dashboard.helpTitle': 'Member Help',
  'dashboard.helpBody': 'Ask a question here, or open the full knowledge base.',
  'dashboard.helpKbLink': 'Knowledge base',
  'dashboard.whatsappJoinGrade': 'Join {grade}',
  'invite.title': 'Share portal access',
  'invite.loading': 'Loading shared logins…',
  'invite.email': 'Spouse, co-parent, or guardian email',
  'invite.confirmEmail': 'Type that email again to confirm',
  'invite.submit': 'Send invite',
  'invite.revokeConfirm': 'Remove this login link? They will lose portal access.',
  'invite.linkLabel': 'Invite link (share if email is slow)',
  'invite.sending': 'Sending…',
  'invite.refreshing': 'Updating list…',
  'invite.emailHint':
    'They get their own login for the same students.\nWe email this exact address. A mistype bounces.',
  'invite.copied': 'Copied',
  'invite.copyLink': 'Copy link',
  'invite.remove': 'Remove',
  'invite.empty':
    'No shared logins yet.\nInvite a spouse, co-parent, or guardian so both see the same students.',

  // Help form
  'helpForm.title': 'Ask the PTO',
  'helpForm.body':
    'We route your note to the right board member. Replies go to your sign-in email.',
  'helpForm.topic': 'Topic',
  'helpForm.question': 'Your question',
  'helpForm.placeholder': 'Describe what you need help with…',
  'helpForm.submit': 'Send help request',
  'helpForm.submitting': 'Sending…',
  'helpForm.successTitle': 'Message sent',
  'helpForm.successBody': 'Thanks. A board member will reply to your sign-in email.',
  'helpForm.askAnother': 'Ask another question',
  'helpForm.errorShort': 'Add a few more words so we can help.',

  // Payment methods page
  'paymentPage.eyebrow': 'Member portal',
  'paymentPage.title': 'Payment methods',
  'paymentPage.body':
    'Saved cards and PayPal for Cove Digital Card reloads and auto top-off. Square handles card data. PayPal stays on PayPal.',
  'paymentPanel.title': 'Cards and PayPal on file',
  'paymentPanel.loading': 'Loading…',
  'paymentPanel.addCard': 'Add a card',
  'paymentPanel.noCard': 'No card saved yet. Add one for faster reloads.',
  'paymentPanel.noCardBody':
    'Enter a debit or credit card here.\nSquare stores it for later checkouts.\nThis does not charge you.',
  'paymentPanel.saveCard': 'Save card',
  'paymentPanel.saving': 'Saving…',
  'paymentPanel.remove': 'Remove',
  'paymentPanel.paypal': 'PayPal',
  'paymentPanel.removeCardConfirm':
    'Remove this saved card and turn off auto top-off for all students?',
  'paymentPanel.removePaypalConfirm': 'Remove this saved PayPal from Payment methods?',
  'paymentPanel.intro':
    'Square stores your card securely for Cove reloads, membership, spirit wear, and enrichment.\nSave a card or PayPal here for one-tap checkout.\nSHMS PTO never keeps the full card number.',
  'paymentPanel.unavailable':
    'Card-on-file setup is temporarily unavailable. You can still pay by entering a card or using PayPal at checkout.',
  'paymentPanel.loadingCardForm': 'Loading card form…',
  'paymentPanel.paypalSaveIntro':
    'Save PayPal here for one-tap checkout.\nOr check “Save this PayPal…” the next time you pay with PayPal.',
  'paymentPanel.paypalLoading': 'Loading PayPal…',
  'paymentPanel.paypalUnavailable': 'PayPal save is temporarily unavailable.',
  'paymentPanel.cardSaved': 'Card saved for faster checkout.',
  'paymentPanel.cardRemoved': 'Saved card removed. Auto top-off was turned off.',
  'paymentPanel.paypalRemoved': 'Saved PayPal removed.',
}
