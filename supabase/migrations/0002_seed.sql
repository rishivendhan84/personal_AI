-- Seed data for the single user + default habits (PRD §7.3).
-- Idempotent: safe to re-run.

insert into users (id, name, timezone, current_focus)
values ('00000000-0000-0000-0000-000000000001', 'Rishi', 'America/New_York',
        'Ship the PAIOS vertical slice')
on conflict (id) do nothing;

insert into habits (name, target, active) values
  ('Gym',             '5x/week', true),
  ('Reading',         '30m/day', true),
  ('Deep Work',       '2h/day',  true),
  ('LinkedIn Content','3x/week', true),
  ('Sleep Goal',      '8h',      true),
  ('Daily Planning',  'daily',   true)
on conflict do nothing;
