# Public / portal copy voice

## Never use em/en dashes as punctuation

Sitewide scrub (Jul 2026): visitor UI, portal, emails, defaults, docs, and promo scripts were cleaned. `humanizePublicCopy` strips CMS em/en dashes on the way out. Keep writing new copy without them.
- Do **not** write with em dashes (`—`) or en dashes (`–`) as clause separators.
- Rob calls this a dead giveaway of AI writing.
- Prefer periods, commas, colons, or short new sentences.
- Examples:
  - Bad: `ideas that fit — no commitment required.`
  - Good: `ideas that fit. No commitment required.`
  - Bad: `ways to help — shout-outs, event tables`
  - Good: `ways to help: shout-outs, event tables`
- Numeric ranges are fine as words (`$20 to $50`) or plain hyphens only when truly needed for compound modifiers; prefer `to` for money/time ranges.
- `humanizePublicCopy` already rewrites many em dashes for CMS text. Still write source copy clean so we do not rely on the sanitizer.

## Product naming
- Always **Cove Digital Card** (never Cove card / store card / family card for the product). See `brandifyCoveDigitalCard`.
