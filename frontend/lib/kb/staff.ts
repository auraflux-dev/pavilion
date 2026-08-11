import type { KbIndex } from './types'

/**
 * Logged-in staff knowledge base. Native articles (no Wix, no Google jump for reading).
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
      summary: 'Onboarding, comms calendar, Gmail, Docs, email, WhatsApp, Facebook.',
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
      body: `Sign in with your **@shmspto.org** Google account. Staff access is granted by a **StaffRoles** row. Ask President/Treasurer if the Staff button is missing.

## First stops
- **Home**: role onboarding checklists (Marketing / Secretary / Treasurer), personal email, activity notices
- **Help**: this knowledge base
- **Inbox / Calendar / Docs**. Connect Google once, then work stays in Staff
- **Comms calendar**: plan parent / school / board messages and content
- **The Cove**: register + products when you run the snack window

## Stay in Staff
Day-to-day tools open inside Staff. The only intentional exits for money ops are **PayPal**, **Square**, **MoneyMinder**, and **Bank of America** (Treasurer / President).`,
    },
    {
      slug: 'roles-login',
      title: 'Roles, Staff login & personal parent email',
      categoryId: 'start',
      summary: 'Staff @shmspto.org hierarchy plus personal email for parent portal.',
      order: 2,
      body: `Each board/staff person has a role (President, Treasurer, VP Events, Cove lead, and so on). The Staff shell only shows workspaces your role can use.

## Login rules
- Sign in with your **@shmspto.org** board address (or your linked personal email once saved)
- Use the header tabs **Member** · **Staff** · **View site** to switch views without signing out
- On Staff **Home**, save your **personal email** once. Member view then loads that household (students, Cove). Must not be @shmspto.org
- After linking, either login works for both views
- After a role change, sign out and back in so permissions refresh
- **Admin** is only **president@shmspto.org** (Staff access UI and server enforce this)

If tools are missing that your role should have, President (\`president@\`) can update StaffRoles.`,
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
      summary: 'One Connect. Mail, calendar, and Drive stay in Staff.',
      order: 1,
      body: `Open **Inbox**, **Calendar**, or **Docs** and choose **Connect Google** if prompted. Use the same @shmspto.org account.

## After connect
- **Inbox**: read, reply, compose, folders
- **Calendar**: upcoming events with details in Staff
- **Docs**: open Drive files in an in-Staff embed

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
2. **My Account**: free vs paid, phone/name
3. **My Students**: every child listed with correct grade
4. **Store & Cove Digital Card**: balance, family code, Payment History
5. **Calendar & Messages**: program info and inbox

Point them to **Member Help** (\`/member-portal/help\`) for articles, or **Ask the PTO** on that page (emails President, VP Membership Experience, and VP Marketing). For stuck records, use Lookup / act-as (admin) rather than guessing.`,
    },
    {
      slug: 'parent-portal-checklist',
      title: 'Parent portal checklist (free & paid)',
      categoryId: 'parents',
      summary: 'What free vs paid parents should see.',
      order: 2,
      body: `## Free parent
- Sign in, edit profile, add/edit students
- Load Cove Digital Card, shop Cove, see Payment History
- View programs/surveys available to free members

## Paid parent (Reef / Lagoon / Tide)
- Everything free has
- Membership tier badge and gift credit on the Cove Digital Card
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

**Act-as** opens the member portal as that parent so you can see exactly what they see. End act-as when finished. Do not leave a session open on a shared computer.

**Archive** is for students or records that should leave the active roster without deleting history. Prefer archive over silent deletes.`,
    },
    {
      slug: 'programs-attendance',
      title: 'Programs. Schedule, roster, attendance',
      categoryId: 'programs',
      summary: 'Run enrichment from Staff Programs.',
      order: 1,
      body: `Open **Programs** to edit schedule fields, seats, and rosters.

## Attendance
Use check-in / check-out for session dates. Medical notes appear for staff who need them on the roster view.

## Refunds & transfers
Process from the enrollment tools in Programs. Do not invent off-system credits without Treasurer alignment.

Parents register on the public/member Programs flows; Staff owns capacity and day-of ops.`,
    },
    {
      slug: 'contractor-w9',
      title: 'Contractor W-9 and 1099 reminder',
      categoryId: 'programs',
      summary: 'Send a completed W-9 to the Treasurer if pay may exceed $600.',
      order: 2,
      body: `Paid instructors and other contractors: SHMS PTO may need to file **Form 1099** if your pay exceeds **$600 in a calendar year**.

## What to do
1. Download **Form W-9** from Staff → **Timesheets** (or open [/forms/fw9.pdf](/forms/fw9.pdf))
2. Complete the form
3. Email the finished PDF to **treasurer@shmspto.org** with subject like “W-9 for SHMS PTO contractor”

Do this before or with your first paid work. Keep a copy for your records. Timesheets still go to VP Programs for hour approval; tax forms go to the Treasurer.`,
    },
    {
      slug: 'parent-enrichment-registration',
      title: 'Parent enrichment registration',
      categoryId: 'programs',
      summary: 'What parents see when claiming seats.',
      order: 3,
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
      order: 4,
      body: `Public tickets sell on **/events**. Staff **Events** manages listings, capacity, and ticket ops inside Staff.

