# Jump nav rule (sitewide)

**Rule:** When a page or long view has **multiple sections of actions** (or distinct jobs), add **Jump to** section-link buttons so staff/parents can skip between them without scrolling blindly.

Applies to:
- Public site pages
- Member portal
- Staff portal (within a tab/view that stacks several action blocks)

## Implementation
- Shared UI: `frontend/components/section-jump-nav.tsx` (`SectionJumpNav`)
- Public helpers: `frontend/components/jump-nav/public-section-navs.tsx`
- Cove: `frontend/components/store/cove-section-nav.tsx`
- Member portal: `frontend/components/member-portal/portal-section-nav.tsx`
- Target sections use stable `id="..."` + `scroll-mt-28`

## Copy
- Eyebrow: **Jump to** (sentence case)
- Proper nouns title case (The Cove, Member Portal, …)
- UI labels sentence case (Snack menu, Spirit wear, …)

## When NOT required
- Single-purpose short pages / one action block
- Staff top-level **tabs** already switch major areas (Home, Membership, Cove, …); still add jump links **inside** a tab if that tab stacks several action sections