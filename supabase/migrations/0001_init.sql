-- PAIOS — Personal AI Operating System
-- Initial schema. Single-user system: the user row is hardcoded/seeded, no auth.
-- Mirrors PRD §9. AI never writes numbers (finance/effort are deterministic in code).

-- pgvector for the Brain (selective embedding: freeform text only).
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- users  (single row, seeded)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  timezone         text not null default 'UTC',
  telegram_id      text unique,
  current_focus    text,
  current_location text,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- goals  →  goal_projects  →  tasks   (the alignment hierarchy)
-- ---------------------------------------------------------------------------
create table if not exists goals (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  type         text not null check (type in ('weekly', 'monthly')),
  period_start date not null,                 -- real date, not a sentinel
  status       text not null default 'active' check (status in ('active', 'done', 'archived')),
  created_at   timestamptz not null default now()
);

create table if not exists goal_projects (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references goals(id) on delete cascade,
  title      text not null,
  status     text not null default 'active' check (status in ('active', 'done', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  category          text not null default 'Personal'
                      check (category in ('Work', 'Learning', 'Personal', 'Business', 'Fitness')),
  urgency           text not null default 'week'
                      check (urgency in ('today', 'week', 'month', 'someday')),
  status            text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  due_date          timestamptz,
  effort_score      int check (effort_score between 1 and 5),   -- 1=quick, 5=deep work
  goal_id           uuid references goals(id) on delete set null,
  project_id        uuid references goal_projects(id) on delete set null,
  ai_priority_score double precision,                            -- computed, never on page load
  source            text not null default 'manual' check (source in ('manual', 'telegram')),
  sort_order        int not null default 0,                      -- drag-and-drop reorder
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);

create index if not exists tasks_urgency_idx on tasks (urgency);
create index if not exists tasks_status_idx on tasks (status);
create index if not exists tasks_goal_idx on tasks (goal_id);

-- ---------------------------------------------------------------------------
-- habits  +  habit_logs  (append-only; history is never deleted)
-- ---------------------------------------------------------------------------
create table if not exists habits (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  target text,                                  -- e.g. "5x/week", "8h"
  active boolean not null default true
);

create table if not exists habit_logs (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid not null references habits(id) on delete cascade,
  log_date     date not null,                   -- the day the habit counts for (user TZ)
  completed_at timestamptz not null default now(),
  unique (habit_id, log_date)                   -- one completion per habit per day
);

create index if not exists habit_logs_date_idx on habit_logs (log_date);

-- ---------------------------------------------------------------------------
-- captures  (every inbound item; confirmable / correctable)
-- ---------------------------------------------------------------------------
create table if not exists captures (
  id                  uuid primary key default gen_random_uuid(),
  raw_text            text,
  transcript          text,
  source              text not null default 'text' check (source in ('text', 'voice')),
  classified_type     text,                      -- task|note|journal|habit|...
  classified_category text,
  classified_urgency  text,
  tags                text[] not null default '{}',
  target_table        text,
  target_row_id       uuid,
  confidence          double precision,
  status              text not null default 'pending_confirm'
                        check (status in ('pending_confirm', 'confirmed', 'corrected')),
  created_at          timestamptz not null default now()
);

create index if not exists captures_status_idx on captures (status);

-- ---------------------------------------------------------------------------
-- memory_chunks  (Brain — freeform text only, selective embedding)
-- Gemini text-embedding-004 = 768 dims (canonical embedder; see PRD §10).
-- ---------------------------------------------------------------------------
create table if not exists memory_chunks (
  id          uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('journal', 'voice', 'note')),
  source_id   uuid,
  content     text not null,
  embedding   vector(768),
  created_at  timestamptz not null default now()
);

-- Approximate nearest-neighbour index for fuzzy recall.
create index if not exists memory_chunks_embedding_idx
  on memory_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------------
-- daily_briefs  (cached; dashboard reads this, never calls AI on load)
-- ---------------------------------------------------------------------------
create table if not exists daily_briefs (
  id           uuid primary key default gen_random_uuid(),
  brief_date   date not null unique,
  content      jsonb not null,
  generated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- daily_reviews  (the feedback loop — feeds tomorrow's ranking)
-- ---------------------------------------------------------------------------
create table if not exists daily_reviews (
  id             uuid primary key default gen_random_uuid(),
  review_date    date not null unique,
  top3_task_ids  uuid[] not null default '{}',
  top3_completed boolean[] not null default '{}',
  notes          text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- nudges  (powers the Direction Engine)
-- ---------------------------------------------------------------------------
create table if not exists nudges (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('brief', 'midday', 'slip', 'evening', 'context')),
  scheduled_for timestamptz,
  sent_at       timestamptz,
  content       text,
  acted_on      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists nudges_type_idx on nudges (type);

-- ---------------------------------------------------------------------------
-- finance_snapshots  (deterministic sums; AI only categorizes upstream)
-- ---------------------------------------------------------------------------
create table if not exists finance_snapshots (
  id            uuid primary key default gen_random_uuid(),
  snapshot_date date not null unique,
  net_worth     numeric(14, 2) not null,        -- computed sum, not AI output
  categories    jsonb not null default '{}',
  monthly_spend numeric(14, 2),
  savings_rate  double precision,
  computed_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- calendar_events  (cached from Google Calendar API)
-- ---------------------------------------------------------------------------
create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,
  title       text not null,
  start_at    timestamptz not null,
  end_at      timestamptz,
  location    text,
  synced_at   timestamptz not null default now()
);

create index if not exists calendar_events_start_idx on calendar_events (start_at);
