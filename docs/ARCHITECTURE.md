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
        NX[Next.js 14 App]
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
            WG[Wix Gift Cards — Student Store Card]
            WM[Wix Members — Auth + Portal]
            WE[Wix Events — Calendar]
            WF[Wix Forms — Data Capture]
        end
        subgraph VELO["⚡ Velo Backend"]
            HF[http-functions.js — Webhooks]
            DA[data.js — CMS Hooks]
            SC[storeCard.js — Card Balance API]
        end
    end

    subgraph PAYMENTS["💳 Payment Layer"]
        CH[Cheddarup — Programs + Fundraisers]
        WP[Wix Payments — Store + Membership]
        POS[Wix POS — In-Person Store]
        GC[Gift Cards — Student Store Card]
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
    NX --> |iframe embed| CH
    NX --> |Wix checkout| WP
    WS --> GC
    GC --> POS

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
    participant W as Wix Velo
    participant CMS as Wix CMS
    participant MM as MoneyMinder

    P->>V: Visits /programs page
    V->>W: GET /programs (CMS query)
    W-->>V: Returns program list
    V-->>P: Shows program cards
    P->>C: Clicks Register → Cheddarup embed
    C-->>P: Checkout flow
    P->>C: Pays (credit card or eCheck)
    C->>W: POST /cheddarupWebhook
    W->>CMS: Insert Payments record
    W-->>C: 200 OK
    C->>P: Confirmation email + waiver
    Note over CMS,MM: Monthly: export CSV → import to MoneyMinder
```

### 2. Student Uses School Store Card

```mermaid
sequenceDiagram
    participant PR as Parent (home)
    participant V as Vercel Site
    participant WS as Wix Stores
    participant GC as Wix Gift Cards
    participant ST as Student (school)
    participant POS as Wix POS App

    PR->>V: Visits /store → buys Store Card
    V->>WS: Add to cart + checkout
    WS->>GC: Generate gift card code
    GC-->>PR: Email with card code
    PR-->>ST: Shares code (text/screenshot)
    ST->>POS: Shows code at store window
    POS->>GC: Validates + deducts balance
    GC-->>POS: Remaining balance
    POS-->>ST: Transaction complete
```

### 3. Member Portal — View Student Balance

```mermaid
sequenceDiagram
    participant P as Parent
    participant V as Vercel Site
    participant WM as Wix Members OAuth
    participant SC as storeCard.js API
    participant CMS as Wix CMS

    P->>V: Visits /member-portal
    V->>WM: Check auth token
    WM-->>V: Not authenticated
    V->>WM: Redirect to Wix login
    P->>WM: Logs in
    WM-->>V: OAuth token
    V->>SC: GET /storeCardBalance?email=xxx
    SC->>CMS: Query Students by parentEmail
    CMS-->>SC: Student records + balances
    SC-->>V: Student cards + balances
    V-->>P: Shows portal dashboard
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14, React, Tailwind CSS, shadcn/ui | Public website |
| **Hosting** | Vercel | Frontend deployment, auto-deploy from GitHub |
| **Backend Data** | Wix CMS (headless) | Students, Programs, Enrollments, Payments, Volunteers, Newsletter |
| **Store** | Wix Stores V3 | Spirit wear, schwag, memberships, store cards |
| **Payments — Online** | Wix Payments + Cheddarup | Store checkout + enrichment programs/fundraisers |
| **Payments — In-Person** | Wix POS + Tap to Pay | School store window (volunteer's iPhone) |
| **Gift Cards** | Wix Gift Cards | Student store card — reloadable, tracks per-student spend |
| **Auth** | Wix Members (headless OAuth) | Parent login, member portal |
| **Events** | Wix Events | PTO meetings, dance night, NOVA Math |
| **Code** | Velo (JavaScript) | Webhooks, CMS hooks, store card API |
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
# Wix API
WIX_SITE_ID=52901d5d-08b0-47c1-9cc1-7376d5b70c45
WIX_API_KEY=your_wix_api_key

# Cheddarup
CHEDDARUP_WEBHOOK_SECRET=your_secret

# Next.js
NEXT_PUBLIC_SITE_URL=https://shmspto.org
```

---

## Open Items / Next Steps

- [ ] Implement Wix Headless OAuth for member portal auth
- [ ] Wire Wix Stores API to frontend product catalog
- [ ] Wire Wix Events API to homepage events strip
- [ ] Complete remaining 11 pages in v0
- [ ] Replace Unsplash placeholder images with real SHMS photos
- [ ] Jumbula CSV export → run migration script
- [ ] Add real Cheddarup collection URLs to Membership.js and Programs CMS
- [ ] Set up Google Sheets as transaction log
- [ ] Cancel Zapier before June 19
- [ ] Transfer site to treasurer@shmspto.org when ready
- [ ] Point shmspto.org domain to Vercel
- [ ] Delete 12 placeholder products from Wix store
