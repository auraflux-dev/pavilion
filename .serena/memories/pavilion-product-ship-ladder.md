# Pavilion product ship ladder

Rob (2026-08-27): Leave named customers out of mind while building a feature.

1. Build + browser QA + e2e on **Pavilion** (`~/pavilion`, commons-pto-demo).
2. When fully built and trusted, ship to that **customer’s staging**, re-test.
3. Only then push **customer prod**.

Demo ship ≠ any customer live. Do not open promote/staging work mid-build unless Rob asks.

Docs: `docs/PRODUCT-VS-CUSTOMER.md`. Rule: `hskrg-board-workflow.mdc` Feature ship ladder.