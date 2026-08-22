# Canva · Staff Marketing (SHMS PTO)

## Day-to-day (use this now)

VP Marketing works in one designated folder:

**https://www.canva.com/folder/FAHMLjYIWX0**

- **Current owner:** `gregory.robert.c@gmail.com` (temporary — share/invite Diane & Marketing from that Canva account)
- Later: move ownership to `president@shmspto.org` when that Canva account is ready
- Staff → **Canva** → **Open Marketing folder**
- Paste design edit links into Comms & content or Social
- Brand PNGs: https://www.shmspto.org/brand

Override with env if the folder ever moves:

```
NEXT_PUBLIC_CANVA_MARKETING_FOLDER_URL=https://www.canva.com/folder/...
```

No Developer Portal needed for this path.

---

## Optional: Canva Connect API (PNG export in Newsletter)

**Use a Public integration in draft mode.** Private integrations require Canva Enterprise. You do not need marketplace review for internal PTO staff use.

1. [Your integrations](https://www.canva.com/developers/integrations) → Create → **Public** → **SHMS PTO Staff**
2. Leave it in **draft** (do not submit for marketplace unless you want all Canva users to install it)
3. Scopes: design:meta Read; design:content Read+Write; folder Read; asset Read; profile Read
4. Redirects (exact):
   ```
   https://www.shmspto.org/api/staff/canva/connect/callback
   https://shmspto.vercel.app/api/staff/canva/connect/callback
   http://127.0.0.1:3022/api/staff/canva/connect/callback
   ```
5. Set `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` on Vercel `frontend` → `CANVA_OAUTH_REDIRECT_BASE=https://www.shmspto.org` → redeploy → Staff → Canva → Connect API

Tokens: CMS `StaffCanvaTokens` or optional `CANVA_REFRESH_TOKEN` (one staff OAuth, shared PNG export for Marketing).

Do not reuse the CWN thumbnail app credentials on SHMS.
