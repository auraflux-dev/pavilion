Commons sales and onboarding (locked).

## Do not auto-provision on pay
Checkout does not spin up a live tenant. Branding and a human trial pass come first.

## Funnel
1. **Sales → trial**
   Build a private trial to best available spec: logo, colors, school name, core pages.
   Board must recognize their PTO (not Riverside demo skin, not Stone Hill).
2. **Trial → customer keys (prune)**
   During trial, give the board **keys** (Staff controls) to turn off or hide what they do not offer or what does not make sense (e.g. store window, spirit wear, Cove/card, specific programs, fundraising lanes).
   Goal: the trial feels like *their* PTO setup, not a full SHMS feature dump.
   Prefer feature flags / surface gates per org over deleting code.
3. **Trial → feedback**
   They use Staff / member surfaces. Collect “what else” (store, creative, books, partners).
   Feedback is backlog for after pay, not a gate to subscribe.
4. **Pay → small start**
   Starting to pay = HSKRG LLC Stripe subscription + approved **look and feel** + their pruned surface set.
   `/account` for invoices, payment methods, add-ons.
   Not a full custom build on day one of payment.
5. **After pay → onboarding development**
   Deeper work (store window, creative, treasurer flows, integrations) is done **with/for them** under the subscription.

## Money split
- Commons SaaS: HSKRG Stripe (marketing + `/account`). Never Auraflux branding on invoices.
- School parent cards / in-person: that school’s Square.

## Support split
- Platform help (what Commons is, billing, add-ons, partners): commons-site `/help`.
- Day-to-day PTO ops: each tenant’s Staff/Member portals (SHMS-style KB).

## Marketing proof (required)
commons-site must show:
- **Explainer videos** (product walkthroughs: public site, family portal, staff portal, billing).
- **Gallery of sites we build**, including **trial** instances (anonymize or permission as needed), so boards see real look-and-feel outcomes before/during sales.