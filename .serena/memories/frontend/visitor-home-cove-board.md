# Visitor home, Cove, board (Jul 2026)

## Staff nav
- Top-nav **Staff** only when `isStaff` from `/api/auth/me`: email must be `@shmspto.org` **and** an active `StaffRoles` row with roles.

## Home images
- Broken CMS `homeVolunteerImageUrl=/placeholder.svg` showed raw alt text — fixed to `/home/volunteer.jpg`.
- Local assets in `frontend/public/home/`: volunteer.jpg, hero-top.jpg, hero-bottom.jpg, community.jpg.
- CMS keys: homeVolunteer*, homeCommunity*, homeHeroImageTop*, homeHeroImageBottom*.
- Canva SHMS PTO folder still has empty placeholders; stock photos OK until real SHMS photos uploaded.

## CTAs / membership
- Home volunteer section: **one** CTA → `/volunteer`.
- Nav/footer: **Become a member** → `/membership` (not Parent Login).
- Cove card CTAs: Become a free member → load card; **10% bonus** via SiteSetting `storeCardBonusPercent` (pay $50 → load $55).

## Board
- BoardMembers CMS synced from Drive sheet `1oEQq-v4nWSfLm8M8GOIRF6LKC9A8XjcQi4AHuNodJwo`.

## Deferred
- Programs Contact Us → form mapped to VP of Programs.
