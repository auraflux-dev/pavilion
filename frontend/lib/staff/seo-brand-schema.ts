/**
 * Neon tables for Brand Staff SEO + Brand Strategy (namespaced).
 * Applied from ensureCommonsReady. No Composio. No DataForSEO.
 */
export const SEO_BRAND_SCHEMA_SQL = `
create table if not exists pavilion_seo_workspace_bundles (
  id text primary key,
  bundle jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists pavilion_seo_audits (
  domain_key text primary key,
  report jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists pavilion_seo_gsc_imports (
  domain_key text primary key,
  import jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists pavilion_brand_kits (
  id text primary key,
  workspace_id text not null,
  status text not null default 'draft',
  title text not null,
  inputs jsonb not null default '{}'::jsonb,
  followups jsonb not null default '[]'::jsonb,
  output_md text,
  output_json jsonb,
  yaml_tokens text,
  model text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists pavilion_brand_kits_workspace_idx
  on pavilion_brand_kits (workspace_id, updated_at desc);

create table if not exists pavilion_brand_kit_versions (
  id text primary key,
  kit_id text not null,
  workspace_id text not null,
  status text not null,
  inputs jsonb not null default '{}'::jsonb,
  followups jsonb not null default '[]'::jsonb,
  output_md text,
  output_json jsonb,
  yaml_tokens text,
  model text,
  created_by text,
  created_at timestamptz not null default now(),
  note text
);

create index if not exists pavilion_brand_kit_versions_kit_idx
  on pavilion_brand_kit_versions (kit_id, created_at desc);
`
