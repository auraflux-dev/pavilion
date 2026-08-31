# New lead → private trial (ops)

**Audience: product**

Domain registration for `onpavilion.com` stays on the **SHMS / treasurer** Vercel team (move is disallowed). robert-4220 projects claim hostnames via TXT on that DNS zone.

## Ladder

1. **Discovery:** https://demo.onpavilion.com  
2. **Sales call:** https://demo.onpavilion.com/review?brand=spring-hill&code=…  
3. **Vanilla preview (no prospect skin):** https://demo.onpavilion.com/review?brand=vanilla  
4. **Private trial:** provision → https://{slug}.onpavilion.com/login  

## Provision (ops)

1. Open:

```text
https://demo.onpavilion.com/trial?key=<COMMONS_PROVISION_SECRET>
```

2. Fill:
   - School / PTO name
   - Slug (not `riverside`)
   - Brand pack: **blank** for vanilla, or `spring-hill` for a named pack
   - Treasurer email + password

3. Submit. Note `tempHost` (e.g. `oak-street.onpavilion.com`).

4. Attach hostname (until project wildcard is verified):

```bash
# From pavilion (robert-4220): add domain to commons-pto-demo
# From shmspto: add the verify TXT Vercel returns
node scripts/attach-trial-host.mjs --slug oak-street
```

Or manually:
- **commons-pto-demo → Domains → Add** `{slug}.onpavilion.com`
- Copy TXT → add on SHMS team DNS for `onpavilion.com` (`_vercel`)
- Verify on robert-4220

5. Email the lead:

```text
Login: https://{slug}.onpavilion.com/login
Email: …
Password: …
Trial ends: (30 days)
```

## Env (commons-pto-demo production)

Required for provision on the unified stack:

```text
DEMO_INSTANCE=true
NEXT_PUBLIC_DEMO_INSTANCE=true
PAVILION_PLATFORM=true
NEXT_PUBLIC_PAVILION_PLATFORM=true
PAVILION_TRIAL_DOMAIN_SUFFIX=onpavilion.com
PAVILION_DEMO_HOST=demo.onpavilion.com
NEXT_PUBLIC_PAVILION_DEMO_ORIGIN=https://demo.onpavilion.com
NEXT_PUBLIC_SITE_URL=https://demo.onpavilion.com
COMMONS_PROVISION_SECRET=<same as legacy commons-pto>
COMMONS_TEMP_DOMAIN_SUFFIX=onpavilion.com
```

## Vanilla vs branded

| | Vanilla | Named pack |
|--|---------|------------|
| Brand pack field | blank | e.g. `spring-hill` |
| Look | Neutral colors, school name only, empty events/board/tiers | Prospect skin + sample content |
| Demo preview | `?brand=vanilla` | `?brand=spring-hill` |

## Checklist

```
[ ] Lead name + slug
[ ] Vanilla or named pack
[ ] /trial?key=… provision
[ ] Attach {slug}.onpavilion.com + TXT verify
[ ] Smoke /login → staff
[ ] Send credentials
[ ] Note trial_ends_at
```

See also: `docs/SALES-LINK-PLAYBOOK.md`, `docs/PAVILION-DEMO-TRIAL-HOSTS.md`
