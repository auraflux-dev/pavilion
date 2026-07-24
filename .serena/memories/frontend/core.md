# Frontend
- Next App Router under `frontend/app`; reusable UI under `frontend/components`; server integrations/defaults under `frontend/lib`.
- `getWixClient()` is server-only API-key Wix client; `createOAuthClient(tokens)` is member-authenticated Wix client.
- Wix member session cookie is `TOKENS_COOKIE`; ownership checks must compare normalized member email to CMS `parentEmail` before mutating student/family data.
- `PageContent` and `SiteSettings` provide CMS-managed text/config with defaults in `frontend/lib/defaults`.
- Square gift cards represent student store cards. Never load a Square gift card unless a paid order or valid stored-payment charge has been verified.