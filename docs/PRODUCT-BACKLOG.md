# Pavilion product backlog (active — no SHMS www required)

Work these on **`~/pavilion`** / robert-4220 only. Do **not** promote or `ship-stone-hill` unless Rob asks.

## Active (safe for www)

| ID | Item | Status | Notes |
|----|------|--------|-------|
| P1 | **Host → tenant resolution** | Done | Host lookup + middleware locked gate + [HOST-TENANT-DNS.md](./HOST-TENANT-DNS.md) |
| P2 | **Brand pack → trial org seed** | Done | `brand_pack_slug` + vanilla pack on trial start |
| P3 | **Lumi customer path** | Docs | `iss_NHhBTGWQD1Ln` — [CUSTOMER-LUMI.md](./CUSTOMER-LUMI.md) |
| P4 | **Rename commons-* → Pavilion** | Docs | `iss_0Birrzq59_JH` — [RENAME-COMMONS-TO-PAVILION.md](./RENAME-COMMONS-TO-PAVILION.md) |
| P5 | **Public Pavilion GitHub org** | Prep done | `iss_NWtbFIlbmiLL` — [PUBLIC-REPO-PREP.md](./PUBLIC-REPO-PREP.md) — Rob OK to transfer |
| P6 | **Retire legacy `commons-pto` host** | Docs | [RETIRE-COMMONS-PTO.md](./RETIRE-COMMONS-PTO.md) — project delete Rob OK |
| P7 | **Connector secrets UX** | Done | Staff Payments panel + `/api/commons/connectors` |

## Blocked on Rob / off-peak (www)

| ID | Item |
|----|------|
| S1 | `promote-to-shms --apply` + review (VIP path — [CUSTOMER-SHMS-VIP.md](./CUSTOMER-SHMS-VIP.md)) |
| S2 | `ship-stone-hill.mjs` (live www) |

## Product policy

- **SHMS = VIP dedicated** on treasurer. Do not migrate www to multi-tenant demo/platform hosts.
- Shared stack = new prospects / trials. Dedicated Vercel (or Wix wall) = customer SKUs.
