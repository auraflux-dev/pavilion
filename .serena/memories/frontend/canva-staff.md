# Staff Canva Connect

Staff → **Canva** (`?workspace=canva`) for marketing/admin.

## Code
- Lib: `frontend/lib/canva/{config,oauth,tokens,client}.ts`
- APIs: `/api/staff/canva/{status,connect,connect/callback,designs,disconnect}`
- UI: `frontend/components/staff/staff-canva-panel.tsx`
- CMS: `StaffCanvaTokens` (email, refreshToken, accessToken, accessExpiresAt, active)
- Docs: `docs/CANVA-SETUP.md`

## Env
- `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` (same Connect app as CWN; on Vercel Production + Development)
- Optional: `CANVA_REFRESH_TOKEN`, `CANVA_ACCESS_TOKEN`, `CANVA_OAUTH_REDIRECT_BASE`

## Manual before first Connect works
1. Canva Developer Portal → add redirect:
   - `https://www.shmspto.org/api/staff/canva/connect/callback`
   - `http://localhost:3022/api/staff/canva/connect/callback`
2. Enable scopes matching `CANVA_SCOPES` in config.ts
3. Deploy code; Marketing/Admin clicks **Connect Canva**

Do not commit `.env.local` Canva secrets.