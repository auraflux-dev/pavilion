/** Same DDL as schema.sql — inlined so Vercel bundles it. */
export const CRM_SCHEMA_SQL = `
create table if not exists organizations (
  id            text primary key,
  name          text not null,
  slug          text not null unique,
  created_at    timestamptz not null default now()
);

create table if not exists people (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  email            text not null,
  first_name       text not null default '',
  last_name        text not null default '',
  phone            text not null default '',
  auth_user_id     text,
  created_at       timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists people_org_email_idx on people (organization_id, email);

create table if not exists households (
  id                       text primary key,
  organization_id          text not null references organizations (id) on delete cascade,
  primary_person_id        text not null references people (id),
  confirmed_at             timestamptz,
  emergency_contact_name   text not null default '',
  emergency_contact_phone  text not null default '',
  pickup_authorized        text not null default '',
  created_at               timestamptz not null default now()
);

create index if not exists households_org_idx on households (organization_id);
create index if not exists households_primary_idx on households (primary_person_id);

create table if not exists household_adults (
  household_id  text not null references households (id) on delete cascade,
  person_id     text not null references people (id) on delete cascade,
  role          text not null check (role in ('primary', 'guardian')),
  invited_at    timestamptz,
  accepted_at   timestamptz,
  primary key (household_id, person_id)
);

create table if not exists students (
  id                   text primary key,
  household_id         text not null references households (id) on delete cascade,
  first_name           text not null,
  last_name            text not null,
  grade                text not null,
  archived             boolean not null default false,
  allergies            text not null default '',
  medical_conditions   text not null default '',
  medications          text not null default '',
  self_release         boolean not null default false,
  photo_media_consent  boolean,
  created_at           timestamptz not null default now()
);

create index if not exists students_household_idx on students (household_id);

create table if not exists memberships (
  id            text primary key,
  household_id  text not null unique references households (id) on delete cascade,
  tier          text not null check (tier in ('free', 'reef', 'lagoon', 'tide', 'faculty')),
  status        text not null check (status in ('none', 'active', 'expired')),
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

create table if not exists store_cards (
  id            text primary key,
  household_id  text not null unique references households (id) on delete cascade,
  gan           text not null default '',
  external_id   text not null default '',
  balance_cents integer not null default 0 check (balance_cents >= 0),
  updated_at    timestamptz not null default now()
);

create table if not exists staff_assignments (
  person_id    text not null references people (id) on delete cascade,
  role         text not null,
  board_title  text not null default '',
  primary key (person_id, role)
);
`
