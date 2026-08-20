# Public / portal copy voice

Applies to Stone Hill (`www.shmspto.org`), Commons demo, and private Commons trials.

## Never use em/en dashes as punctuation

Sitewide scrub (Jul 2026 + Aug 2026 trial pass). `humanizePublicCopy` strips CMS em/en dashes on the way out. Keep writing new copy without them.
- Do **not** write with em dashes (`—`) or en dashes (`–`) as clause separators.
- Rob calls this a dead giveaway of AI writing.
- Prefer periods, commas, colons, or short new sentences.
- Examples:
  - Bad: `ideas that fit — no commitment required.`
  - Good: `ideas that fit.\nNo commitment required.`
  - Bad: `Join the PTO — $25 annually.`
  - Good: `Join the PTO.\n$25 annually.`
- Numeric ranges: `$20 to $50` (words), not dashes.
- `humanizePublicCopy` rewrites many em dashes for CMS text. Still write source copy clean.

## Line breaks (clean beats, no orphans)

- Copy that is more than one sentence or beat gets a real line break in the source (`\n`, `<br />`, or a new `<p>`).
- Render with `whitespace-pre-line` or HTML breaks so it does not sit in one cramped line.
- When the idea turns (new step, new clause, new CTA), start a new line. Do not leave one or two words hanging at the end of a prior beat.
- `humanizePublicCopy` must keep newlines (do not collapse `\n` to spaces).
- Cursor rule: `.cursor/rules/copy-line-breaks.mdc`.

## Product naming
- Always **Cove Digital Card** on Stone Hill (never Cove card / store card / family card for the product). See `brandifyCoveDigitalCard`.
- On Commons / trials: use the pack store/card names (e.g. Family card). Never say Cove on Commons visitor surfaces.