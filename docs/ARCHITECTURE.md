# SHMS PTO Platform Architecture
**Stone Hill Middle School PTO — Technical Architecture Document**
Last updated: June 2026

---

## Overview

The SHMS PTO platform uses a **headless architecture** — Wix powers all backend data and business logic, while a Next.js frontend hosted on Vercel delivers the public-facing website. Parents and students interact with the Vercel site; all data lives in Wix.

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph VISITORS["👥 Users"]
        P[Parents / Families]
        S[Students - School Store]
        B[Board Members - Admin]
    end

    subgraph FRONTEND["🌐 Frontend — Vercel (shmspto.org)"]
        NX[Next.js 16 App]
        subgraph PAGES["Pages"]
            H[Home]
            AB[About / Board]
            PR[Programs]
            EV[Events]
            ST[Store & Spirit Wear]
            VO[Volunteer]
            ME[Membership]
            IN[Initiatives]
            NL[Newsletter]
            PD[Pay / Donate]
            MP[Member Portal]
            CO[Contact]
        end
    end

    subgraph WIX["⚙️ Wix Backend (headless)"]
        subgraph CMS["📊 CMS Collections"]
            CS[Students]
            CP[Programs]
            CE[Enrollments]
            CPA[Payments]
            CV[Volunteers]
            CN[Newsletter Subscribers]
        end
        subgraph APPS["📦 Wix Apps"]
            WS[Wix Stores — Spirit Wear + Store Card]
            WM[Wix Members — Auth + Portal]
            WE[Wix Events — Calendar]
            WF[Wix Forms — Data Capture]
        end
        subgraph VELO["⚡ Legacy Velo Backend"]
            HF[http-functions.js — Legacy CheddarUp webhook]
            DA[data.js — CMS Hooks]
            SC[storeCard.js — Legacy store-card API]
        end
    end

    subgraph PAYMENTS["💳 Payment Layer"]
        CH[Cheddarup — Programs + Fundraisers]
        WP[Wix Payments — Store + Membership]
        SQ[Square — Student Store Card + Saved Cards]
        POS[Wix POS — In-Person Store]
    end

    subgraph BOOKKEEPING["📒 Bookkeeping"]
        GS[Google Sheets — Transaction Log]
        MM[MoneyMinder — Accounting]
    end

    subgraph MIGRATION["🔄 Data Migration"]
        JB[Jumbula CSV Export]
        MS[Migration Script — Node.js]
    end

    subgraph DEVOPS["🛠 DevOps"]
        GH[GitHub — auraflux-dev/wix-shmspto]
        VR[Vercel — Auto Deploy on Push]
    end

    %% User flows
    P --> NX
    S --> POS
    B --> WIX

    %% Frontend to Wix
    NX --> |Wix Data REST API| CMS
    NX --> |Wix Stores REST API| WS
    NX --> |Wix Events REST API| WE
    NX --> |Wix Headless OAuth| WM

    %% Payment flows
    NX --> |program registration links| CH
    NX --> |Wix checkout| WP
    NX --> |Web Payments SDK + APIs| SQ
    SQ --> POS

    %% Cheddarup webhook
    CH --> |POST webhook| HF
    HF --> CPA

    %% Bookkeeping flow
    CH --> |CSV export| GS
    WS --> |Orders API| GS
    GS --> |CSV import| MM

    %% Migration
    JB --> MS
    MS --> CS

    %% DevOps
    GH --> VR
    VR --> NX
```

---

## Data Flow Diagrams

### 1. Parent Pays for Enrichment Program

```mermaid
sequenceDiagram
    participant P as Parent
    participant V as Vercel Site
    participant C as Cheddarup
    participant N as Next.js API
    participant CMS as Wix CMS
    participant MM as MoneyMinder

    P->>V: Visits /programs page
    V->>CMS: Query Programs through Wix Data API
    CMS-->>V: Returns program list
    V-->>P: Shows program cards
    P->>C: Clicks Register → CheddarUp
    C-->>P: Checkout flow
    P->>C: Pays (credit card or eCheck)
    C->>N: POST /api/webhooks/cheddarup
    N->>CMS: Insert Payments record
    N-->>C: 200 OK
    C->>P: Confirmation email + waiver
    Note over CMS,MM: Monthly: export CSV → import to MoneyMinder
