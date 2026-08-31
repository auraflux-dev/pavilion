# Sales link playbook — demo vs trial

**Audience: product**

## Quick reference

| Scenario | Link | Notes |
|----------|------|-------|
| Website CTA, cold traffic | https://demo.onpavilion.com | No code. Public visitor pages. |
| Conference / social “try Pavilion” | https://demo.onpavilion.com | Same. |
| Live sales call (branded skin) | https://demo.onpavilion.com/review?brand=spring-hill | Brand pack cookie. Code on page or `?code=` below. |
| Vanilla blank trial look (no prospect skin) | https://demo.onpavilion.com/review?brand=vanilla | Neutral shell + “Your School PTO”. |
| Tour staff + member portals | https://demo.onpavilion.com/review | User enters review code. Or pre-fill `?code=` from CRM. |
| Named prospect private trial | https://{slug}.onpavilion.com | Provision first. Email login credentials. |

## Review codes

- **Canonical:** value of `DEMO_JOIN_CODE` on demo Vercel project (set one code in ops).
- **Legacy aliases** (still accepted): `riverside-board`, `66988432952500a7587ff938` via `DEMO_JOIN_CODE_ALIASES`.
- **Per-prospect codes:** optional future CRM field. Today use one shared code + CRM tracks who opened the link.

## Sales motion

### 1. Discovery (non-targeted)

Send: **https://demo.onpavilion.com**

Prospect browses home, programs, events, membership, store. No login required.

### 2. Qualified call (targeted demo)

Before the call:

```
https://demo.onpavilion.com/review?brand=spring-hill&code=<review-code>
```

On the call: Staff lane / Parent lane from green banner or review join.

### 3. Serious evaluation (trial)

After the call, provision org:

```
https://demo.onpavilion.com/trial?key=<provision-secret>
```

Or internal ops provision → send:

```
https://spring-hill.onpavilion.com/login
```

Trial is login-gated. No brand switcher. Their org CMS rows.

## Do not

- Send `onpavilion.com` for product tour (marketing only).
- Treat demo ship as www.shmspto.org update.
- Put trial and demo on separate Vercel projects (one stack, host routing).

## Code helpers

```typescript
import { PAVILION_DEMO_URL, pavilionDemoTourUrl, pavilionTrialUrl } from '@/lib/demo/review-links'

PAVILION_DEMO_URL // https://demo.onpavilion.com
pavilionDemoTourUrl({ brand: 'spring-hill', code: '…' })
pavilionTrialUrl('spring-hill') // https://spring-hill.onpavilion.com
```
