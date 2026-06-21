-- Focus / Pomodoro sessions (logged on each completed focus phase, design v3).
-- RLS enabled inline so the public anon key can't read it (server uses service role).

create table if not exists focus_sessions (
  id           uuid primary key default gen_random_uuid(),
  mode         text not null check (mode in ('quick', 'deep', 'learning')),
  minutes      int not null,
  task_id      uuid references tasks(id) on delete set null,
  task_title   text,
  completed_at timestamptz not null default now()
);

create index if not exists focus_sessions_completed_idx on focus_sessions (completed_at);

alter table focus_sessions enable row level security;