Parents get purchase confirmation in portal messages (and email when Gmail send is connected).

Do not send parents to the old Wix Events dashboard for day-to-day work. Stay in Staff.`,
    },
    {
      slug: 'cove-register',
      title: 'Cove register (window + events)',
      categoryId: 'cove',
      summary: 'Lookup family → confirm kids + balance → tap products → Charge.',
      order: 1,
      need: 'retail',
      body: `Staff → **The Cove** → Cove register (laptop or tablet). Same tool at the **snack window** and at **event tables** when you are charging a prepaid Cove Digital Card.

**Member with a loaded Cove Digital Card**
1. Ask what they want
2. Get identity: Wallet / Photos QR, spoken **6-digit family code**, or long Square GAN
3. Enter / paste into **Scan QR / GAN or 6-digit backup** → Lookup
4. Confirm **student full names** and **balance** on screen
5. Tap product tiles (deals first), adjust qty, then **Charge**
6. Hand over the item — balance updates on the family card

**Not enough balance** — stop Charge; parent loads online, or take a **guest** sale on Square Stand (card present).

**No card / guest / spirit pop-up** — do not invent a code. Use Square Stand (see **In-person sales + Square Stand**).

Prefer the Staff register for prepaid digital-card redemptions so inventory and reports stay in sync.`,
    },
    {
      slug: 'cove-in-person-square-stand',
      title: 'In-person sales + Square Stand (window & events)',
      categoryId: 'cove',
      summary: 'Snacks on register + spirit wear on Stand (window & events).',
      order: 2,
      need: 'retail',
      body: `Use **two devices** at the Cove snack window **and** at spirit / event tables:

1. **Laptop / tablet** → Staff → **The Cove** register (**Lane A** — snacks & candy on prepaid digital card)
2. **iPad + Square Stand** → (**Lane B** — spirit wear with sizes, guests, card-present merch)

### Lane A — Snacks / candy on prepaid Cove Digital Card
Parent already loaded the card online.

- Show **Wallet** QR / Photos QR or say the **6-digit family code**
- Staff register: lookup → confirm names + balance → tap snack tiles → **Charge**
- Or Stand gift-card scan when redeeming a Wallet QR as a Square gift card

Never also run a credit card on Stand for the same snack items.

### Lane B — Spirit wear + guests (Square Stand)
**Spirit wear** (shirts, hoodies, hats, sized merch) and anyone **without** a loaded Cove card:

1. Wake Stand on the SHMS PTO location
2. Confirm size / item, then ring as a normal card-present sale
3. Hand over the item

Do **not** also **Charge** those spirit items on the Staff snack register.

Stand does **not** create a family Cove account. Online spirit orders also live on **/cove** → Stingrays Pride.

### Events — paid-member refreshments
Many paid memberships include free food / tickets at PTO events.

1. Show the **6-digit Family Cove code**
2. Paid member codes **end in 9** (confirm on Staff lookup if unsure)
3. Record the code if the event lead requires it → hand tickets
4. Do **not** charge Lane A/B for the free perk; extras go on Stand

### Setup (window or event table)
- Staff logged in as cove@ (or retail) → The Cove loads
- Square Stand online, correct location
- Brief volunteers: two lanes, never charge twice

