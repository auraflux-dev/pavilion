# Rename map: commons-* → Pavilion (P4 / P6)

**Audience: product**

Customer-facing name is **Pavilion**. Internal/Vercel slugs still say commons until renamed on **robert-4220 only** (never treasurer / SHMS).

| Today | Target (later) | Surface |
|-------|----------------|---------|
| `commons-pto-demo` Vercel project | `pavilion-demo` (or keep slug, change display) | Product demo / trials |
| `commons-pto` Vercel | retire (P6) | Legacy private host |
| `commons-site` | keep or `pavilion-site` | Marketing onpavilion.com |
| `COMMONS_PLATFORM` | `PAVILION_PLATFORM` (alias both during migrate) | Env flag |
| `COMMONS_PROVISION_SECRET` | `PAVILION_PROVISION_SECRET` | Env |
| `COMMONS_TEMP_DOMAIN_SUFFIX` / `commons-pto.org` | Pavilion trial domain | DNS |
| Docs / sales “Commons” | Pavilion | Copy |

## Rules while renaming

1. Dual-read env flags (old + new) for one release  
2. Ship demo only; no SHMS promote required  
3. Update AGENT-SHIP-MAP after Vercel project rename  
4. Do not create treasurer projects named pavilion-*

## Status

Checklist only until Rob schedules the Vercel rename. Code/docs can say Pavilion now.
