# Canva Connect · Staff Marketing (SHMS PTO only)

**Rule:** PTO Canva is a brand-new account + Connect app. Never reuse CWN / other-repo Canva.

Diane (VP Marketing) should **not** touch Developer Portal. Rob (or admin) sets that up once. Diane only:

1. Uses Staff → Canva (browse / copy links), and/or  
2. Opens Canva in the browser as `vp-marketing@shmspto.org` to edit designs.

---

## One-time setup (Rob)

### 1. Create a PTO-only Canva account

1. Open [canva.com/signup](https://www.canva.com/signup)
2. **Continue with Google** → choose **`president@shmspto.org`**  
   (If Canva says “couldn’t find this account”, you’re on **Log in** — switch to **Sign up**.)
3. Finish signup. This mailbox owns the PTO Canva team / designs.
4. Later: in Canva → **Settings → People** (or Brand), invite Diane (`vp-marketing@…` or her email) as a team member so she can edit without owning the Developer app.

Owner stays `president@`; Diane never needs Developer Portal.

### 2. Create Connect integration (Developer Portal)

While signed into that **same** PTO Canva account:

1. [Your integrations](https://www.canva.com/developers/integrations) → **Create an integration** → **Private**
2. Name: **SHMS PTO Staff**
3. **Scopes** — enable:
   - design:meta Read  
   - design:content Read + Write  
   - folder Read  
   - asset Read  
   - profile Read  
4. **Authentication → Authorized redirects** — exact URLs:
   ```
   https://www.shmspto.org/api/staff/canva/connect/callback
   http://127.0.0.1:3022/api/staff/canva/connect/callback
   ```
5. Copy **Client ID** + **Generate secret**

### 3. Put secrets on the site

Vercel Production + Development, and `frontend/.env.local`:

```
CANVA_CLIENT_ID=OC-...
CANVA_CLIENT_SECRET=...
```

Redeploy / restart local.

### 4. Connect once (so Diane doesn’t have to)

**Option A — shared org token (Diane never clicks Connect):**

1. Rob signs into Staff as marketing/admin → **Canva** → **Connect Canva**
2. Authorize as `president@shmspto.org` (the PTO Canva owner)
3. Copy the stored refresh token from CMS `StaffCanvaTokens` (Rob’s row) into Vercel:
   ```
   CANVA_REFRESH_TOKEN=...
   ```
4. Redeploy. Any marketing staffer then sees PTO designs without connecting.

**Option B — each marketing staffer Connects once** with the PTO Canva login (fine if Diane is ok clicking Connect once).

---

## What Diane does day-to-day

- Staff → **Canva** → browse / copy edit links into Comms or Social  
- Or open [canva.com](https://www.canva.com) after she’s invited to the PTO Canva team  
  (owner is `president@shmspto.org`)
- She never opens Developer Portal

---

## Local note

Use `http://127.0.0.1:3022`, not `localhost` (Canva blocks localhost redirects).
