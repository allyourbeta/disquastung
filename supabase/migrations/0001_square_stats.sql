-- Per-square stats for the weighted color-drill selection. Dormant until a
-- Supabase project exists (see MORNING_REPORT.md's activation steps).
create table if not exists square_stats (
  user_id uuid references auth.users not null,
  square text check (square ~ '^[a-h][1-8]$') not null,
  drill text not null,
  seen int default 0,
  misses int default 0,
  updated_at timestamptz,
  primary key (user_id, square, drill)
);

alter table square_stats enable row level security;

create policy "select own square_stats"
  on square_stats for select
  using (auth.uid() = user_id);

create policy "insert own square_stats"
  on square_stats for insert
  with check (auth.uid() = user_id);

create policy "update own square_stats"
  on square_stats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
