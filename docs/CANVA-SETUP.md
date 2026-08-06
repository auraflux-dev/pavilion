# Canva · Staff Marketing (SHMS PTO)

## Day-to-day (use this now)

VP Marketing works in one designated folder:

**https://www.canva.com/folder/FAHMLjYIWX0**

- Owner: `president@shmspto.org` (invite Diane / Marketing as a Canva team member on that folder/team)
- Staff → **Canva** → **Open Marketing folder**
- Paste design edit links into Comms & content or Social
- Brand PNGs: https://www.shmspto.org/brand

Override with env if the folder ever moves:

```
NEXT_PUBLIC_CANVA_MARKETING_FOLDER_URL=https://www.canva.com/folder/...
```

No Developer Portal needed for this path.

---

## Optional later: Canva Connect API

In-Staff browse/search when you create a **PTO-only** private integration under `president@shmspto.org` (not CWN).

1. [Your integrations](https://www.canva.com/developers/integrations) → Create → Private → **SHMS PTO Staff**
2. Scopes: design:meta Read; design:content Read+Write; folder Read; asset Read; profile Read
3. Redirects:
   ```
   https://www.shmspto.org/api/staff/canva/connect/callback
   http://127.0.0.1:3022/api/staff/canva/connect/callback
   ```
4. Set `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` on Vercel → redeploy → Staff → Canva → Connect API

Tokens: CMS `StaffCanvaTokens` or optional `CANVA_REFRESH_TOKEN`.
