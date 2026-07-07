-- ============================================================================
-- schema.sql — Postgres schema for the Bio-Inspired Design Atlas (Supabase)
--
-- This is the "real" backend that replaces the browser-localStorage prototype.
-- The table shapes intentionally mirror js/store.js so the front-end swap is
-- mechanical (see README.md → "Going live with Supabase").
--
-- Run this in the Supabase SQL editor. Auth (Google / ORCID) is configured in
-- the Supabase dashboard, not here — see README.md.
-- ============================================================================

-- ---- Papers ----------------------------------------------------------------
create table if not exists papers (
  id           uuid primary key default gen_random_uuid(),
  doi          text,
  title        text,
  first_author text,
  label        text not null,     -- compact citation, e.g. "Kriegman et al. (2020)"
  year         int,
  link         text,
  blurb        text,
  author_id    uuid references auth.users (id) on delete set null,
  author_name  text,
  seed         boolean not null default false,
  created_at   timestamptz not null default now()
);
-- Prevent duplicate submissions of the same paper (case-insensitive DOI).
-- Seed rows have a null DOI, which is exempt from uniqueness.
create unique index if not exists papers_doi_unique on papers (lower(doi)) where doi is not null;

-- ---- Comments (self-referential thread) -----------------------------------
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references papers (id) on delete cascade,
  parent_id   uuid references comments (id) on delete cascade,
  body        text not null default '',
  author_id   uuid references auth.users (id) on delete set null,
  author_name text,
  deleted     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists comments_paper_idx on comments (paper_id);
create index if not exists comments_parent_idx on comments (parent_id);

-- ---- Classification suggestions (drive the map position) ------------------
create table if not exists suggestions (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null references papers (id) on delete cascade,
  comment_id  uuid references comments (id) on delete cascade,
  x           real not null check (x >= 0 and x <= 1),  -- 0=Science .. 1=Engineering
  y           real not null check (y >= 0 and y <= 1),  -- 0=Low bio  .. 1=High bio
  categories  text[] not null default '{}',
  author_id   uuid references auth.users (id) on delete set null,
  author_name text,
  created_at  timestamptz not null default now()
);
create index if not exists suggestions_paper_idx on suggestions (paper_id);

-- ---- Comment votes (one row per user per comment) -------------------------
create table if not exists votes (
  comment_id  uuid not null references comments (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  dir         smallint not null check (dir in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- ---- Derived view: mean position + counts per paper -----------------------
create or replace view paper_positions as
select
  p.id                                                                    as paper_id,
  (select count(*) from suggestions s where s.paper_id = p.id)            as suggestion_count,
  (select avg(s.x) from suggestions s where s.paper_id = p.id)::real      as x,
  (select avg(s.y) from suggestions s where s.paper_id = p.id)::real      as y,
  (select count(*) from comments c
     where c.paper_id = p.id and not c.deleted)                          as comment_count
from papers p;

-- ---- Derived view: category tally per paper -------------------------------
create or replace view paper_category_tally as
select
  s.paper_id,
  cat            as category_id,
  count(*)::int  as votes
from suggestions s
cross join lateral unnest(s.categories) as cat
group by s.paper_id, cat;

-- ============================================================================
-- Row-Level Security
--   * anyone (even anonymous) may READ
--   * only signed-in users may INSERT, and only as themselves
--   * users may UPDATE/DELETE only their own rows
-- ============================================================================
alter table papers      enable row level security;
alter table comments    enable row level security;
alter table suggestions enable row level security;
alter table votes       enable row level security;

-- Policies are dropped-if-exists first so this whole file is safe to re-run.
-- Papers
drop policy if exists "papers readable"     on papers;
drop policy if exists "papers insert own"   on papers;
drop policy if exists "papers update own"   on papers;
drop policy if exists "papers delete own"   on papers;
create policy "papers readable"        on papers    for select using (true);
create policy "papers insert own"      on papers    for insert with check (auth.uid() = author_id);
create policy "papers update own"      on papers    for update using (auth.uid() = author_id);
create policy "papers delete own"      on papers    for delete using (auth.uid() = author_id);

-- Comments
drop policy if exists "comments readable"   on comments;
drop policy if exists "comments insert own" on comments;
drop policy if exists "comments update own" on comments;
drop policy if exists "comments delete own" on comments;
create policy "comments readable"      on comments  for select using (true);
create policy "comments insert own"    on comments  for insert with check (auth.uid() = author_id);
create policy "comments update own"    on comments  for update using (auth.uid() = author_id);
create policy "comments delete own"    on comments  for delete using (auth.uid() = author_id);

-- Suggestions
drop policy if exists "suggestions readable"   on suggestions;
drop policy if exists "suggestions insert own" on suggestions;
drop policy if exists "suggestions delete own" on suggestions;
create policy "suggestions readable"   on suggestions for select using (true);
create policy "suggestions insert own" on suggestions for insert with check (auth.uid() = author_id);
create policy "suggestions delete own" on suggestions for delete using (auth.uid() = author_id);

-- Votes
drop policy if exists "votes readable"   on votes;
drop policy if exists "votes upsert own" on votes;
drop policy if exists "votes update own" on votes;
drop policy if exists "votes delete own" on votes;
create policy "votes readable"         on votes     for select using (true);
create policy "votes upsert own"       on votes     for insert with check (auth.uid() = user_id);
create policy "votes update own"       on votes     for update using (auth.uid() = user_id);
create policy "votes delete own"       on votes     for delete using (auth.uid() = user_id);

-- ============================================================================
-- Table-level GRANTs (REQUIRED — RLS alone is not enough)
-- PostgREST talks to the DB as `anon` (logged-out) or `authenticated` (signed
-- in). Those roles need table privileges before RLS row rules even apply.
-- Supabase usually auto-grants these; this makes it explicit and portable.
-- ============================================================================
grant usage on schema public to anon, authenticated;

-- everyone (incl. logged-out) may READ the tables and the two views
grant select on papers, comments, suggestions, votes to anon, authenticated;
grant select on paper_positions, paper_category_tally to anon, authenticated;

-- only signed-in users may WRITE (RLS further restricts them to their own rows)
grant insert, update, delete on papers, comments, suggestions, votes to authenticated;
