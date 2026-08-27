/**
 * Pavilion CMS — authoritative org-scoped content store (Postgres).
 * SHMS still uses Wix as the publish target until sync/promote; product Staff edits here.
 */
export const CMS_SCHEMA_SQL = `
create table if not exists cms_site_settings (
  organization_id  text not null references organizations (id) on delete cascade,
  key              text not null,
  value            text not null default '',
  updated_at       timestamptz not null default now(),
  primary key (organization_id, key)
);

create index if not exists cms_site_settings_org_idx
  on cms_site_settings (organization_id);

create table if not exists cms_page_content (
  organization_id  text not null references organizations (id) on delete cascade,
  page             text not null,
  eyebrow          text not null default '',
  title            text not null default '',
  body             text not null default '',
  section_title    text not null default '',
  section_body     text not null default '',
  bullets          text not null default '',
  cta_label        text not null default '',
  cta_href         text not null default '',
  flyer_image      text not null default '',
  custom_css       text not null default '',
  string_overrides text not null default '',
  active           boolean not null default true,
  updated_at       timestamptz not null default now(),
  primary key (organization_id, page)
);

create index if not exists cms_page_content_org_idx
  on cms_page_content (organization_id);

create table if not exists cms_nav_links (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  label            text not null,
  href             text not null,
  sort_order       int not null default 99,
  show_in_nav      boolean not null default true,
  show_in_footer   boolean not null default false,
  active           boolean not null default true,
  updated_at       timestamptz not null default now()
);

create index if not exists cms_nav_links_org_idx
  on cms_nav_links (organization_id, sort_order);

create table if not exists cms_collection_items (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  collection       text not null,
  sort_order       int not null default 0,
  data_json        text not null default '{}',
  active           boolean not null default true,
  updated_at       timestamptz not null default now()
);

create index if not exists cms_collection_items_org_coll_idx
  on cms_collection_items (organization_id, collection, sort_order);

create table if not exists cms_form_submissions (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  form_kind        text not null,
  status           text not null default 'new',
  payload_json     text not null default '{}',
  submitted_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists cms_form_submissions_org_kind_idx
  on cms_form_submissions (organization_id, form_kind, submitted_at desc);
`
