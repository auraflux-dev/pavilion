# Conventions
- TypeScript, no semicolons in frontend code, single quotes, async server functions and client components marked `'use client'`.
- Public/portal copy: never use em/en dashes as punctuation (AI tell). Prefer periods, commas, or colons. Details in `mem:frontend/copy-voice`.
- API routes return JSON errors with explicit HTTP statuses; log server errors with route-specific prefixes.
- Any member-owned CMS mutation requires authentication plus ownership validation.
- CMS data uses code fallbacks so missing collections/rows do not break public pages.
- Portal copy is CMS-editable through `PageContent` rows; `portal-hub` uses `key|value`, `portal-help` uses `question|answer` lines.

## Long pages → SectionJumpNav
- Prefer a jump row over packing more into the first viewport. Pattern: `SectionJumpNav` (`frontend/components/section-jump-nav.tsx`).
- Variants: `band` (full-bleed under hero, e.g. Cove) and `card` (inset above dense content, e.g. member portal).
- Each target section needs a stable `#id` and `scroll-mt-28` (sticky nav clearance).
- Thin wrappers keep page-specific labels: `CoveSectionNav`, `PortalSectionNav`. Add new page wrappers the same way as the page grows.