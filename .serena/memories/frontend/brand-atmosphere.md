# Brand atmosphere (front of site)

**Do not** use place-name ribbons, gold rules, or corner watermarks — those felt noisy.

## What to use
- `BrandImageWash` (`components/brand/brand-image-wash.tsx`) — soft faded campus photos in cream-section dead space (masked edge blend).
- Real section photography (volunteer column, community strip) stays the primary visual.
- Home hero keeps its original green plane + wave; do not re-add ribbon lexicons.

## Jump nav (required pattern)
- **Rule:** Multiple sections of actions on one page/view → add **Jump to** section links (public, member portal, and staff long views).
- Shared component: `SectionJumpNav`; section targets need `id` + `scroll-mt-28`.
- Eyebrow: **Jump to** — sentence case.
- Proper nouns title case: The Cove, Member Portal, Stingrays, Reef, Lagoon, Tide.
- UI labels sentence case: Snack menu, Spirit wear, Calendar & messages.
- Staff top-level tabs are fine for major areas; still add jump links inside a tab when it stacks several action blocks.

## Portal help
- Full always-visible docs in `portal-help` PageContent (question|multi-paragraph answer).
- UI: `PortalHelpPanel` shows topic chips + full articles, not a collapsed one-liner accordion.