# Always fully test before Rob tries it

As of 2026-07-25 Rob wants agents to **fully test** (API + browser UI click-through when the change is operator-facing) **before** asking him to verify. Partial unit/API smoke is not enough for Composer / Clip Library / dashboard flows — it wastes his time.

For Compose / library work: hard-refresh path in browser (or equivalent CDP), confirm real video paints, not just unit tests + curl.
