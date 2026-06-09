# Jumbula → Wix CMS Migration Plan

## Overview

Migrate all historical student/family registrations and program data from Jumbula
into the Wix CMS **Students**, **Programs**, and **Enrollments** collections.
This is a one-time migration — after it runs, all new registrations flow through
the new site.

---

## Step 1 — Export from Jumbula

1. Log in at **app.jumbula.com**
2. Go to **Reports** (or **Registrations**)
3. Look for **Export** or **Download CSV** — typically in the top-right of the roster/registrations view
4. Export the following reports separately if available:
   - **Participants / Registrants** — all student + parent contact info
   - **Registrations / Enrollments** — which student registered for which program
   - **Programs / Activities** — program names, descriptions, fees
5. Save the CSV files to `/Users/robertgregory/wix-shmspto/migration/data/`

> **If you're unsure where to find the export:** go to any program's roster view
> and look for a download icon or "Export" button. Jumbula usually lets you export
> per-program or account-wide.

---

## Step 2 — Inspect the CSV

Once you have the CSV, share a few rows (or paste the header row) so we can
map Jumbula's column names to our Wix CMS fields. Expected Jumbula fields:

| Likely Jumbula column | Maps to Wix Students field |
|---|---|
| Student First Name | `firstName` |
| Student Last Name | `lastName` |
| Grade | `grade` |
| Parent/Guardian Email | `parentEmail` |
| Parent First Name | `parentFirstName` |
| Parent Last Name | `parentLastName` |
| Phone | `parentPhone` |
| Emergency Contact | `emergencyContact` |
| Emergency Phone | `emergencyPhone` |
| Allergies / Medical | `allergies` |
| Registration ID / SID | `jumbulaSid` |

> Field names will differ — we confirm the mapping in Step 2 before running anything.

---

## Step 3 — Run the migration script

```bash
cd /Users/robertgregory/wix-shmspto/migration

# Install dependencies (one-time)
npm install

# Dry run — prints what would be inserted, does NOT write to Wix
node import-to-wix.js --dry-run --file data/participants.csv

# Live run — inserts into Wix Students CMS
node import-to-wix.js --file data/participants.csv
```

The script will:
- Deduplicate by `parentEmail` + student name
- Skip rows that already exist in Wix (safe to re-run)
- Print a summary: X inserted, Y skipped, Z errors

---

## Step 4 — Verify in Wix

1. Go to Wix Dashboard → Content Manager → Students
2. Confirm row count matches Jumbula export
3. Spot-check 3–5 records for accuracy

---

## What the script does NOT migrate

- **Payment history** — Cheddarup handles all future payments; past Jumbula
  payments stay in Jumbula for reference
- **Photos / profile images** — not needed
- **Waivers / signed documents** — stay in Jumbula as legal record

---

## Files

```
migration/
├── MIGRATION_PLAN.md        # This file
├── data/                    # Your exported CSVs go here (gitignored)
│   ├── participants.csv
│   └── programs.csv
├── import-to-wix.js         # Migration script (to be written after CSV inspection)
└── map-schema.js            # Field mapping config (updated after Step 2)
```

---

## Status

- [ ] Rob exports CSV from Jumbula
- [ ] Confirm column names / field mapping
- [ ] Write import-to-wix.js based on actual CSV structure
- [ ] Dry run
- [ ] Live run
- [ ] Verify in Wix CMS
