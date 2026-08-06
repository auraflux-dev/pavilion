# Staff vs Google email audit

Generated 2026-08-06T12:00:10.526Z

## Google Admin

**Not pulled yet.** Authenticate GAM, then:

```bash
gam oauth create
gam print users fields primaryEmail,name,suspended,orgUnitPath,lastLoginTime > tmp/google-admin-users.csv
node scripts/compare-staff-google-emails.mjs
```

## StaffRoles (CMS)

| Email | Active | Roles | Board title | Personal |
|-------|--------|-------|-------------|----------|
| gregory.robert.c@gmail.com | false | admin | President | — |
| treasurer@shmspto.org | true | admin | President | gregory.robert.c@gmail.com |

## BoardMembers with email

| Name | Role | Email |
|------|------|-------|
| Jada Santos | Cove Coordinator | cove@shmspto.org |
| Robert Gregory | President | president@shmspto.org |
| Open Position | Secretary | secretary@shmspto.org |
| Open Position | Treasurer | treasurer@shmspto.org |
| Shruti Sagar | VP Events | vp-events@shmspto.org |
| Diane Worden | VP Marketing | vp-marketing@shmspto.org |
| Shweta Walia | VP Membership Experience | vp-membershipexperience@shmspto.org |
| Pallavi Muley | VP Fundraising & Programs | vp-programs@shmspto.org |
| Grace Huang | VP Digital & Retail Sales | vp-sales@shmspto.org |
| Bayan Souqi | Teacher & Staff Wellness | wellness@shmspto.org |

## Gaps

### Board / expected alias but **no active StaffRoles**
- cove@shmspto.org
- info@shmspto.org
- marketing@shmspto.org
- membership@shmspto.org
- noreply@shmspto.org
- president@shmspto.org
- programs@shmspto.org
- secretary@shmspto.org
- vp-events@shmspto.org
- vp-initiatives@shmspto.org
- vp-marketing@shmspto.org
- vp-membershipexperience@shmspto.org
- vp-programs@shmspto.org
- vp-sales@shmspto.org
- wellness@shmspto.org

### Active StaffRoles not on public board
- (none)