```

### 2. Student Uses School Store Card

```mermaid
sequenceDiagram
    participant PR as Parent (home)
    participant V as Vercel Site
    participant SQ as Square Gift Cards
    participant ST as Student (school)
    participant POS as Wix POS App

    PR->>V: Visits /store → chooses student and amount
    V->>SQ: Secure Square payment + load gift card
    SQ-->>V: Payment and updated balance
    V-->>PR: Reload confirmation
    ST->>POS: Uses assigned store card at store window
    POS->>SQ: Validates + deducts balance
    SQ-->>POS: Remaining balance
    POS-->>ST: Transaction complete
```

### 3. Member Portal — View Student Balance

```mermaid
sequenceDiagram
    participant P as Parent
    participant V as Vercel Site
    participant WM as Wix Members OAuth
    participant API as Next.js portal APIs
    participant CMS as Wix CMS

    P->>V: Visits /member-portal
    V->>WM: Check auth token
    WM-->>V: Not authenticated
    V->>WM: Redirect to Wix login
    P->>WM: Logs in
    WM-->>V: OAuth token
    V->>API: GET /api/portal/family
    API->>CMS: Query Students by authenticated parentEmail
    CMS-->>API: Student records + balances
    API-->>V: Family and store-card data
    V-->>P: Shows portal dashboard
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16, React, Tailwind CSS, shadcn/ui | Public website |
| **Hosting** | Vercel | Frontend deployment, auto-deploy from GitHub |
| **Backend Data** | Wix CMS (headless) | Students, Programs, Enrollments, Payments, Volunteers, Newsletter |
| **Store** | Wix Stores V3 | Spirit wear, schwag, memberships, store cards |
| **Payments — Online** | Wix Payments + Cheddarup | Store checkout + enrichment programs/fundraisers |
| **Payments — In-Person** | Wix POS + Tap to Pay | School store window (volunteer's iPhone) |
| **Gift Cards** | Square Gift Cards + Web Payments SDK | Student store card, secure reloads, saved cards, and auto top-off |
| **Auth** | Wix Members (headless OAuth) | Parent login, member portal |
| **Events** | Wix Events | PTO meetings, dance night, NOVA Math |
| **Code** | Next.js API routes + limited legacy Velo | Canonical webhooks and portal APIs; Wix CMS hooks remain in Velo |
| **Version Control** | GitHub (auraflux-dev/wix-shmspto) | All code, auto-syncs to Wix Studio + Vercel |
| **Bookkeeping** | MoneyMinder + Google Sheets | Financial tracking, CSV import from Cheddarup/Wix |
| **Enrichment Payments** | Cheddarup Team | Programs, waivers, installments, peer-to-peer fundraising |
| **Migration** | Node.js script | Jumbula CSV → Wix Students CMS |

---

## Repository Structure

```
auraflux-dev/wix-shmspto/
├── frontend/                    # Next.js app (deploys to Vercel)
│   ├── app/
│   │   ├── page.tsx             # Homepage
│   │   └── layout.tsx           # Root layout
│   ├── components/
│   │   ├── announcement-bar.tsx
│   │   ├── navbar.tsx
│   │   ├── hero.tsx
│   │   ├── programs-preview.tsx
│   │   ├── volunteer-section.tsx
│   │   ├── upcoming-events.tsx
│   │   ├── community-banner.tsx
│   │   ├── footer.tsx
│   │   └── ui/                  # shadcn/ui components
│   └── lib/
│       └── utils.ts
├── src/                         # Wix Velo code (syncs to Wix Studio)
│   ├── pages/
│   │   ├── masterPage.js        # Nav, footer, member welcome — all pages
│   │   ├── Home.c1dmp.js        # Homepage logic
│   │   ├── About.se3l5.js       # Board members
│   │   ├── Programs.m4kt5.js    # CMS-driven programs
│   │   ├── Volunteer.js         # Form → CMS
│   │   ├── Membership.js        # → Cheddarup
│   │   ├── Contact.js           # Form → CMS
│   │   ├── Initiatives.js       # Harris Teeter, NOVA Math
│   │   ├── Newsletter.js        # Subscribe → CMS
│   │   └── MemberPortal.js      # Gated portal
│   └── backend/
│       ├── http-functions.js    # Cheddarup webhook, store card API
│       └── data.js              # CMS validation hooks
├── migration/
│   ├── import-to-wix.js         # Jumbula → Wix CMS
│   └── map-schema.js            # Field mapping config
└── docs/
    └── ARCHITECTURE.md          # This file
```

---

## CMS Collections Schema

### Students
Stores parent/student data migrated from Jumbula.
| Field | Type | Notes |
|---|---|---|
| firstName, lastName | TEXT | Student name |
| grade | TEXT | 6, 7, or 8 |
| parentEmail | TEXT | Primary key for lookups |
| parentFirstName, parentLastName | TEXT | |
| parentPhone | TEXT | |
| emergencyContact, emergencyPhone | TEXT | |
| allergies | TEXT | Medical notes |
| storeCardCode | TEXT | Gift card code |
| storeCardBalance | NUMBER | Current balance |
| membershipStatus | TEXT | none / active / expired |
| membershipTier | TEXT | ruby / supreme |
| jumbulaSid | TEXT | Original Jumbula ID |

### Programs
Enrichment programs catalog.
| Field | Type | Notes |
|---|---|---|
| name | TEXT | Program name |
| description | RICH_TEXT | |
| fee | NUMBER | Cost in USD |
| capacity | NUMBER | Max enrollment |
| registrationOpen | BOOLEAN | Shows Register button |
| cheddarupUrl | URL | Links to Cheddarup collection |
| requiresWaiver | BOOLEAN | |
| grades | TEXT | e.g. "6,7,8" or "6-8" |

### Payments
All payment records from Cheddarup and Wix.
| Field | Type | Notes |
|---|---|---|
| payerEmail, payerName | TEXT | |
| amount | NUMBER | |
| source | TEXT | cheddarup / wix_store / wix_pos |
| transactionId | TEXT | External ID |
| syncedToMoneyMinder | BOOLEAN | Reconciliation flag |
| giftCardCode | TEXT | If store card payment |
| wixOrderId | TEXT | If Wix store order |

---

## Environment Variables (Vercel)

```env
# Wix API — production headless site (CMS / Stores / Events)
WIX_SITE_ID=509fda24-8dbf-43c6-aa74-df9f8b63c388
WIX_API_KEY=your_wix_api_key
NEXT_PUBLIC_WIX_CLIENT_ID=your_oauth_client_id

# Public site (update to https://www.shmspto.org after DNS cutover)
NEXT_PUBLIC_SITE_URL=https://www.shmspto.org

# Cheddarup
CHEDDARUP_WEBHOOK_SECRET=your_secret

# Square gift cards (use production before go-live)
SQUARE_ACCESS_TOKEN=
SQUARE_ENVIRONMENT=production
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_NOTIFICATION_URL=https://www.shmspto.org/api/webhooks/square
```

> `wix.config.json` and the headless configuration both use site
> `509fda24-8dbf-43c6-aa74-df9f8b63c388`.

---

## Open Items / Next Steps

### Done in code (as of Jul 2026)
- [x] Wix Headless OAuth member portal flow (needs production redirect URI + SITE_URL)
- [x] Wix Stores API → store + spirit wear catalog
- [x] Wix Events API → events pages
- [x] Public pages implemented in Next.js (`frontend/`)
- [x] Membership Join → Wix product pages; store-card links use Wix storefront until DNS
- [x] Fundraising membership product IDs wired

### Still open (ops / content)
- [ ] Register OAuth redirect `https://www.shmspto.org/auth/callback` (+ current Vercel URL) in Wix OAuth client
- [~] `shmspto.org` / `www` are attached to Vercel; DNS still points to Wix
- [~] Square production env names are present; webhook configuration and signed-in E2E remain
- [ ] Point Cheddarup webhook at `https://www.shmspto.org/api/webhooks/cheddarup?token=…`
- [ ] Add Cheddarup URLs on Programs CMS rows that should be open
- [ ] Delete Wix demo/duplicate store products
- [ ] Replace Unsplash placeholder images with real SHMS photos
- [ ] Jumbula CSV export → migration scripts
- [ ] Google Sheets transaction log / MoneyMinder
- [ ] Cancel Zapier if still active
- [x] Confirm Git Integration and headless site ID (`509fda24`)