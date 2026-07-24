## July 22 2026 — Ecommerce + enrichment ship review

Serena-style review of b389337, 1ba6faf, and uncommitted Gmail/activity work.

### Critical (follow-ups, not blockers for docs/push)
- Event ticket capacity TOCTOU / oversell; post-charge fulfill error can say card not charged when it was
- RefundRequested frees seat before staff acts; Approve refund may skip waitlist promote

### Medium
- Activity strip counts all ContactSubmissions (7d); parent first-visit banner fixed to baseline-seen
- Reports CSV hard caps; refund is CMS-only (no Square auto)

### Shipped docs
41 Confirmations · 42 Reports · 43 Event tickets · 44 Enrichment attendance/refunds · 45 Staff activity/Google Connect; index + 02/02c/27/30/32/33 appended.

Script: scripts/update-ship-docs-july22.js