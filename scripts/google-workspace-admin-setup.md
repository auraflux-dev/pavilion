# Staff portal ↔ Google Workspace (no service-account keys)

Your org blocks `iam.disableServiceAccountKeyCreation`, so **domain-wide delegation with a JSON key will not work**.

Use **Connect Google** instead: each `@shmspto.org` staffer authorizes once; the portal stores a refresh token and can read/reply as **them**.

---

## What you will create

1. A **Web application** OAuth client in Google Cloud (not Desktop / “installed”)
2. Two Vercel env vars
3. One Wix CMS collection for tokens
4. Each staffer clicks **Connect Google** once in Staff → Inbox

APIs must already be enabled (you did A): Gmail, Calendar, Drive.

---

## Step 1 — OAuth consent screen (if not done)

1. [Google Cloud Console](https://console.cloud.google.com/) → your **SHMS PTO Staff Portal** project  
2. **APIs & Services** → **OAuth consent screen**
3. User type: **Internal** (Workspace only — recommended)  
   If Internal is unavailable, use **External** + add board emails as test users.
4. App name: `SHMS PTO Staff Portal`  
   Support email: your admin address  
   Save
5. **Scopes** → Add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
6. Save and continue → Back to dashboard

---

## Step 2 — Create a **Web** OAuth client (exact)

1. **APIs & Services** → **Credentials** → **+ Create credentials** → **OAuth client ID**
2. Application type: **Web application** (not Desktop)
3. Name: `SHMS PTO Staff Web`
4. **Authorized JavaScript origins** → Add:
   - `https://shmspto.vercel.app`
5. **Authorized redirect URIs** → Add **exactly**:
   - `https://shmspto.vercel.app/api/staff/workspace/connect/callback`
6. **Create**
7. Download JSON **or** copy:
   - Client ID  
   - Client secret  

Existing `client_secret_…apps.googleusercontent.com.json` files that say type **installed** / redirect `http://localhost` are **not** enough — create this new **Web** client.

---

## Step 3 — Tell the agent (or set Vercel yourself)

Put the downloaded Web client JSON somewhere temporary, e.g.:

`/Users/robertgregory/wix-shmspto/oauth-web-client.json`

Then say: **“oauth json ready at oauth-web-client.json”**

The agent will set on Vercel **Production**:

| Name | Value |
|------|--------|
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client secret |

Then redeploy.

Or set them yourself: Vercel → project **frontend** → Settings → Environment Variables → Production → Redeploy.

---

## Step 4 — Wix CMS: `StaffGoogleTokens`

Wix Dashboard (app site) → **CMS** → **Create collection** (or existing):

**Collection ID / name:** `StaffGoogleTokens`

| Field key | Type |
|-----------|------|
| `email` | Text |
| `refreshToken` | Text (or Long text) |
| `active` | Boolean |
| `updatedAt` | Text |

Permissions: allow the site API key / backend to create & update (same pattern as `StaffRoles`).

---

## Step 5 — Each staffer (2 minutes)

1. Sign in at `https://shmspto.vercel.app/staff` with their **@shmspto.org** account  
2. Open **Inbox**  
3. Click **Connect Google**  
4. Pick the **same** `@shmspto.org` Google account → Allow  
5. You return to Inbox with mail loaded  
6. Optional later: **Email signature** → Save → reply with **Include signature**

They must connect with the same email they use for Staff login.

---

## Step 6 — Verify

- Inbox lists messages  
- Open one → reply → **Send reply** → appears in Gmail Sent  
- **My calendar** shows events  
- **Docs** lists files (or empty until docs are shared with that account)

---

## Optional later (if org policy is relaxed)

If an Organization Policy Admin removes `iam.disableServiceAccountKeyCreation`, you can switch to service-account + domain-wide delegation (no per-person Connect). Until then, **Connect Google is the supported path**.

---

## Mass email (Memberships)

Still uses a dedicated mailbox OAuth (`GMAIL_*` + `npm run gmail:oauth`) for blasts, or the same Web client if you prefer one OAuth app for both.
