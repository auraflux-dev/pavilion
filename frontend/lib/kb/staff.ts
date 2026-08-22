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
      summary: 'Reports, Budget, site lists, money systems note.',
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
- **Inbox / Calendar / Docs**: Connect Google once, then work stays in Staff
- **Comms calendar**: plan parent / school / board messages and content
- **Newsletter**: paid email and Weekly Scoop. Open Help → **Member newsletter (for Diane)**
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

If tools are missing that your role should have, President (\`president@\`) can update StaffRoles.

After creating users in Google Admin, open **Staff → Access → Sync from Google Workspace** so seats appear before first login. Assign roles there.`,
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
      body: `Open **Programs** to edit schedule fields, seats, rosters, and **Paid members only until** (priority registration window before general open).

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
      body: `Parents enroll from **Programs** while signed in. Free vs paid rules follow the program settings (paid-member priority window, waitlist, capacity).

**Paid-member priority:** On each program, Staff can set **Paid members only until** (datetime). While registration is open and that time is still in the future, only paid PTO members (Reef / Lagoon / Tide / faculty) can enroll. After that time (or if the field is blank), any signed-in parent can enroll.

If a parent cannot enroll:
- Confirm sign-in and student grade
- Confirm the program is open and has seats
- If they see “paid members only,” check the priority-until time or ask them to upgrade

Staff can adjust roster/waitlist from Programs when needed.`,
    },
    {
      slug: 'event-tickets',
      title: 'Event tickets',
      categoryId: 'programs',
      summary: 'Sell tickets on /events; manage from Staff Events.',
      order: 4,
      body: `Public tickets sell on **/events**: Staff **Events** manages listings, capacity, and ticket ops inside Staff.

Parents get purchase confirmation in portal messages (and email when Gmail send is connected).

Do not send parents to the old Wix Events dashboard for day-to-day work. Stay in Staff.`,
    },
    {
      slug: 'cove-in-person-manual',
      title: 'Cove in-person transactions manual',
      categoryId: 'cove',
      summary: 'Stand owns all in-person tenders including Cove PIN/passcode Card on File; portal pickup unchanged.',
      order: 1,
      need: 'retail',
      body: `# Cove in-person transactions

**Sell first. One payment lane per sale. Never charge twice.**
Printable: **/staff/in-person**

**Out** = Square Stand. **In** = portal/site (parent pays; Staff pickup only). Preferring portal in person is fine.

## How are they paying?

| Paying with… | Do this |
|--------------|---------|
| Cash or card / wallet | **Stand** → Cash or Card → stop |
| Cove **Photos QR** | **Stand** → Gift card → scan → stop |
| Cove **6-digit or word passcode** | **Stand** → search Customer → **Card on File** → stop |
| Unable to load cards | No Cove load yet: cash/card, or Staff Charge Cove backup |
| Portal already paid | **Today's store pickups** → Handed out |
| Zelle / PayPal / phone (no Stand) | Staff → **External** |
| Code ends in **9** | Lagoon/Tide free food ticket · no charge |
| Reef wants food | Lookup 6-digit / passcode → ring **BTSN food truck ticket** ($6 each, SKU POS-REFRESH) → deduct Cove → hand ticket |
| Guest / non-member wants food | They pay the truck. Do not ring Stand. |
| Membership | **Portal only** |

## Stand Cove (passcode / PIN)
1. Ring items
2. Search Customer by **6-digit** or **passcode**
3. Charge → **Card on File** → gift card
4. Stop. Do not also Charge Cove in Staff

They must have loaded Cove in the portal at least once.

## Staff backup
Charge Cove only if Stand Card on File fails. External if Stand is down. Pickups for portal-paid orders.

## Double-charge
Stand (any tender) → no Staff charge. Portal pickup → no Stand.

Stuck → **treasurer@** · Membership → **vp-membershipexperience@**

Full doc: docs/STAFF-COVE-IN-PERSON-MANUAL.md`,
    },
    {
      slug: 'cove-register',
      title: 'Cove register quick reference',
      categoryId: 'cove',
      summary: 'Stand for cash/card/Cove QR/PIN/passcode; Staff Charge Cove is backup only.',
      order: 2,
      need: 'retail',
      body: `Staff → **The Cove** → In-person sales (Stand is the register).

1. **Cash / card** → Stand
2. **Cove Photos QR** → Stand → Gift card → scan
3. **Cove 6-digit or passcode** → Stand → search Customer → **Card on File**
4. **Portal already paid** → Today's store pickups · Handed out
5. **External (AM)** → log Zelle / PayPal / phone
6. **Unable to load cards** → cash/card or Staff Charge Cove backup

Never Charge Cove after Stand already took the same items.

**Full manual:** Help → *Cove in-person transactions manual* · Printable **/staff/in-person**`,
    },
    {
      slug: 'cove-in-person-square-stand',
      title: 'Square Stand (all in-person tenders)',
      categoryId: 'cove',
      summary: 'Cash, card, Gift card scan, and Card on File for Cove PIN/passcode.',
      order: 3,
      need: 'retail',
      body: `### Square Stand steps
1. Library / Favorites → ring snacks or spirit
2. Tender:
   - **Cash** / **Card** for cash and tap
   - **Gift card** → scan Photos QR
   - Search **Customer** by 6-digit or passcode → **Card on File**
3. Stop. Do **not** also Charge Cove or External for the same items

Cove balance is the Square gift card on file. Portal follows after redeem.

If **Unable to load cards**, that family has not loaded Cove yet: take cash/card or Staff backup.

Stand syncs to Staff Payments (inventory when SKU matches).

See **Cove in-person transactions manual** for the full decision table. Printable: /staff/in-person`,
    },
    {
      slug: 'cove-products-inventory',
      title: 'Cove products & inventory',
      categoryId: 'cove',
      summary: 'Add/restock products; advanced inventory when needed.',
      order: 4,
      body: `In **The Cove**, use **Cove products** to add items, prices, barcodes, and restock quantities.

Multiple staff can work products at once. **Spirit wear** stock is separate (Wix Stores / Cove shop merch + Square Stand items), not the snack register catalog. In person, sell spirit on **Square Stand**; browse online under **/cove → Stingrays Pride**.

Use advanced inventory only when you need deeper stock tools. Day-to-day is products + register.`,
    },
    {
      slug: 'discount-codes',
      title: 'Discount codes & spirit coupons',
      categoryId: 'cove',
      summary: 'Create and manage promo codes in Staff.',
      order: 5,
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
      slug: 'member-newsletter-diane',
      title: 'Member newsletter (for Diane)',
      categoryId: 'comms',
      summary: 'Plain text plus Canva. Paid email, Weekly Scoop, test sends, schedule, WhatsApp.',
      order: 3.5,
      need: 'marketing',
      body: `Watch the walkthrough video at the top of this article first.
Then use the screenshots below. Each one matches a section in Staff → Newsletter.

Open: https://www.shmspto.org/staff (Newsletter workspace)

## What parents actually get
- **Paid members**: the full email. SHMS header, your Canva PNG pages, then your text, then footer.
- **Free parents (Weekly Scoop, about once a month)**: a **link**, not the full designed email. You share that link on WhatsApp, in the member portal, and optionally by email.
- **Footer signups**: people who signed up on the public site. Email only. No portal.

## Before you send anything
1. Sign in as **vp-marketing@shmspto.org**
2. **Inbox → Connect Google** if Gmail send is not ready (president@ mailbox is what actually sends)
3. **Canva** workspace: open the Marketing folder and **Connect Canva** so PNG export works
4. On Staff **Home**, save your **personal Gmail** so **Test send → Just me** can reach you

## Design in Canva (not in Staff)
1. Staff → **Canva** → Open Marketing folder
2. Make a Doc, Presentation, or email-sized design
3. Brand files: https://www.shmspto.org/brand
4. Put the look in Canva. Put **clickable links in the text box** in Newsletter too (those get tracking)

Do not paste HTML from Canva. Do not edit the design inside Staff. Use **Edit in Canva**, then re-attach or Export PNG again.

## Attach Canva and export PNG
1. In Newsletter, paste a Canva view/edit link, or pick a recent design
2. **Export PNG for email** (it also starts on attach if Canva is connected)
3. Preview the graphic. Multi-page designs export **every page**: All pages stack in the email
4. **Save current as template** if you will reuse this

![Templates (Canva + copy). Attach link, export PNG, multi-page preview, save template](/help/staff-newsletter/01-templates-canva.png)

## Write the copy
Type in the subject and body like a normal email.

Optional: check **Write in sections**: intro, Event, Question (poll or reply prompt), CTA, sign-off. Add up to 8 sections. Email shows labeled blocks with dividers; headings are bold.

Edit **Newsletter email header title** and **footer** under Staff → Site settings.

Personal bits you can type in subject or body:
- {{firstName}} or {{first name}} · {{name}} · {{tier}} · {{grade}} · {{email}}

Example: Hi {{firstName}}, your {{tier}} membership…

If a name is missing, it becomes “there”.

![Subject, body, beats, UTM, and tracking toggles](/help/staff-newsletter/06-copy-tracking.png)

## Always test first
1. Pick **Just me**, **Board**, or **Board + Site Settings test list**
2. **Preview test recipients**, then **Send test email**
3. Subject gets **[TEST]**: It does **not** go to the parent portal archive
4. Open the test inbox and click a link once so you know tracking works

![Test send. Group, preview, send test email](/help/staff-newsletter/02-test-send.png)

## Choose the newsletter type
- **Paid members (full email)**: default. Sends to paid roster only. Optional portal post for paid parents.
- **Weekly Scoop (free monthly link)**: paste the Canva view link (or we use the attached Canva / https://www.shmspto.org/newsletter). Then **Copy + open WhatsApp** and **Post scoop to portal**: Optional: **Email scoop link** to free parents (checkbox to include footer signups).
- **Footer signup list only**: public form emails. No portal.

![Newsletter type. Paid, Weekly Scoop, or footer signups](/help/staff-newsletter/03-newsletter-type.png)

![Weekly Scoop. Link field and optional footer signups](/help/staff-newsletter/04-weekly-scoop.png)

![Write in sections. Intro, Event, Question, CTA, sign-off](/help/staff-newsletter/05-beats.png)

## Send paid email
1. Confirm type is **Paid members**
2. **Preview recipients**
3. **Send email now**: Confirm the count. If 25 or more, type **SEND**
4. Check **Send report** for delivered, failed, opens, clicks

![Send actions. Preview, Send email now, Copy + open WhatsApp](/help/staff-newsletter/08-send-actions.png)

## Schedule or get approval
1. Pick **Send at** (your local time)
2. Marketing: **Request approval & schedule**: Secretary or president clicks **Approve**
3. If you can approve, **Schedule send**
4. Jobs send within about 15 minutes of that time. Cancel from the same list if needed

Test sends stay one-click. They do not need this queue.

![Schedule / approval. Datetime, job list, Approve or Cancel](/help/staff-newsletter/07-schedule-approval.png)

## WhatsApp (including the graphic)
WhatsApp cannot attach a file from the website.

**Copy + open WhatsApp** will:
- Copy the caption
- Open your PNG in a new tab
- Open the grade group invite links

In WhatsApp: attach that PNG, then paste the caption.

Grade links live in **Site settings** (6th / 7th / 8th announcement links).

## Weekly Scoop, step by step
1. Type = Weekly Scoop
2. Subject can stay **SHMS Weekly Scoop**
3. Short note in the body. Scoop link field: Canva view URL
4. **Copy + open WhatsApp** (PNG tab + groups)
5. **Post scoop to portal** (free parents only. Paid members will not see this scoop)
6. Optional **Email scoop link** after a test send

## Send report
After a live send, open **Send report** on the same Newsletter page.
Refresh to see delivered, failed, opens, and top link clicks.

![Send report. Delivered, failed, opens, clicks](/help/staff-newsletter/09-send-report.png)

## What not to do
- Do not paste HTML or ask someone to “code the newsletter”
- Do not skip **Test send**
- Do not use Paid type for the monthly free link. Use Weekly Scoop
- Do not expect WhatsApp to auto-attach the PNG. You attach it.

Questions: president@shmspto.org`,
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
- **VP Marketing**: Google, Projects, Comms, Canva folder, Social, Newsletter, page copy, surveys
- **Secretary**: Minutes, Comms, Board roster, Events, Newsletter
- **Treasurer**: Budget (2026-27 planning worksheet), Payments, Expenses, Reports, MoneyMinder, Square
- **Events / Programs / Retail / Membership / Wellness / Instructor / Coordinator**: Role-specific workspaces

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
- **Communications**: Email, WhatsApp, meetings to parents / school / board
- **Content planner**: Social posts, flyers, portal content

## Views
- **Month**: Real calendar grid; click a day to schedule
- **Agenda**: Week list

## How to use it
1. Pick Communications or Content planner
2. Click a day on the month grid (or use Agenda)
3. Add title, draft, audience(s), channel, and status
4. Attach a Canva/Doc/Drive link
5. When ready to send, open Newsletter / WA or Social. Those tools still publish
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
      slug: 'where-form-emails-go',
      title: 'Where form emails go',
      categoryId: 'comms',
      summary: 'Help, contact forms, sale alerts. Which @shmspto.org inbox gets each.',
      order: 6,
      need: 'message',
      body: `Use this when a parent asks who got their message, or when your inbox did or did not get an alert.

All website and portal form mail sends from the shared SHMS PTO Gmail mailbox. **Reply-To** is usually the parent. Change destinations in **Staff → Site settings → Contact**: Dead aliases (info@, membership@, etc.) route to **president@**.

Household adult invites also send from that mailbox, so a mistyped invitee address can bounce to **president@**: The portal asks the owner to type the email twice, blocks common misspellings (gmial, etc.), skips domains with no mail server, emails **the owner** a copy with a share link, and posts the same note in portal messages. A cron also scans bounce notices and emails the owner plus a portal message (so president@ is not the only alert). If a bounce still arrives, reply to the owner (Reply-To) rather than chasing the bad address.

## Daily activity report
Every morning at **6:00am Eastern during daylight time** (5:00am during standard time) president@ gets an email of **yesterday** (Eastern midnight-midnight): website forms and surveys, payments and event tickets, member portal students / memberships / enrollments / household invites / help / portal messages, staff tasks / minutes / outreach / audit, president inbox mail, and logged errors. The top of each email also lists **current membership totals by type** (Reef, Lagoon, Tide, Free). Yesterday’s membership updates include a by-type breakdown. Every report also includes **weekly traffic** (last 7 Eastern days ending yesterday): website vs member portal vs staff pageviews, unique-browser days, and top paths.

Open the live roster anytime: **Staff → Membership**. Extra report recipients: **Staff → Site settings → Contact → Daily activity report extra emails**.

## Member Portal → Help (Ask the PTO)
Goes to **all three**:
1. **president@shmspto.org**
2. **vp-membershipexperience@shmspto.org**
3. **vp-marketing@shmspto.org**

Same for free and paid. The request is also logged for follow-up.

## Public website forms
| Form | Goes to |
|------|--------|
| Contact (/contact) | president@ (general) |
| Programs (/programs) | vp-initiatives@ and president@ |
| Event idea (/events) | vp-community-events@ |
| Sponsorship (/fundraising) | vp-sponsorships@ and president@ |
| Business owner (public) | vp-membershipexperience@ |
| Volunteer (logged in) | vp-community-events@ (volunteer inbox) |
| Newsletter | vp-marketing@, else president@ |
| Survey | vp-marketing@, else president@ |

## Portal (free & paid)
- **Business owner** → vp-membershipexperience@
- **Guardian invite** → invitee’s email (Reply-To = primary parent)
- **Program refund/transfer** → no staff email; parent gets a portal message

## Paid checkout sale alert
Parent gets confirmation email + portal Messages.

Staff alert goes to **all of**: vp-membershipexperience@, president@, treasurer@, cove@, cove-staff@, vp-sales@, secretary@.

Drive doc **48 - Where form emails go** is the shareable copy for WhatsApp / onboarding.`,
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
      slug: 'custom-domain',
      title: 'Point DNS off the temp domain',
      categoryId: 'admin',
      summary: 'CNAME and A records when you leave the trial URL.',
      order: 3,
      need: 'site',
      body: `Your trial is private. Sign in at your temp host /login with the email and password Pavilion sent you (yourpto.commons-pto.org).
The public Riverside demo is not your school.

When you want pto.yourschool.org (or yourpto.org):

1. Open Staff → Site settings → Your own domain.
2. Type the hostname and tap Add domain. That attaches it on Vercel.
3. At your registrar (GoDaddy, Cloudflare, Google Domains), create the records we show.

## Records
- **Apex** (yourpto.org): A record name \`@\` value \`76.76.21.21\`
- **www** or a subdomain (pto.yourschool.org): CNAME name \`www\` or \`pto\` value \`cname.vercel-dns.com\`

Wait for DNS (often under an hour). Tap Check DNS. HTTPS finishes after Vercel sees the records.

If Add domain says Vercel is not connected, still create those records and send the hostname to Pavilion support. We attach it when the token is on the project.

Do not point Stone Hill (shmspto.org) here.`,
    },
    {
      slug: 'purchase-confirmations',
      title: 'Purchase confirmations & portal messages',
      categoryId: 'admin',
      summary: 'What parents get after checkout.',
      order: 4,
      body: `Successful membership, Cove load, ticket, donation, and shop purchases create a parent portal message (and email when Gmail send is connected). The same checkout also emails **vp-membershipexperience@shmspto.org**, **president@shmspto.org**, **treasurer@shmspto.org**, **cove@shmspto.org** (Cove Coordinator), **cove-staff@shmspto.org**, **vp-sales@shmspto.org** (VP Digital & Retail Sales), and **secretary@shmspto.org** a staff sale alert (includes shirt size / magnet / refreshments notes when membership).

If a parent paid but sees nothing:
1. Confirm payment cleared in Square/PayPal
2. Ask them to refresh Member Portal → Messages / Payment History
3. Check Staff reports or Memberships roster
4. Escalate to Treasurer for payment-side mismatches

## Physical perks (shirt & magnet)
- **Lagoon / Tide (parents):** get **both** a Spirit Wear T-shirt (size at checkout) and a Stone Hill car magnet.
- **Reef:** includes a magnet (no shirt).
- **Faculty ($20):** choose **magnet OR T-shirt** at checkout (not both).
- Queued in Staff → Fulfillments. No mailing address yet (3PL later).
- Tell members: pick up at **Back to School Night on August 27**, or email **vp-membershipexperience@shmspto.org** to coordinate.
- Standalone **Stone Hill car magnet** is also sold in the spirit shop for $10.
- Mark **Set aside** when inventory is pulled, then **Handed out** after handoff.

## Free food & refreshments at PTO events
- **Lagoon and Tide only** (not Reef).
- Family Cove **6-digit codes for Lagoon/Tide always end in 9** (Reef and free accounts never do).
- At food trucks / tables: parent shows the 6-digit code → volunteer checks it ends in 9 **or** looks up on Cove register (Lagoon/Tide) → record the code → hand refreshment tickets.
- **Reef** is not free. Lookup the family (6-digit or passcode) → ring **BTSN food truck ticket** ($6 each, SKU POS-REFRESH) → deduct Cove (QR or Card on File) → **then** hand a ticket. Item is POS-only (not on /cove).
- **Guests / non-members** pay the food truck themselves. Do not ring Stand and do not hand a PTO ticket.
- Portal Membership benefits also shows the code for Lagoon/Tide members.`,
    },
    {
      slug: 'refunds-cancellations',
      title: 'Refunds & cancellations (online purchases)',
      categoryId: 'admin',
      summary: 'Square/PayPal money plus CMS or fulfill steps by product type.',
      order: 5,
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
- Parent emails Co-VP Fundraising & Programs (or uses the programs contact form). No self-serve refund/transfer buttons in the portal
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
      order: 6,
      body: `Treasurer and President keep **separate** logins for:

- PayPal
- Square
- MoneyMinder
- Bank of America

Staff does not embed those consoles. Use them only for finance ops, then return to Staff for parent-facing and program work.

Planning vs actual for the year lives in Staff → **Budget**: Full walkthrough: Help → **Staff planning budget (2026-27)**.`,
    },
    {
      slug: 'staff-budget',
      title: 'Staff planning budget (2026-27)',
      categoryId: 'admin',
      summary: 'Plan vs actual for Treasurer. Not the ledger. Jul 1-Jun 30.',
      order: 7,
      body: `Open **Staff → Budget** (Treasurer and Admin). This is a **planning worksheet** so the board can see plan vs actual during the year.

It is **not** the official books. MoneyMinder, Square, PayPal, and Bank of America stay the ledger. Staff Budget does not need to match them to the penny.

## Fiscal year
**July 1, 2026 to June 30, 2027.**

## Budgeted vs Actual
- **Budgeted** is the plan. Edit the box on a line and tab away to save.
- **Actual** is the sum of activity rows. Do not type over Actual. Add or move rows instead.

Expense **budgeted** amounts for 2026-27 start from **FY 2025-26 checking spend** (July 1, 2025 to June 30, 2026), rounded.

- **Beautification / community project** is **$0**: Last year’s campus work was a one-off, not this year’s operating plan.
- **Contingency $2,000** is a board cushion, not last year’s spend.
- **Card processing $800** is about 3% of last year’s Square deposits. Those fees are taken by Square/PayPal and usually never appear as a checking withdrawal.
- **Membership perk shirts** are **$0** on their own line because last year those shirts hit spirit-wear restock. Type a budget here if perk shirts are bought separately this year.
- **Income** lines are still fundraising **goals**, not last year’s deposits.
- **Beginning cash** is a placeholder until Treasurer replaces it with MoneyMinder closing cash at **6/30/2026**.

## How actuals get onto the worksheet
Two feeds. Using both on purpose avoids counting the same dollars twice.

### 1. Bank of America CSV (checking cash)
In BoA: checking → Activity → Download → **CSV** (not PDF). Upload it on the Budget page. This is the only CSV Budget accepts.

- Checks, ACH, Zelle, Sam’s, Amazon, Jumbula, insurance, and tools **do** import
- Square and PayPal **payouts / transfers into checking are skipped** (same dollars as memberships / Cove / tickets, or the live PayPal feed)
- Processor **fees** and card purchases (Apple, Square hardware, Adobe) still import
- Debit charges on our own Square terminal (SQ *SHMSPTO) are skipped. Those sales already live in Staff Payments
- Internal transfers are skipped
- Re-importing the same file will not double-count
- If you move a row to another line, a later re-import leaves that move alone
- Amazon lands on spirit-wear restock; Sam’s / Costco on snack restock. Change the line if that guess is wrong

### 2. Refresh (sale-level + live PayPal)
Pulls Square/PayPal **sales** already in Staff: memberships, Cove Digital loads, shop, in-person POS, tickets, and **paid** reimbursements. Also pulls **live PayPal** activity via Transaction Search (no PayPal CSV). PayPal withdrawals to BoA are skipped so they are not counted twice.

Typical month: download a fresh BoA CSV → import → **Refresh**.

## Using the page
- Totals at the top: income, expense, net. Budgeted vs actual, and remaining
- Click a line name to filter the activity log
- Wrong category: change the line on the row in the activity log
- **Record activity** is for beginning cash, a check, or a spirit night that never hit Square or the CSV
- **Undo** removes a bank or keyed row. Staff sales come back on Refresh. Recategorize those instead of deleting
- **Download Excel** exports Summary, Budget, and Activity sheets

Unclassified deposits/withdrawals are catch-alls. Move those rows to a real line.

## Related
- Staff Help → **PayPal, Square, MoneyMinder, Bank of America**
- Questions: treasurer@shmspto.org
`,
    },
  ],
}
