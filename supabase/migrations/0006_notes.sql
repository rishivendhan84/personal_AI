-- Notes (Google Keep–style). Single-user app: RLS is enabled (server uses the
-- service_role key, which bypasses RLS) to keep the table locked down by default.
create extension if not exists "pgcrypto";

create table if not exists notes (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  body        text,
  checklist   jsonb,                                   -- [{ "text": "...", "checked": false }]
  color       text not null default 'default',
  pinned      boolean not null default false,
  archived    boolean not null default false,
  labels      text[] not null default '{}',
  source      text not null default 'app',             -- 'app' | 'keep_takeout'
  keep_id     text unique,                             -- Keep Takeout id (createdTimestampUsec) for re-import dedupe
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Board ordering: open notes first, pinned on top, most-recently-edited first.
create index if not exists notes_board_idx on notes (archived, pinned desc, updated_at desc);

alter table notes enable row level security;
