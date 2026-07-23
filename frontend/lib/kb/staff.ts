import type { KbIndex } from './types'

/**
 * Logged-in staff knowledge base — native articles (no Wix, no Google jump for reading).
 * PayPal / Square / MoneyMinder / Bank of America stay separate treasurer/president logins.
 */
export const STAFF_KB: KbIndex = {
  audience: 'staff',
  categories: [
    {
      id: 'start',
      title: 'Getting started',
      summary: 'Login, roles, Quick Start, workspaces.',
      order: 1,
    },
    {
      id: 'parents',
      title: 'Helping parents',
      summary: 'Portal support, lookup, act-as, checklists.',
      order: 2,
    },
    {
      id: 'programs',
      title: 'Programs & events',
      summary: 'Enrichment, attendance, tickets, calendar.',
      order: 3,
    },
    {
      id: 'cove',
      title: 'The Cove & store',
      summary: 'Register, products, balances, discounts.',
      order: 4,
    },
    {
      id: 'comms',
      title: 'Inbox & outreach',
      summary: 'Gmail, Docs, memberships email, Facebook.',
      order: 5,
    },
    {
      id: 'admin',
      title: 'Site & admin',
      summary: 'Reports, site lists, money systems note.',
      order: 6,
    },
  ],
  articles: [
    {
      slug: 'staff-quick-start',
      title: 'Staff Portal Quick Start',
      categoryId: 'start',
      summary: 'Where to click on day one.',
      order: 1,
      body: `Sign in with your **@shmspto.org** Google account. Staff access is granted by a **StaffRoles** row — ask President/Treasurer if the Staff button is missing.

## First stops
- **Home** — your role workspaces and activity notices
- **Help** — this knowledge base
- **Inbox / My calendar / Docs** — Connect Google once, then work stays in Staff
- **The Cove** — register + products when you run the snack window

## Stay in Staff
Day-to-day tools open inside Staff. The only intentional exits for money ops are **PayPal**, **Square**, **MoneyMinder**, and **Bank of America** (Treasurer / President).`,
    },
    {
      slug: 'roles-login',
      title: 'Roles & @shmspto.org login',
      categoryId: 'start',
      summary: 'How StaffRoles map to tools you see.',
      order: 2,
      body: `Each board/staff person has a role (President, Treasurer, VP Events, Cove lead, and so on). The Staff shell only shows workspaces your role can use.

## Login rules
- Use the **@shmspto.org** Google identity tied to your StaffRoles email
- Personal Gmail will not unlock Staff even if you are on the board sheet
- After a role change, sign out and back in so permissions refresh

If tools are missing that your role should have, President/Treasurer can update StaffRoles.`,
    },
    {
      slug: 'year-project-board',
      title: 'Year project board',
      categoryId: 'start',
      summary: 'Track year goals inside Staff Projects.',
      order: 3,
      body: `Open **Projects** for the year board: initiatives, owners, and status.

Use it for cross-role work (fundraiser timeline, spirit drop, enrichment season) so the board is not chasing separate spreadsheets for the same list.

Update status when you finish a milestone so Home activity stays useful for everyone.`,
    },
    {
      slug: 'google-connect',
      title: 'Inbox, Calendar & Docs (Connect Google)',
      categoryId: 'comms',
      summary: 'One Connect — mail, calendar, and Drive stay in Staff.',
      order: 1,
      body: `Open **Inbox**, **My calendar**, or **Docs** and choose **Connect Google** if prompted. Use the same @shmspto.org account.

## After connect
- **Inbox** — read, reply, compose, folders
- **My calendar** — upcoming events with details in Staff
- **Docs** — open Drive files in an in-Staff embed

Reconnect if you see permission errors after a password reset. Purchase confirmation email can also use connected Gmail when configured.`,
    },
    {
      slug: 'helping-a-parent',
      title: 'Helping a parent in the portal',
      categoryId: 'parents',
      summary: 'Walk parents through free vs paid without leaving Staff.',
      order: 1,
      body: `Parents use **Member Portal** (not Staff). When they call or email:

## Checklist
1. Confirm they are signed in (same email they joined with)
2. **My Account** — free vs paid, phone/name
3. **My Students** — every child listed with correct grade
4. **Store & Cove card** — balance, family code, Payment History
5. **Calendar & Messages** — program info and inbox

Point them to **Member Help** (\`/member-portal/help\`) for full articles. For stuck records, use Lookup / act-as (admin) rather than guessing.`,
    },
    {
      slug: 'parent-portal-checklist',
      title: 'Parent portal checklist (free & paid)',
      categoryId: 'parents',
      summary: 'What free vs paid parents should see.',
      order: 2,
      body: `## Free parent
- Sign in, edit profile, add/edit students
- Load Cove card, shop Cove, see Payment History
- View programs/surveys available to free members

## Paid parent (Reef / Lagoon / Tide)
- Everything free has
- Membership tier badge and gift credit on the Cove card
- Member coupons when offered
- Paid-only program seats when the program requires membership

If paid perks are missing after checkout, have them refresh, then check Square/PayPal receipt and Memberships roster.`,
    },
    {
      slug: 'lookup-act-as',
      title: 'Lookup, act-as, archive',
      categoryId: 'parents',
      summary: 'Admin tools for support and cleanup.',
      order: 3,
      adminOnly: true,
      body: `**Lookup** finds a parent by email or name. Use it before changing student or card data.

**Act-as** opens the member portal as that parent so you can see exactly what they see. End act-as when finished — do not leave a session open on a shared computer.

**Archive** is for students or records that should leave the active roster without deleting history. Prefer archive over silent deletes.`,
    },
    {
      slug: 'programs-attendance',
      title: 'Programs — schedule, roster, attendance',
      categoryId: 'programs',
      summary: 'Run enrichment from Staff Programs.',
      order: 1,
      body: `Open **Programs** to edit schedule fields, seats, and rosters.

## Attendance
Use check-in / check-out for session dates. Medical notes appear for staff who need them on the roster view.

## Refunds & transfers
Process from the enrollment tools in Programs — do not invent off-system credits without Treasurer alignment.

Parents register on the public/member Programs flows; Staff owns capacity and day-of ops.`,
    },
    {
      slug: 'parent-enrichment-registration',
      title: 'Parent enrichment registration',
      categoryId: 'programs',
      summary: 'What parents see when claiming seats.',
      order: 2,
      body: `Parents enroll from **Programs** while signed in. Free vs paid rules follow the program settings (member-only seats, waitlist, capacity).

If a parent cannot enroll:
- Confirm sign-in and student grade
- Confirm the program is open and has seats
- Confirm membership requirement if the program is paid-only

Staff can adjust roster/waitlist from Programs when needed.`,
    },
    {
      slug: 'event-tickets',
      title: 'Event tickets',
      categoryId: 'programs',
      summary: 'Sell tickets on /events; manage from Staff Events.',
      order: 3,
      body: `Public tickets sell on **/events**. Staff **Events** manages listings, capacity, and ticket ops inside Staff.

Parents get purchase confirmation in portal messages (and email when Gmail send is connected).

Do not send parents to the old Wix Events dashboard for day-to-day work — stay in Staff.`,
    },
    {
      slug: 'cove-register',
      title: 'Cove register (sell snacks)',
      categoryId: 'cove',
      summary: 'Family code → full names → balance → charge.',
      order: 1,
      body: `Staff → **The Cove** → Cove register.

1. Student says what they want
2. Student gives the 6-digit family code — staff enters it
3. Confirm **full student names** and **Family Cove card balance**
4. Scan or tap products, then **Charge**

If there is no card yet, the parent must load online first. Plastic cards are optional; the code is enough.`,
    },
    {
      slug: 'cove-products-inventory',
      title: 'Cove products & inventory',
      categoryId: 'cove',
      summary: 'Add/restock products; advanced inventory when needed.',
      order: 2,
      body: `In **The Cove**, use **Cove products** to add items, prices, barcodes, and restock quantities.

Multiple staff can work products at once. Spirit wear stock is separate (Wix Stores / Cove shop merch), not the snack register catalog.

Use advanced inventory only when you need deeper stock tools — day-to-day is products + register.`,
    },
    {
      slug: 'discount-codes',
      title: 'Discount codes & spirit coupons',
      categoryId: 'cove',
      summary: 'Create and manage promo codes in Staff.',
      order: 3,
      need: 'discounts',
      body: `Open the discounts / coupons workspace your role can access.

Create codes for membership perks or spirit promotions. Test once as a signed-in paid member on The Cove before announcing widely.

If a parent code fails, have them refresh while signed in; then verify the code is active and not exhausted.`,
    },
    {
      slug: 'parent-inbox-messages',
      title: 'Parent inbox messages',
      categoryId: 'comms',
      summary: 'Messages parents see in Calendar & Messages.',
      order: 2,
      need: 'message',
      body: `Staff messaging tools post into the parent **Messages** area on the member portal.

Use clear subjects. Purchase confirmations also land here automatically after successful checkout.

Prefer portal messages + email for official notices so parents are not chased only on WhatsApp.`,
    },
    {
      slug: 'memberships-outreach',
      title: 'Memberships roster, mass email, WhatsApp',
      categoryId: 'comms',
      summary: 'Roster tools and outreach shares.',
      order: 3,
      need: 'membership',
      body: `**Memberships** shows paid/free roster status for outreach and support.

Mass email and WhatsApp share actions open the compose/share flow for that campaign. WhatsApp may leave Staff briefly to the WhatsApp app — that is intentional for sharing, not a second CMS.

Keep MoneyMinder / bank exports with Treasurer — do not duplicate finance ledgers in the roster.`,
    },
    {
      slug: 'facebook-from-staff',
      title: 'Facebook from Staff',
      categoryId: 'comms',
      summary: 'Marketing posts from the Staff Facebook tools.',
      order: 4,
      need: 'marketing',
      body: `Use the Staff Facebook workspace your role allows for page posts and scheduled marketing.

Do not post payment or private parent data. Link parents back to shmspto.org pages (events, Cove, membership) rather than off-site forms.`,
    },
    {
      slug: 'staff-reports',
      title: 'Staff Reports',
      categoryId: 'admin',
      summary: 'View, sort, and CSV export.',
      order: 1,
      body: `Open **Reports** for operational tables: sort columns and export CSV when you need a spreadsheet snapshot.

Use reports for counts and follow-ups. Official books stay in MoneyMinder / bank / Square dashboards for Treasurer.`,
    },
    {
      slug: 'site-lists',
      title: 'Site settings & lists',
      categoryId: 'admin',
      summary: 'Announcement, board, nav, FAQs, volunteers, fundraising…',
      order: 2,
      need: 'site',
      body: `Staff workspaces edit visitor-facing lists (announcement, board, nav, FAQs, volunteers, fundraising, tiers, wellness) without opening Wix for day-to-day copy.

Change one list at a time, save, then **View site** to confirm. Leave deep Wix Editor work to whoever owns theme-level changes.`,
    },
    {
      slug: 'purchase-confirmations',
      title: 'Purchase confirmations & portal messages',
      categoryId: 'admin',
      summary: 'What parents get after checkout.',
      order: 3,
      body: `Successful membership, Cove load, and ticket purchases create a parent portal message (and email when Gmail send is connected).

If a parent paid but sees nothing:
1. Confirm payment cleared in Square/PayPal
2. Ask them to refresh Member Portal → Messages / Payment History
3. Check Staff reports or Memberships roster
4. Escalate to Treasurer for payment-side mismatches`,
    },
    {
      slug: 'money-systems',
      title: 'PayPal, Square, MoneyMinder, Bank of America',
      categoryId: 'admin',
      summary: 'These stay separate logins on purpose.',
      order: 4,
      body: `Treasurer and President keep **separate** logins for:

- PayPal
- Square
- MoneyMinder
- Bank of America

Staff does not embed those consoles. Use them only for finance ops, then return to Staff for parent-facing and program work.`,
    },
  ],
}
