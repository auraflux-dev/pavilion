import type { KbIndex } from './types'

/** Logged-in parent knowledge base. No Wix CMS required. */
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
      title: 'Store & Cove Digital Card',
      summary: 'Balance, family code, snack window, payments.',
      order: 4,
    },
    {
      id: 'programs',
      title: 'Programs & surveys',
      summary: 'Enrichment, calendar, and feedback forms.',
      order: 5,
    },
    {
      id: 'videos',
      title: 'Parent videos',
      summary: 'Short guides for the website, portal, and membership.',
      order: 6,
    },
    {
      id: 'support',
      title: 'Get help',
      summary: 'Ask the PTO from the portal.',
      order: 7,
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

If you need help with the login email, use **Ask the PTO** on Member Help, or email vp-membershipexperience@shmspto.org.`,
    },
    {
      slug: 'free-or-paid',
      title: 'Am I free or paid?',
      categoryId: 'account',
      summary: 'What each account type can do.',
      order: 2,
      body: `**My Account** shows **Free parent account** or **Paid PTO membership**.

## Free
You can log in, add students, shop The Cove, and load a family Cove Digital Card.

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
      slug: 'invite-coparent',
      title: 'How do I add a spouse, co-parent, or guardian?',
      categoryId: 'students',
      summary: 'Invite another adult to the same kids with their own login.',
      order: 2,
      body: `On **My Students**, open **Household adults**.

This is for **any** second adult — married spouses, separated co-parents, or guardians with no parents on the account.

1. Enter their email → **Send invite**
2. They open the link, sign in (or create an account) with **that email**, then **Accept invite**
3. Both logins see the same students
4. Cove Digital Card stays with the **primary account holder** (whoever signed up first) unless they ask for a separate card

You can remove an adult anytime from Household adults.`,
    },
    {
      slug: 'edit-student',
      title: 'How do I fix a student name or grade?',
      categoryId: 'students',
      summary: 'Edit student details from the student card.',
      order: 3,
      body: `Open the student card, choose **Edit student**, make your changes, and save.

Updates usually show within a few minutes. Refresh the portal if you still see the old info.`,
    },
    {
      slug: 'remove-student',
      title: 'Can I remove a student from my account?',
      categoryId: 'students',
      summary: 'Parents can add and edit; staff archives removals.',
      order: 4,
      body: `Parents can add and edit students in the portal.

To archive or remove a student, use **Ask the PTO** on Member Help so staff can update the record safely.`,
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

When payment clears, return here and refresh. If credit or tier is still missing after a few minutes, use **Ask the PTO** on Member Help and include your receipt.`,
    },
    {
      slug: 'cove-card-balance',
      title: 'Where is my Cove Digital Card credit?',
      categoryId: 'cove',
      summary: 'Family balance and Payment History live in Store & Cove Digital Card.',
      order: 1,
      body: `Open **Store & Cove Digital Card**. Your family balance and **Payment History** show there.

Membership gift-card credit loads after purchase. Use **Load Cove Digital Card** anytime to add more.

First-load bonus (when offered) applies once; reloads are dollar-for-dollar.`,
    },
    {
      slug: 'family-cove-code',
      title: 'What is the family Cove code?',
      categoryId: 'cove',
      summary: 'QR, word passcode, or 6-digit backup at the snack window.',
      order: 2,
      body: `In **Store & Cove Digital Card** you will see:

1. **Photos QR** — best at Square Stand / the window
2. **Word passcode (new)** — easier to say (suggested from your last name + first letters of your first name)
3. **6-digit backup** — if the phone dies (paid member codes end in **9**)

Give your student the QR or the word passcode. Reset the 6-digit backup anytime if it was shared or lost.`,
    },
    {
      slug: 'cove-snack-window',
      title: 'How does The Cove snack window work?',
      categoryId: 'cove',
      summary: 'QR, word passcode, or 6-digit; Stand for guests.',
      order: 3,
      body: `Load the Cove Digital Card online first (portal → Store & Cove Digital Card).

At the snack window, your student shows the **Photos / Wallet QR**, says the **word passcode**, or the **6-digit backup**. Staff looks up the family, confirms names and balance, then charges snacks to the prepaid card.

Until a physical card is issued, the code or Wallet QR is enough.

No balance or no portal login? Staff can take a **card-present** sale on Square Stand (iPad) for that purchase. Reloads still happen online — Stand does not create a new family card.

Spirit wear and other Cove merch can also checkout online with card or PayPal.`,
    },
    {
      slug: 'cove-coupons',
      title: 'Do paid members get Cove coupons?',
      categoryId: 'cove',
      summary: 'Look for the coupon bar when signed in.',
      order: 4,
      body: `Often yes. When you are signed in as a paid member, look for the coupon bar on The Cove shop or checkout.

If a code fails, wait a minute, refresh, and try again, or use **Ask the PTO** on Member Help.`,
    },
    {
      slug: 'pay-card-or-paypal',
      title: 'Can I pay with a credit card or PayPal?',
      categoryId: 'cove',
      summary: 'Square card or PayPal for membership, Cove, and reloads.',
      order: 5,
      body: `Yes. Free and paid parents can pay with credit/debit (Square) or PayPal for membership, The Cove, and store-card reloads.

Saving a card is optional for faster reloads. SHMS PTO never receives your full card number.`,
    },
    {
      slug: 'surveys',
      title: 'Where do surveys appear?',
      categoryId: 'programs',
      summary: 'Surveys stay on shmspto.org. Never an outside link.',
      order: 1,
      body: `Active surveys list under **Surveys for you** on this portal.

You will get the same branded form by email, text, or WhatsApp. Always on shmspto.org, never an outside link.`,
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
    {
      slug: 'parent-videos',
      title: 'Where are the parent how-to videos?',
      categoryId: 'videos',
      summary: 'Member Portal → Videos, plus Help and key public pages.',
      order: 1,
      body: `Open **Videos** in the Member Portal menu for the full parent library (website tour, portal walkthrough, membership tiers, board).

The same clips also appear on Help and on matching public pages (Home, Membership, The Cove, Board).

Staff training videos are separate and stay in the Staff workspace.`,
    },
    {
      slug: 'ask-the-pto',
      title: 'How do I ask the PTO a question?',
      categoryId: 'support',
      summary: 'Use Ask the PTO on Member Help.',
      order: 1,
      body: `Open **Member Help** (or the Ask the PTO box on your portal home) and send a signed-in help request.

Your message goes to:
- **President**
- **VP Membership Experience**
- **VP Marketing**

They reply to your portal sign-in email. Browse the help articles first for quick answers.`,
    },
  ],
}
