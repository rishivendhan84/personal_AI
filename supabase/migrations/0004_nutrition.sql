-- Nutrition card (design v2). AI estimates per-meal macros from free text;
-- daily totals are summed deterministically in code (AI never sums numbers).

create table if not exists nutrition_logs (
  id         uuid primary key default gen_random_uuid(),
  log_date   date not null,
  meal       text not null,
  calories   int not null default 0,
  protein_g  numeric(6, 1) not null default 0,
  carbs_g    numeric(6, 1) not null default 0,
  fat_g      numeric(6, 1) not null default 0,
  source     text not null default 'manual' check (source in ('manual', 'telegram')),
  created_at timestamptz not null default now()
);

create index if not exists nutrition_logs_date_idx on nutrition_logs (log_date);

-- Single-row daily macro targets (powers the count-up rings).
create table if not exists nutrition_targets (
  id        uuid primary key default gen_random_uuid(),
  calories  int not null default 2200,
  protein_g numeric(6, 1) not null default 160,
  carbs_g   numeric(6, 1) not null default 220,
  fat_g     numeric(6, 1) not null default 70
);

insert into nutrition_targets (id, calories, protein_g, carbs_g, fat_g)
values ('00000000-0000-0000-0000-0000000000a1', 2200, 160, 220, 70)
on conflict (id) do nothing;

-- Relocate the single user to Chennai, India (design v2).
update users
set timezone = 'Asia/Kolkata', current_location = 'Chennai, India'
where id = '00000000-0000-0000-0000-000000000001';
