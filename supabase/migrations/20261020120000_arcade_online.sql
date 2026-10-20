-- CoreNode Arcade, phase 1: players, seasons, scores, leaderboards.
-- NOT applied automatically. Review, then run with `supabase db push`
-- or paste into the Supabase SQL editor.

-- ---------------------------------------------------------------
-- Seasons
-- ---------------------------------------------------------------
create table if not exists public.arcade_seasons (
  id          text primary key,
  name        text not null,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- At most one active season at a time.
create unique index if not exists arcade_seasons_one_active
  on public.arcade_seasons (is_active) where is_active;

insert into public.arcade_seasons (id, name, starts_at, is_active)
values ('all-time', 'All Time', '2026-01-01T00:00:00Z', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Players (chosen character per account)
-- ---------------------------------------------------------------
create table if not exists public.arcade_players (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  character_id  text not null default 'charlie',
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Scores (one row per finished run)
-- ---------------------------------------------------------------
create table if not exists public.arcade_scores (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  game_id     text not null check (game_id in ('neon-chase', 'void-beast', 'aquatic-rush')),
  score       integer not null check (score >= 0 and score <= 10000000),
  season_id   text not null default 'all-time' references public.arcade_seasons (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists arcade_scores_board
  on public.arcade_scores (game_id, season_id, score desc);
create index if not exists arcade_scores_user
  on public.arcade_scores (user_id, game_id);

-- Every new score is stamped with the active season (clients can't pick one)
-- and the server time.
create or replace function public.arcade_scores_set_season()
returns trigger language plpgsql as $$
begin
  select id into new.season_id from public.arcade_seasons where is_active limit 1;
  if new.season_id is null then new.season_id := 'all-time'; end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists arcade_scores_set_season on public.arcade_scores;
create trigger arcade_scores_set_season
  before insert on public.arcade_scores
  for each row execute function public.arcade_scores_set_season();

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.arcade_seasons enable row level security;
alter table public.arcade_players enable row level security;
alter table public.arcade_scores  enable row level security;

drop policy if exists "seasons readable" on public.arcade_seasons;
create policy "seasons readable" on public.arcade_seasons
  for select using (true);

drop policy if exists "players readable" on public.arcade_players;
create policy "players readable" on public.arcade_players
  for select using (true);
drop policy if exists "players insert own" on public.arcade_players;
create policy "players insert own" on public.arcade_players
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "players update own" on public.arcade_players;
create policy "players update own" on public.arcade_players
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "scores readable" on public.arcade_scores;
create policy "scores readable" on public.arcade_scores
  for select using (true);
drop policy if exists "scores insert own" on public.arcade_scores;
create policy "scores insert own" on public.arcade_scores
  for insert to authenticated with check (auth.uid() = user_id);
-- No update/delete policies: only the service role (admin reset) can remove scores.

-- ---------------------------------------------------------------
-- Leaderboards: best score per player per game.
--   p_season_id null       -> the active season (the floor boards)
--   p_season_id 'all-time' -> every score ever, across seasons
--   p_season_id '<id>'     -> that season only
-- ---------------------------------------------------------------
create or replace function public.arcade_top_scores(p_game_id text, p_limit int default 10, p_season_id text default null)
returns table (rank bigint, user_id uuid, username text, character_id text, score integer, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  with season as (
    select coalesce(p_season_id, (select id from arcade_seasons where is_active limit 1), 'all-time') as id
  ),
  best as (
    select distinct on (s.user_id) s.user_id, s.score, s.created_at
    from arcade_scores s, season
    where s.game_id = p_game_id and (season.id = 'all-time' or s.season_id = season.id)
    order by s.user_id, s.score desc, s.created_at asc
  )
  select row_number() over (order by b.score desc, b.created_at asc) as rank,
         b.user_id,
         coalesce(p.username, 'PLAYER') as username,
         coalesce(ap.character_id, 'charlie') as character_id,
         b.score,
         b.created_at
  from best b
  left join profiles p on p.id = b.user_id
  left join arcade_players ap on ap.user_id = b.user_id
  order by b.score desc, b.created_at asc
  limit least(greatest(p_limit, 1), 50);
$$;

grant execute on function public.arcade_top_scores(text, int, text) to anon, authenticated;

-- Convenience view: all-time top 10 per game.
create or replace view public.arcade_leaderboard_all_time as
  select g.game_id, t.*
  from (values ('neon-chase'), ('void-beast'), ('aquatic-rush')) as g(game_id),
       lateral public.arcade_top_scores(g.game_id, 10, 'all-time') t;

grant select on public.arcade_leaderboard_all_time to anon, authenticated;

-- ---------------------------------------------------------------
-- Realtime: presence uses broadcast channels only (no table changes),
-- so no publication changes are needed here.
-- ---------------------------------------------------------------
