/** Sign-up sheets (SignUpGenius-style) — org-scoped via sqlForOrg + organization_id. */
export const SIGNUPS_SCHEMA_SQL = `
create table if not exists signup_sheets (
  id                 text primary key,
  organization_id    text not null references organizations (id) on delete cascade,
  slug               text not null,
  title              text not null,
  description        text not null default '',
  location           text not null default '',
  starts_at          timestamptz,
  ends_at            timestamptz,
  timezone           text not null default 'America/New_York',
  status             text not null default 'draft'
                       check (status in ('draft', 'published', 'closed')),
  settings_json      text not null default '{}',
  created_by_email   text not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists signup_sheets_org_idx on signup_sheets (organization_id, updated_at desc);
create index if not exists signup_sheets_org_slug_idx on signup_sheets (organization_id, slug);

create table if not exists signup_sheet_fields (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  sheet_id         text not null references signup_sheets (id) on delete cascade,
  field_key        text not null,
  label            text not null,
  field_type       text not null default 'text'
                     check (field_type in ('text', 'email', 'phone', 'textarea', 'select', 'checkbox')),
  required         boolean not null default false,
  options_json     text not null default '[]',
  sort_order       int not null default 0,
  unique (sheet_id, field_key)
);

create index if not exists signup_sheet_fields_sheet_idx on signup_sheet_fields (sheet_id, sort_order);

create table if not exists signup_slots (
  id                 text primary key,
  organization_id    text not null references organizations (id) on delete cascade,
  sheet_id           text not null references signup_sheets (id) on delete cascade,
  slot_type          text not null default 'quantity'
                       check (slot_type in ('time', 'item', 'quantity')),
  title              text not null,
  description        text not null default '',
  starts_at          timestamptz,
  ends_at            timestamptz,
  quantity_needed    int not null default 1,
  quantity_claimed   int not null default 0,
  item_unit          text not null default '',
  sort_order         int not null default 0
);

create index if not exists signup_slots_sheet_idx on signup_slots (sheet_id, sort_order);

create table if not exists signup_registrations (
  id                  text primary key,
  organization_id     text not null references organizations (id) on delete cascade,
  sheet_id            text not null references signup_sheets (id) on delete cascade,
  slot_id             text not null references signup_slots (id) on delete cascade,
  participant_name    text not null default '',
  participant_email   text not null default '',
  participant_phone   text not null default '',
  custom_answers_json text not null default '{}',
  auth_user_id        text not null default '',
  quantity            int not null default 1,
  confirmation_token  text not null default '',
  reminder_sent_at    timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists signup_registrations_sheet_idx on signup_registrations (sheet_id, created_at desc);
create index if not exists signup_registrations_slot_idx on signup_registrations (slot_id);
create index if not exists signup_registrations_email_idx on signup_registrations (sheet_id, participant_email);

create table if not exists signup_messages (
  id               bigserial primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  sheet_id         text not null references signup_sheets (id) on delete cascade,
  subject          text not null,
  body             text not null,
  audience         text not null default 'all'
                     check (audience in ('all', 'slot', 'custom')),
  slot_id          text not null default '',
  sent_by_email    text not null default '',
  sent_at          timestamptz not null default now()
);

create index if not exists signup_messages_sheet_idx on signup_messages (sheet_id, sent_at desc);
`
