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

create table if not exists cms_page_sections (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  page_slug        text not null,
  sort_order       int not null default 0,
  section_type     text not null,
  data_json        text not null default '{}',
  active           boolean not null default true,
  updated_at       timestamptz not null default now()
);

create index if not exists cms_page_sections_org_page_idx
  on cms_page_sections (organization_id, page_slug, sort_order);

create table if not exists cms_site_brand (
  organization_id  text primary key references organizations (id) on delete cascade,
  logo_url         text not null default '',
  favicon_url      text not null default '',
  color_primary    text not null default '',
  color_dark       text not null default '',
  color_accent     text not null default '',
  color_warm       text not null default '',
  color_soft       text not null default '',
  font_sans        text not null default '',
  font_display     text not null default '',
  pto_name         text not null default '',
  school_name      text not null default '',
  cheer            text not null default '',
  updated_at       timestamptz not null default now()
);

create table if not exists cms_custom_pages (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  slug             text not null,
  title            text not null default '',
  show_in_nav      boolean not null default true,
  sort_order       int not null default 99,
  active           boolean not null default true,
  updated_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

create index if not exists cms_custom_pages_org_idx
  on cms_custom_pages (organization_id, sort_order);

create table if not exists cms_community_spaces (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  kind             text not null,
  key              text not null,
  title            text not null,
  sort_order       int not null default 0,
  active           boolean not null default true,
  updated_at       timestamptz not null default now(),
  unique (organization_id, kind, key)
);

create index if not exists cms_community_spaces_org_idx
  on cms_community_spaces (organization_id, sort_order);

create table if not exists cms_community_posts (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  space_id         text not null references cms_community_spaces (id) on delete cascade,
  parent_post_id   text references cms_community_posts (id) on delete cascade,
  author_email     text not null default '',
  author_name      text not null default '',
  author_kind      text not null default 'parent',
  body             text not null default '',
  pinned           boolean not null default false,
  hidden           boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists cms_community_posts_space_idx
  on cms_community_posts (organization_id, space_id, created_at desc);

create table if not exists cms_check_ins (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  kind             text not null,
  code             text not null,
  label            text not null default '',
  event_key        text not null default '',
  checked_in_by    text not null default '',
  checked_in_at    timestamptz not null default now(),
  unique (organization_id, kind, code, event_key)
);

create index if not exists cms_check_ins_event_idx
  on cms_check_ins (organization_id, event_key, checked_in_at desc);

create table if not exists cms_p2p_campaigns (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  slug             text not null,
  title            text not null,
  story            text not null default '',
  goal_cents       int not null default 0,
  active           boolean not null default true,
  updated_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists cms_p2p_pages (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  campaign_id      text not null references cms_p2p_campaigns (id) on delete cascade,
  share_code       text not null,
  owner_email      text not null default '',
  owner_name       text not null default '',
  blurb            text not null default '',
  raised_cents     int not null default 0,
  active           boolean not null default true,
  updated_at       timestamptz not null default now(),
  unique (organization_id, share_code)
);

create index if not exists cms_p2p_pages_campaign_idx
  on cms_p2p_pages (organization_id, campaign_id);

create table if not exists cms_collection_landings (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  slug             text not null,
  title            text not null,
  body             text not null default '',
  item_label       text not null default 'Amount',
  amount_cents     int not null default 0,
  allow_custom     boolean not null default true,
  active           boolean not null default true,
  updated_at       timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists cms_contractor_w9 (
  id               text primary key,
  organization_id  text not null references organizations (id) on delete cascade,
  email            text not null,
  legal_name       text not null default '',
  tin_last4        text not null default '',
  address_line     text not null default '',
  w9_on_file       boolean not null default false,
  ytd_paid_cents   int not null default 0,
  updated_at       timestamptz not null default now(),
  unique (organization_id, email)
);
`
