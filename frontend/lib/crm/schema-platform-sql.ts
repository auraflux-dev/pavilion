/** Tenant isolation, connectors, sync, audit, errors. Applied after CRM_SCHEMA_SQL. */
export const CRM_PLATFORM_SQL = `
alter table organizations add column if not exists plan text not null default 'demo';
alter table organizations add column if not exists trial_started_at timestamptz;
alter table organizations add column if not exists trial_ends_at timestamptz;
alter table organizations add column if not exists custom_domain text not null default '';
alter table organizations add column if not exists temp_host text not null default '';
alter table organizations add column if not exists brand_pack_slug text not null default '';
alter table organizations add column if not exists store_card_enabled boolean not null default false;

alter table students add column if not exists organization_id text references organizations (id) on delete cascade;
alter table memberships add column if not exists organization_id text references organizations (id) on delete cascade;
alter table store_cards add column if not exists organization_id text references organizations (id) on delete cascade;
alter table staff_assignments add column if not exists organization_id text references organizations (id) on delete cascade;

update students s
   set organization_id = h.organization_id
  from households h
 where s.household_id = h.id
   and s.organization_id is null;

update memberships m
   set organization_id = h.organization_id
  from households h
 where m.household_id = h.id
   and m.organization_id is null;

update store_cards c
   set organization_id = h.organization_id
  from households h
 where c.household_id = h.id
   and c.organization_id is null;

update staff_assignments a
   set organization_id = p.organization_id
  from people p
 where a.person_id = p.id
   and a.organization_id is null;

create index if not exists students_org_idx on students (organization_id);
create index if not exists memberships_org_idx on memberships (organization_id);
create index if not exists store_cards_org_idx on store_cards (organization_id);
create index if not exists staff_assignments_org_idx on staff_assignments (organization_id);

create table if not exists organization_connectors (
  organization_id  text not null references organizations (id) on delete cascade,
  provider         text not null check (provider in ('square', 'plaid')),
  ciphertext       text not null,
  merchant_id      text not null default '',
  item_id          text not null default '',
  expires_at       timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (organization_id, provider)
);

create index if not exists organization_connectors_merchant_idx
  on organization_connectors (merchant_id) where merchant_id <> '';
create index if not exists organization_connectors_item_idx
  on organization_connectors (item_id) where item_id <> '';

create table if not exists organization_sync_state (
  organization_id     text primary key references organizations (id) on delete cascade,
  square_last_ok_at   timestamptz,
  plaid_last_ok_at    timestamptz,
  backup_last_ok_at   timestamptz,
  square_error        text not null default '',
  plaid_error         text not null default '',
  backup_error        text not null default '',
  updated_at          timestamptz not null default now()
);

create table if not exists staff_audit (
  id               bigserial primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  action           text not null,
  actor_email      text not null,
  target_email     text not null default '',
  detail           text not null default '',
  route            text not null default '',
  ip               text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists staff_audit_org_idx on staff_audit (organization_id, created_at desc);

create table if not exists platform_activity (
  id                bigserial primary key,
  organization_id   text not null references organizations (id) on delete cascade,
  category          text not null default 'auth',
  action            text not null,
  actor_kind        text not null default 'anonymous',
  email_hash        text not null default '',
  email_domain      text not null default '',
  method            text not null default '',
  outcome           text not null default 'ok',
  route             text not null default '',
  ip                text not null default '',
  user_agent_class  text not null default '',
  correlation_id    text not null default '',
  detail            text not null default '',
  created_at        timestamptz not null default now()
);

create index if not exists platform_activity_org_idx
  on platform_activity (organization_id, created_at desc);
create index if not exists platform_activity_category_idx
  on platform_activity (organization_id, category, created_at desc);

create table if not exists error_events (
  event_id         text primary key,
  organization_id  text references organizations (id) on delete set null,
  route            text not null default '',
  message          text not null,
  stack            text not null default '',
  tags_json        text not null default '{}',
  extra_json       text not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists error_events_org_idx on error_events (organization_id, created_at desc);

-- RLS policies exist so we can ENABLE ROW LEVEL SECURITY after every query uses sqlForOrg.
do $$ begin
  begin
    create policy people_org on people
      using (organization_id = current_setting('app.org_id', true));
  exception
    when duplicate_object then null;
  end;
end $$;
`