### Troubleshooting
| Issue | What to do |
|-------|------------|
| Code not found | Confirm 6 digits; paid codes end in **9**; need portal + card |
| Balance too low | Reload online, or Lane B Stand for that sale |
| Wallet QR will not scan | Type 6-digit backup on Staff register |
| Parent charged twice | Stop. Email treasurer@ |
| Stand offline | Staff register still works for Lane A if laptop is online |

Longer guide: docs/COVE-IN-PERSON.md

**Training video:** step-by-step walkthrough (~2 min) — \`~/Downloads/SHMSPTO_WATCH_THIS_staff_cove_inperson_16x9.mp4\`.`,
    },
    {
      slug: 'cove-products-inventory',
      title: 'Cove products & inventory',
      categoryId: 'cove',
      summary: 'Add/restock products; advanced inventory when needed.',
      order: 3,
      body: `In **The Cove**, use **Cove products** to add items, prices, barcodes, and restock quantities.

Multiple staff can work products at once. **Spirit wear** stock is separate (Wix Stores / Cove shop merch + Square Stand items) — not the snack register catalog. In person, sell spirit on **Square Stand**; browse online under **/cove → Stingrays Pride**.

Use advanced inventory only when you need deeper stock tools. Day-to-day is products + register.`,
    },
    {
      slug: 'discount-codes',
      title: 'Discount codes & spirit coupons',
      categoryId: 'cove',
      summary: 'Create and manage promo codes in Staff.',
      order: 4,
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

Mass email and WhatsApp share actions open the compose/share flow for that campaign. WhatsApp may leave Staff briefly to the WhatsApp app. That is intentional for sharing, not a second CMS.

Keep MoneyMinder / bank exports with Treasurer. Do not duplicate finance ledgers in the roster.`,
    },
    {
      slug: 'role-onboarding',
      title: 'Role onboarding (all staff roles)',
      categoryId: 'start',
      summary: 'First-week checklists on Staff Home for every staff role except president@.',
      order: 4,
      body: `Staff **Home** shows a role onboarding checklist for your StaffRoles (marketing, secretary, treasurer, events, programs, retail, membership, wellness, instructor, coordinator). **Admins** see every track. **president@shmspto.org** is skipped.

## How it works
1. Open each step’s workspace (or external money tool for Treasurer)
2. Click **Mark done** when finished
3. Personal email and Google Connect auto-check when already set
4. When every step is done, the card collapses to “Role onboarding complete”

Progress is saved on your StaffRoles row so it follows you across devices.

## Tracks
- **VP Marketing** — Google, Projects, Comms, Canva folder, Social, Newsletter, page copy, surveys
- **Secretary** — Minutes, Comms, Board roster, Events, Newsletter
- **Treasurer** — Payments, Expenses, Reports, MoneyMinder, Square
- **Events / Programs / Retail / Membership / Wellness / Instructor / Coordinator** — role-specific workspaces

See Drive doc **47 - Staff Role Onboarding** for the board-facing guide.`,
    },
    {
      slug: 'comms-calendar',
      title: 'Comms calendar',
      categoryId: 'comms',
      summary: 'Plan content and track sends to parents, school, and board.',
      order: 4,
      body: `Open **Comms & content** for the shared month calendar.

## Two planners
- **Communications** — email, WhatsApp, meetings to parents / school / board
- **Content planner** — social posts, flyers, portal content

## Views
- **Month** — real calendar grid; click a day to schedule
- **Agenda** — week list

## How to use it
1. Pick Communications or Content planner
2. Click a day on the month grid (or use Agenda)
3. Add title, draft, audience(s), channel, and status
4. Attach a Canva/Doc/Drive link
5. When ready to send, open Newsletter / WA or Social — those tools still publish
6. Click **Mark published** after the send

Projects also has a **Calendar** tab for tasks by due date.

This is the schedule of record. It does not auto-send mail or posts.`,
    },
    {
      slug: 'facebook-from-staff',
      title: 'Facebook from Staff',
      categoryId: 'comms',
      summary: 'Marketing posts from the Staff Facebook tools.',
      order: 5,
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
      body: `Successful membership, Cove load, ticket, donation, and shop purchases create a parent portal message (and email when Gmail send is connected). The same checkout also emails **vp-membershipexperience@shmspto.org**, **president@shmspto.org**, **treasurer@shmspto.org**, **cove@shmspto.org** (Cove Coordinator), and **vp-sales@shmspto.org** (VP Digital & Retail Sales) a staff sale alert (includes shirt size / magnet / refreshments notes when membership).

If a parent paid but sees nothing:
1. Confirm payment cleared in Square/PayPal
2. Ask them to refresh Member Portal → Messages / Payment History
3. Check Staff reports or Memberships roster
4. Escalate to Treasurer for payment-side mismatches

## Physical perks (shirt & magnet)
- **Shirt size** is required at Lagoon/Tide checkout and appears in Staff → Fulfillments.
- **Magnet** is queued for Reef/Tide; no mailing address yet (3PL later).
- Tell parents: pick up at **Open House on August 13**, or email **vp-membershipexperience@shmspto.org** to coordinate pickup.
- Mark fulfilled in Staff → Fulfillments after handout.

## Free food & refreshments at PTO events
- Paid parent tiers (Reef / Lagoon / Tide) get this perk.
- Family Cove **6-digit codes for paid members always end in 9** (free accounts never do).
- At food trucks / tables: parent shows the 6-digit code → volunteer checks it ends in 9 (or looks up on Cove register) → record the code → hand refreshment tickets.
- Portal Membership benefits also shows the code for paid members.`,
    },
    {
      slug: 'refunds-cancellations',
      title: 'Refunds & cancellations (online purchases)',
      categoryId: 'admin',
      summary: 'Square/PayPal money plus CMS or fulfill steps by product type.',
      order: 4,
      body: `Online checkout (Square or PayPal) does **not** auto-refund. Treasurer/President refunds money in **Square** (or PayPal). Staff then fix the matching record so seats, tickets, and balances stay accurate.

Default contact for money issues: **treasurer@shmspto.org** (cc spiritwear or programs lead when relevant).

## Wrong card or duplicate charge (any purchase)
1. Find the payment in Square/PayPal (amount, time, last4)
2. Refund that payment
3. Fix product state below if the order was real or already fulfilled
4. Email the parent what was refunded and what happens next

Square may keep a small processing fee on refunds. That is normal.

## By purchase type

### Spirit wear / Cove merchandise (online product)
- **Before ship / pickup:** refund in Square; cancel any fulfill/ship request
- **After ship:** usually no full refund (exchange or partial minus shipping, board policy)
- Staff also updates notes on the Payments row when useful
- In-person Cove snack sales are register/store-card, not this flow

### Family Cove Digital Card (store-card load)
- Refund in Square **and** remove the same load from the family gift card balance
- Never refund cash/credit and leave the loaded dollars on the card

### Membership
- **Non-refundable** once payment processes, except when required by law or the PTO cancels the membership benefit before it begins
- Store-card credit bundled with membership follows Cove Digital Card rules, not membership donation rules

### Enrichment programs
- Parent can **Request refund** in the member portal
- Staff **Approve refund** in Programs (marks enrollment Refunded; may free a seat / promote waitlist)
- Then Treasurer processes the Square/PayPal refund
- Missed classes, weather, or dismissal for conduct are generally **not** refunded unless the board announces otherwise
- Waitlist: if no seat opens, refund the paid waitlist fee when policy says so

### Event tickets
- No parent self-serve refund button today
- Parent emails staff/treasurer; staff refunds in Square/PayPal
- If the sale is voided, adjust sold count / capacity so tickets are not oversold
- Prefer a clear cutoff (example: no refunds after purchase, or only before a posted date). Follow whatever the event flyer states

## Quick checklist
1. Confirm payment cleared (Square/PayPal)
2. Decide refund vs deny per policy above
3. Refund money in Square/PayPal when approved
4. Update enrollment / ticket / card / ship status
5. Reply to the parent in portal message or email

## Related
- Staff Help → **Purchase confirmations & portal messages**
- Staff Help → **PayPal, Square, MoneyMinder, Bank of America**
- Public membership terms and enrichment waiver on the site`,
    },
    {
      slug: 'money-systems',
      title: 'PayPal, Square, MoneyMinder, Bank of America',
      categoryId: 'admin',
      summary: 'These stay separate logins on purpose.',
      order: 5,
      body: `Treasurer and President keep **separate** logins for:

- PayPal
- Square
- MoneyMinder
- Bank of America

Staff does not embed those consoles. Use them only for finance ops, then return to Staff for parent-facing and program work.`,
    },
  ],
}
