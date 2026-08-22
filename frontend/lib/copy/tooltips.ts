/**
 * Shared UX helper copy for SHMS and Pavilion.
 * Use with HelpTip. Never put these on disabled controls via title=.
 * No em/en dashes. Prefer real newlines.
 */

export const TOOLTIPS = {
  'membership.free.vs.paid':
    'A free account lets you add students and see the calendar.\nPaid tiers add card credit and program discounts.',
  'membership.tier.upgrade':
    'You pay the difference, not the full price again.\nYour current benefits stay active.',
  'checkout.card.security': 'Square handles the card. We never see or store the number.',
  'checkout.ambiguous.failure':
    'We could not confirm this payment. Check Member Portal before trying again so you are not charged twice.',
  'cove.card.what':
    'One prepaid balance for your family. Students spend it at the school store.',
  'cove.load.amount.invalid': 'Enter a whole dollar amount from $1 to $500.',
  'volunteer.account.required':
    'You need a free account to sign up.\nIt takes about 30 seconds and your answers are saved.',
  'contact.response.time': 'We reply within one business day during the school year.',
  'demo.preview.only': 'Preview only. This demo does not send mail or take payments.',
  'portal.household.confirm':
    'Confirm your family details so programs and the card unlock.\nThis takes about two minutes.',
  'portal.coparent.invite':
    'Invite the other parent and you both see the same students and balance.',
  'portal.session.expired': 'Your session expired. Log in again to pick up where you left off.',
  'portal.paymentmethods.why':
    'A saved card is only for reloads and optional auto top-off.\nRemove it any time.',
  'staff.send.preview': 'Counts who matches your filters.\nSends nothing. Always click this first.',
  'staff.send.gmail':
    'Real email to every matching parent.\nSends from your workspace mailbox.\nThere is no undo.',
  'staff.payments.needs':
    'The card was charged but the credit never landed.\nThe parent already paid.\nNever ask them to pay again.',
  'staff.budget.bank': 'Read only.\nWe can see transactions.\nWe can never move money.',
  'staff.roles.money.extra':
    'Payments and Budget are workspace grants only.\nThey do not grant the full Treasurer role.\nOnly tick for someone who handles money.',
  'staff.actas.confirm':
    "You will open this parent's portal as them.\nEdits should stay off. Exit when finished.",
} as const

export type TooltipKey = keyof typeof TOOLTIPS

export function tooltipCopy(key: TooltipKey): string {
  return TOOLTIPS[key]
}
