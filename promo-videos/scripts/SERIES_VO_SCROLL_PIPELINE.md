# SHMSPTO promo video series — VO-synced scrolls

Shared capture/assemble pattern for every parent video after Member Portal.

## Capture rule (DO NOT get this wrong)

**Logged-in portal UI is captured from Cursor browser tabs that already have free/paid sessions.**

- Use Cursor browser MCP (`cursor-ide-browser` → CDP / in-page VO scroll), **or** Playwright `connectOverCDP` to that same Cursor browser.
- **Never** open a separate Playwright Chromium and ask for login. Sessions do not transfer.
- Public pages (no login) can use headless Playwright normally.

Free: `gregory.robert.c@gmail.com` · Paid: `rgreggs78@gmail.com` — already logged in in Cursor tabs when filming.


## Series order

| # | Video | Status | Notes |
|---|--------|--------|--------|
| 1 | **Member Portal walkthrough** | Shipped to VP Marketing | Free + paid portal; Cove cash OK + Digital Card better |
| 2 | **Membership tiers** | In progress | VO draft + game plan; Reef / Lagoon / Tide full bullets |
| 3 | **Enrichment programs** | Queued | Catalog, enroll, discounts by tier |
| 4 | **Meet the board** | Queued | Board page + roles; may overlap board-recruit assets |

## Membership tiers — in progress

- **Audience:** parents choosing Reef / Lagoon / Tide
- **SEE=HEAR:** public `/membership` slow scrolls + paid portal perk proof
- **Do not** re-teach full portal setup (link: watch portal video first)
- **Bookends:** staple cold open + outro
- **VO:** `scripts/membership_tiers_elevenlabs.txt` · `generate_membership_tiers_vo.js`
- **Plan:** `scripts/membership_tiers_GAME_PLAN.md`
- **Export:** `SHMSPTO_WATCH_THIS_membership_tiers_16x9.mp4`

## Capture commands (reference)

```bash
cd promo-videos
# Public VO scrolls
SKIP_PORTAL=1 NODE_PATH=~/cwn-c0/node_modules node scripts/capture_portal_walkthrough_vo_scrolls.js

# Remap existing continuous clip to slower VO pace
node scripts/remap_scroll_to_vo_pace.js \
  --in assets/.../clip.mp4 --out assets/.../clip.mp4 \
  --seconds 12.5 --hold-top 4.5 --hold-bottom 2.5

# Assemble
FFMPEG=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg node scripts/assemble_portal_walkthrough.js
```
