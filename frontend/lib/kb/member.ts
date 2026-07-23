import type { KbIndex } from './types'

/** Logged-in parent knowledge base — no Wix CMS required. */
export const MEMBER_KB: KbIndex = {
  audience: 'member',
  categories: [
    {
      id: 'account',
      title: 'Account & login',
      summary: 'Profile, sign-in email, free vs paid.',
      order: 1,
    },
    {
      id: 'students',
      title: 'Students',
      summary: 'Add, edit, and household records.',
      order: 2,
    },
    {
      id: 'membership',
      title: 'Membership',
      summary: 'Reef, Lagoon, Tide, and upgrades.',
      order: 3,
    },
    {
      id: 'cove',
      title: 'Store & Cove card',
      summary: 'Balance, family code, snack window, payments.',
      order: 4,
    },
    {
      id: 'programs',
      title: 'Programs & surveys',
      summary: 'Enrichment, calendar, and feedback forms.',
      order: 5,
    },
  ],
  articles: [
    {
      slug: 'update-my-account',
      title: 'How do I update My Account?',
      categoryId: 'account',
      summary: 'Edit display name and phone in the portal.',
      order: 1,
      body: `Open **My Account** and choose **Edit profile**. You can update your display name and phone number here.

Your sign-in email is your Wix login identity (often Google). Parents cannot change that email in the portal.

If you need help with the login email, email membership@shmspto.org.`,
    },
    {
      slug: 'free-or-paid',
      title: 'Am I free or paid?',
      categoryId: 'account',
      summary: 'What each account type can do.',
      order: 2,
      body: `**My Account** shows **Free parent account** or **Paid PTO membership**.

## Free
You can log in, add students, shop The Cove, and load a family Cove card.

## Paid
You purchased Reef, Lagoon, or Tide for the school year. Perks and store-card credit sync after checkout.

Refresh the portal after payment if your tier or credit has not appeared yet.`,
    },
    {
      slug: 'add-a-student',
      title: 'How do I add another student?',
      categoryId: 'students',
      summary: 'Register every student in your household.',
      order: 1,
      body: `Scroll to **My Students** and choose **Add a student**. Enter first name, last name, and grade (6, 7, or 8).

Add every student in your household so programs, The Cove balance, and messages stay tied to the right kids.`,
    },
    {
      slug: 'edit-student',
      title: 'How do I fix a student name or grade?',
      categoryId: 'students',
      summary: 'Edit student details from the student card.',
      order: 2,
      body: `Open the student card, choose **Edit student**, make your changes, and save.

Updates usually show within a few minutes. Refresh the portal if you still see the old info.`,
    },
    {
      slug: 'remove-student',
      title: 'Can I remove a student from my account?',
      categoryId: 'students',
      summary: 'Parents can add and edit; staff archives removals.',
      order: 3,
      body: `Parents can add and edit students in the portal.

To archive or remove a student, email membership@shmspto.org so staff can update the record safely.`,
    },
    {
      slug: 'reef-lagoon-tide',
      title: 'What are Reef, Lagoon, and Tide?',
      categoryId: 'membership',
      summary: 'Paid PTO membership levels for the school year.',
      order: 1,
      body: `Reef, Lagoon, and Tide are the paid PTO membership levels for the school year. Each tier includes different gift-card credit and member perks.

Start free anytime, then upgrade from **Membership** when you are ready.

After payment, refresh the portal so your tier and credit appear.`,
    },
    {
      slug: 'join-or-upgrade',
      title: 'How do I join or upgrade membership?',
      categoryId: 'membership',
      summary: 'Checkout with card or PayPal, then refresh.',
      order: 2,
      body: `Go to **Membership** (or **Upgrade** in this portal), pick Reef, Lagoon, or Tide, and complete checkout with card or PayPal.

When payment clears, return here and refresh. If credit or tier is still missing after a few minutes, email membership@shmspto.org with your receipt.`,
    },
    {
      slug: 'cove-card-balance',
      title: 'Where is my Cove card credit?',
      categoryId: 'cove',
      summary: 'Family balance and Payment History live in Store & Cove card.',
      order: 1,
      body: `Open **Store & Cove card**. Your family balance and **Payment History** show there.

Membership gift-card credit loads after purchase. Use **Load family card** anytime to add more.

First-load bonus (when offered) applies once; reloads are dollar-for-dollar.`,
    },
    {
      slug: 'family-cove-code',
      title: 'What is the family Cove code?',
      categoryId: 'cove',
      summary: 'The 6-digit code students give at the snack window.',
      order: 2,
      body: `In **Store & Cove card** you will see a 6-digit **Family Cove code**. Give that code to your student(s).

At the snack window they tell staff the code (or show the QR) so the family balance can be charged.

Reset the code anytime if it was shared or lost.`,
    },
    {
      slug: 'cove-snack-window',
      title: 'How does The Cove snack window work?',
      categoryId: 'cove',
      summary: 'Online balance + code; plastic card optional.',
      order: 3,
      body: `Online checkout creates the family Square balance and Cove code. Plastic cards are optional for faster tapping.

Until a physical card is issued, staff can look up your family by code at the register.

Spirit wear and other Cove merch checkout online separately with card or PayPal.`,
    },
    {
      slug: 'cove-coupons',
      title: 'Do paid members get Cove coupons?',
      categoryId: 'cove',
      summary: 'Look for the coupon bar when signed in.',
      order: 4,
      body: `Often yes. When you are signed in as a paid member, look for the coupon bar on The Cove shop or checkout.

If a code fails, wait a minute, refresh, and try again — or email membership@shmspto.org.`,
    },
    {
      slug: 'pay-card-or-paypal',
      title: 'Can I pay with a credit card or PayPal?',
      categoryId: 'cove',
      summary: 'Square card or PayPal for membership, Cove, and reloads.',
      order: 5,
      body: `Yes. Free and paid parents can pay with credit/debit (Square) or PayPal for membership, The Cove, and store-card reloads.

Saving a card with Square is optional for faster reloads. SHMS PTO never receives your full card number.`,
    },
    {
      slug: 'surveys',
      title: 'Where do surveys appear?',
      categoryId: 'programs',
      summary: 'Surveys stay on shmspto.org — never an outside link.',
      order: 1,
      body: `Active surveys list under **Surveys for you** on this portal.

You will get the same branded form by email, text, or WhatsApp — always on shmspto.org, never an outside link.`,
    },
    {
      slug: 'programs-calendar',
      title: 'Where do I see program schedules and messages?',
      categoryId: 'programs',
      summary: 'Calendar & Messages on your member portal home.',
      order: 2,
      body: `On the member portal home, open **Calendar & Messages**.

## Calendar
Upcoming program sessions and school events tied to your household appear here.

## Messages
Instructor and PTO messages for your students land in the same area. Refresh if something new just arrived.`,
    },
  ],
}
