# In-person free signup (Scan / staff invite)

## Parent paths
- **Scan QR** → public `/join` redirects to `/auth/join?returnTo=/member-portal`
- Staff printable card: `/staff/in-person` (Print / PDF) with lanes + Scan to join QR
- Staff → Membership → **Invite free parent**: email → create/find Wix APPROVED member → Wix set-password email + Gmail backup; always returns `joinUrl` + `smsText`

## API
- `POST /api/staff/membership/invite` — roles: membership, secretary, admin, retail, events
- Lib: `frontend/lib/staff/invite-free-parent.ts`

## Money lanes (unchanged)
- Lane A: Cove Digital Card on Staff register (snacks)
- Lane B: Square Stand (spirit / guests)
- Free signup does not ring spirit — Stand still does
