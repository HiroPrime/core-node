-- Arcade scores can no longer be inserted from the browser.
-- A signed-in player starts a run (arcade_start_run), reports progress
-- (arcade_checkpoint), and submits that run's score (arcade_submit_score).
-- The server stamps started_at, used, created_at, and the checkpoint clock.
-- Clients have no insert, update, or delete grant on scores or runs.
--
-- NOT applied automatically. Review, then run with `supabase db push`
-- or paste into the Supabase SQL editor. Do not apply from the app.
--
-- The file is one transaction. If the runner has already issued BEGIN,
-- this BEGIN is a no-op warning and this COMMIT commits that transaction.
-- A later COMMIT from the runner warns and leaves the changes in place.
--
-- Heartbeats stop "start, sleep, submit the cap": credited time only
-- advances across short gaps between server-timed checkpoints, and a run
-- with no checkpoint is rejected once it is older than 15 seconds.
-- A client that calls arcade_checkpoint on a timer can still climb at the
-- sustained rate below. That is why the caps are low, each run has a
-- maximum age, only one token is open, and a score near the cap or a new
-- number one is stored as pending and left off the public board.

begin;

-- ---------------------------------------------------------------
-- Per-game limits. Rates are sustained play, not a one-frame burst.
-- Review holds a score at or above 85% of the cap.
--
-- neon-chase: one point per car. Cruise is about 2/s; a boost close is
--   about 5/s. Cap 900 is a long clean run. Max age 6 minutes.
-- void-beast: 25 points per second plus kills. A full wave is a few
--   hundred points every 1.15s, and a boss pays 2000+ in one checkpoint
--   gap, so the sustained ceiling is 2000/s. Cap 450000. Max age 12 minutes.
-- aquatic-rush: climb is 160 px/s and a deep lane is worth a few hundred
--   points, with a rare crown at 3000. 1200/s allows a rich 5s stretch
--   and rejects a crown on every lane. Cap 200000. Max age 8 minutes.
-- spin-ball: one comet-boosted blue bumper is about 2200/s, and a lively
--   ball is a couple of those. 5000/s covers that stretch. A stuck spinner
--   (about 30000/s) and every bumper on cooldown (about 15000/s) are
--   rejected. Cap 300000. Max age 10 minutes.
--
-- First checkpoint must land within 20s of the start. Later checkpoints
-- credit a gap only when it is between 3 and 12 seconds. Score submits
-- are limited to 100 per user per game per 10 minutes. Run starts are
-- limited to 200 per user per game per 10 minutes.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Runs: one open token per user and game. No API policies.
-- ---------------------------------------------------------------
create table if not exists public.arcade_runs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  game_id           text not null check (game_id in ('neon-chase', 'void-beast', 'aquatic-rush', 'spin-ball')),
  started_at        timestamptz not null default now(),
  used              boolean not null default false,
  last_beat         timestamptz,
  beats             integer not null default 0 check (beats >= 0),
  credited_seconds  numeric not null default 0 check (credited_seconds >= 0),
  checkpoint_score  integer not null default 0 check (checkpoint_score >= 0)
);

create index if not exists arcade_runs_user_game_started
  on public.arcade_runs (user_id, game_id, started_at desc);

alter table public.arcade_runs enable row level security;

-- Clients never write the clock, the token, or the checkpoint columns.
-- Insert forces them. Update can flip used false -> true and cannot move
-- the owner or the start time. Checkpoint columns are left as the RPC set
-- them; there is no client update grant on this table.
create or replace function public.arcade_runs_stamp()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.user_id := auth.uid();
    end if;
    new.started_at := now();
    new.used := false;
    new.last_beat := null;
    new.beats := 0;
    new.credited_seconds := 0;
    new.checkpoint_score := 0;
  elsif tg_op = 'UPDATE' then
    new.id := old.id;
    new.user_id := old.user_id;
    new.game_id := old.game_id;
    new.started_at := old.started_at;
    if old.used then
      new.used := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists arcade_runs_stamp on public.arcade_runs;
create trigger arcade_runs_stamp
  before insert or update on public.arcade_runs
  for each row execute function public.arcade_runs_stamp();

revoke all on table public.arcade_runs from public, anon, authenticated;
revoke all on function public.arcade_runs_stamp() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Shared ceilings. Not an API. The score RPCs call it as the owner.
-- ---------------------------------------------------------------
create or replace function public.arcade_game_limit(p_game text)
returns table (
  min_seconds numeric,
  max_per_second numeric,
  max_score integer,
  max_age_seconds integer,
  review_at integer
)
language sql
immutable
set search_path = public, pg_temp
as $$
  select r.min_seconds, r.max_per_second, r.max_score, r.max_age_seconds, r.review_at
  from (
    values
      ('neon-chase'::text, 2::numeric, 5::numeric, 900, 360, 765),
      ('void-beast', 3, 2000, 450000, 720, 382500),
      ('aquatic-rush', 3, 1200, 200000, 480, 170000),
      ('spin-ball', 3, 5000, 300000, 600, 255000)
  ) as r(game_id, min_seconds, max_per_second, max_score, max_age_seconds, review_at)
  where r.game_id = p_game;
$$;

revoke all on function public.arcade_game_limit(text) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Scores: drop the direct insert path and the public read.
-- status stays 'approved' for rows that already exist. Pending and
-- rejected rows are stored but omitted from every public read.
-- ---------------------------------------------------------------
alter table public.arcade_scores
  add column if not exists status text not null default 'approved';

alter table public.arcade_scores drop constraint if exists arcade_scores_status_check;
alter table public.arcade_scores
  add constraint arcade_scores_status_check
  check (status in ('approved', 'pending', 'rejected'));

create index if not exists arcade_scores_user_game_created
  on public.arcade_scores (user_id, game_id, created_at desc);

create or replace function public.arcade_scores_set_season()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  select id into new.season_id from public.arcade_seasons where is_active limit 1;
  if new.season_id is null then
    new.season_id := 'all-time';
  end if;
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.arcade_scores_set_season() from public, anon, authenticated, service_role;

drop policy if exists "scores insert own" on public.arcade_scores;
drop policy if exists "scores readable" on public.arcade_scores;

revoke all on table public.arcade_scores from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Seasons are read inside the definer functions. The service role keeps
-- the grants it already has (admin reset). Nobody else does.
-- ---------------------------------------------------------------
drop policy if exists "seasons readable" on public.arcade_seasons;
revoke all on table public.arcade_seasons from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Players: a signed-in user can read and save only their own row.
-- Anon gets nothing. No delete and no truncate for the API roles.
-- ---------------------------------------------------------------
drop policy if exists "players readable" on public.arcade_players;
create policy "players readable" on public.arcade_players
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on table public.arcade_players from public, anon, authenticated;
grant select, insert, update on table public.arcade_players to authenticated;

-- ---------------------------------------------------------------
-- arcade_start_run(game) -> uuid token.
-- Starting another run for the same game burns the open token.
-- ---------------------------------------------------------------
create or replace function public.arcade_start_run(p_game text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game text;
  v_recent integer;
  v_id uuid;
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in required' using errcode = '28000';
  end if;

  if p_game is null or char_length(p_game) > 32 then
    raise exception 'unknown game' using errcode = '22023';
  end if;

  v_game := p_game;
  if v_game not in ('neon-chase', 'void-beast', 'aquatic-rush', 'spin-ball') then
    raise exception 'unknown game' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || v_game));

  delete from public.arcade_runs
  where user_id = auth.uid()
    and game_id = v_game
    and (
      (used = true and started_at < now() - interval '2 days')
      or (used = false and started_at < now() - interval '20 minutes')
    );

  update public.arcade_runs
  set used = true
  where user_id = auth.uid()
    and game_id = v_game
    and used = false;

  select count(*)::integer into v_recent
  from public.arcade_runs
  where user_id = auth.uid()
    and game_id = v_game
    and started_at > now() - interval '10 minutes';

  if v_recent >= 200 then
    raise exception 'rate limit' using errcode = '54000';
  end if;

  insert into public.arcade_runs (user_id, game_id)
  values (auth.uid(), v_game)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.arcade_start_run(text) from public, anon, authenticated, service_role;
grant execute on function public.arcade_start_run(text) to authenticated;

-- ---------------------------------------------------------------
-- arcade_checkpoint(run_id, score) -> true when this beat was credited.
-- The client sends the live score only. The server writes the clock.
-- ---------------------------------------------------------------
create or replace function public.arcade_checkpoint(p_run_id uuid, p_score integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game text;
  v_started timestamptz;
  v_beats integer;
  v_credited numeric;
  v_checkpoint integer;
  v_last timestamptz;
  v_wall numeric;
  v_gap numeric;
  v_pps numeric;
  v_cap integer;
  v_max_age integer;
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in required' using errcode = '28000';
  end if;

  if p_run_id is null or p_score is null or p_score < 0 or p_score > 10000000 then
    return false;
  end if;

  select game_id into v_game
  from public.arcade_runs
  where id = p_run_id
    and user_id = auth.uid()
    and used = false;

  if v_game is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || v_game));

  v_game := null;
  select game_id, started_at, beats, credited_seconds, checkpoint_score, last_beat
  into v_game, v_started, v_beats, v_credited, v_checkpoint, v_last
  from public.arcade_runs
  where id = p_run_id
    and user_id = auth.uid()
    and used = false;

  if v_game is null then
    return false;
  end if;

  select g.max_per_second, g.max_score, g.max_age_seconds
  into v_pps, v_cap, v_max_age
  from public.arcade_game_limit(v_game) as g;

  if v_pps is null then
    return false;
  end if;

  v_wall := extract(epoch from (clock_timestamp() - v_started));
  if v_wall < 0 or v_wall > v_max_age or p_score > v_cap then
    return false;
  end if;

  if v_beats = 0 then
    -- No prior beat: only a young run can start the clock. Credit the
    -- whole wall gap. Sleeping past this window earns nothing.
    if v_wall > 20 then
      return false;
    end if;
    v_gap := v_wall;
  else
    v_gap := extract(epoch from (clock_timestamp() - v_last));
    -- Too soon: ignore, leave the previous beat in place.
    -- Too late: the idle stretch is not credited.
    if v_gap <= 3 or v_gap > 12 then
      return false;
    end if;
  end if;

  if p_score < v_checkpoint or (p_score - v_checkpoint) > v_gap * v_pps then
    return false;
  end if;

  update public.arcade_runs
  set beats = v_beats + 1,
      last_beat = clock_timestamp(),
      credited_seconds = v_credited + v_gap,
      checkpoint_score = p_score
  where id = p_run_id
    and user_id = auth.uid()
    and used = false;

  return found;
end;
$$;

revoke all on function public.arcade_checkpoint(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.arcade_checkpoint(uuid, integer) to authenticated;

-- Where this score would sit on one board (best score per player).
-- Null when it would not be the row on display (the player already has
-- an equal or better approved score). Rank 1 is an empty board.
-- Not an API.
create or replace function public.arcade_board_rank(
  p_game text,
  p_season text,
  p_user uuid,
  p_score integer
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with best as (
    select s.user_id, max(s.score) as score
    from public.arcade_scores s
    where s.game_id = p_game
      and s.status = 'approved'
      and (p_season = 'all-time' or s.season_id = p_season)
      and s.user_id is distinct from p_user
    group by s.user_id
  ),
  mine as (
    select max(s.score) as score
    from public.arcade_scores s
    where s.game_id = p_game
      and s.status = 'approved'
      and (p_season = 'all-time' or s.season_id = p_season)
      and s.user_id = p_user
  )
  select case
    when (select m.score from mine m) is not null
         and (select m.score from mine m) >= p_score then null
    else 1 + (
      select count(*)::integer
      from best b
      where b.score >= p_score
    )
  end;
$$;

revoke all on function public.arcade_board_rank(text, text, uuid, integer) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- arcade_submit_score(run_id, score) -> true when the row is stored.
-- Pending rows are stored and return true, but public reads skip them.
-- A failed check still burns the token (the function returns false
-- instead of raising, so the consume commits).
-- ---------------------------------------------------------------
create or replace function public.arcade_submit_score(p_run_id uuid, p_score integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_game text;
  v_started timestamptz;
  v_beats integer;
  v_credited numeric;
  v_checkpoint integer;
  v_last timestamptz;
  v_elapsed numeric;
  v_gap numeric;
  v_min numeric;
  v_pps numeric;
  v_cap integer;
  v_max_age integer;
  v_review integer;
  v_season text;
  v_season_rank integer;
  v_all_rank integer;
  v_hold boolean;
  v_recent integer;
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in required' using errcode = '28000';
  end if;

  if p_run_id is null or p_score is null or p_score < 1 or p_score > 10000000 then
    raise exception 'invalid score' using errcode = '22023';
  end if;

  select game_id into v_game
  from public.arcade_runs
  where id = p_run_id
    and user_id = auth.uid();

  if v_game is null then
    raise exception 'invalid run' using errcode = '22023';
  end if;

  -- Same key as arcade_start_run and arcade_checkpoint.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || v_game));

  v_game := null;
  v_started := null;
  update public.arcade_runs
  set used = true
  where id = p_run_id
    and user_id = auth.uid()
    and used = false
  returning game_id, started_at, beats, credited_seconds, checkpoint_score, last_beat
  into v_game, v_started, v_beats, v_credited, v_checkpoint, v_last;

  if v_game is null then
    raise exception 'invalid run' using errcode = '22023';
  end if;

  select count(*)::integer into v_recent
  from public.arcade_scores
  where user_id = auth.uid()
    and game_id = v_game
    and created_at > now() - interval '10 minutes';

  if v_recent >= 100 then
    return false;
  end if;

  select g.min_seconds, g.max_per_second, g.max_score, g.max_age_seconds, g.review_at
  into v_min, v_pps, v_cap, v_max_age, v_review
  from public.arcade_game_limit(v_game) as g;

  v_elapsed := extract(epoch from (clock_timestamp() - v_started));

  if v_min is null or v_elapsed < v_min or v_elapsed > v_max_age or p_score > v_cap then
    return false;
  end if;

  if v_beats = 0 then
    -- A run that never checked in can only post a short crash.
    if v_elapsed > 15 then
      return false;
    end if;
    v_credited := v_elapsed;
  else
    v_gap := extract(epoch from (clock_timestamp() - v_last));
    if v_last is null or v_gap < 0 or v_gap > 12 then
      return false;
    end if;
    if p_score > v_checkpoint + v_gap * v_pps then
      return false;
    end if;
    v_credited := v_credited + v_gap;
  end if;

  if p_score > v_credited * v_pps then
    return false;
  end if;

  select s.id into v_season
  from public.arcade_seasons s
  where s.is_active
  limit 1;
  v_season := coalesce(v_season, 'all-time');

  -- Season board and all-time board. Hold the score when either board
  -- has no approved row yet (that first score is rank 1), or this score
  -- would place in that board's top 3. An equal score stays behind the
  -- earlier row, so it places only when fewer than 3 other players
  -- already have a best score at least this high. Near the cap is held
  -- even when it would rank lower.
  v_season_rank := public.arcade_board_rank(v_game, v_season, auth.uid(), p_score);
  v_all_rank := public.arcade_board_rank(v_game, 'all-time', auth.uid(), p_score);
  v_hold := p_score >= v_review
    or (v_season_rank is not null and v_season_rank <= 3)
    or (v_all_rank is not null and v_all_rank <= 3);

  insert into public.arcade_scores (user_id, game_id, score, status)
  values (auth.uid(), v_game, p_score, case when v_hold then 'pending' else 'approved' end);

  return true;
end;
$$;

revoke all on function public.arcade_submit_score(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.arcade_submit_score(uuid, integer) to authenticated;

-- ---------------------------------------------------------------
-- Leaderboard. Approved rows only. No user ids leave the impl.
--
-- The new client calls arcade_board(p_game, p_limit). The deployed client
-- keeps arcade_top_scores(p_game_id, p_limit, p_season_id), whose third
-- argument defaults to the active season. These are different names, so
-- arcade_top_scores('game', 10) and arcade_top_scores('game', 10, 'all-time')
-- both resolve to that one function. user_id is not returned.
-- ---------------------------------------------------------------
create or replace function public.arcade_top_scores_impl(
  p_game text,
  p_limit integer,
  p_season text
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  score integer,
  created_at timestamptz,
  mine boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_game text;
  v_season text;
  v_limit integer;
begin
  if p_game is null or char_length(p_game) > 32 or p_game !~ '^[a-z0-9-]+$' then
    return;
  end if;
  v_game := p_game;

  if p_season is null or char_length(p_season) = 0 then
    select s.id into v_season from public.arcade_seasons s where s.is_active limit 1;
    v_season := coalesce(v_season, 'all-time');
  elsif char_length(p_season) > 48 or p_season !~ '^[a-z0-9-]+$' then
    return;
  else
    v_season := p_season;
  end if;

  v_limit := least(greatest(coalesce(p_limit, 10), 1), 50);

  return query
  with best as (
    select distinct on (s.user_id) s.user_id, s.score, s.created_at
    from public.arcade_scores s
    where s.game_id = v_game
      and s.status = 'approved'
      and (v_season = 'all-time' or s.season_id = v_season)
    order by s.user_id, s.score desc, s.created_at asc
  )
  select row_number() over (order by b.score desc, b.created_at asc) as rank,
         b.user_id,
         left(coalesce(nullif(btrim(p.username), ''), 'PLAYER'), 24) as display_name,
         b.score,
         b.created_at,
         coalesce(b.user_id = auth.uid(), false) as mine
  from best b
  left join public.profiles p on p.id = b.user_id
  order by b.score desc, b.created_at asc
  limit v_limit;
end;
$$;

revoke all on function public.arcade_top_scores_impl(text, integer, text) from public, anon, authenticated, service_role;

drop view if exists public.arcade_leaderboard_all_time;
drop function if exists public.arcade_top_scores(text, int, text);
drop function if exists public.arcade_top_scores(text, int);
drop function if exists public.arcade_board(text, int);

create function public.arcade_board(
  p_game text,
  p_limit integer default 10
)
returns table (
  rank bigint,
  display_name text,
  score integer,
  created_at timestamptz,
  mine boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.rank, i.display_name, i.score, i.created_at, i.mine
  from public.arcade_top_scores_impl(p_game, p_limit, null) i;
$$;

revoke all on function public.arcade_board(text, integer) from public, anon, authenticated, service_role;
grant execute on function public.arcade_board(text, integer) to anon, authenticated;

-- Deployed client. `username` is the display name. user_id is not returned,
-- so the old client's mine-highlight (it compared user_id locally) stays off
-- until that client is updated. p_season_id null means the active season.
-- This is the only arcade_top_scores, so a positional call is unambiguous.
create function public.arcade_top_scores(
  p_game_id text,
  p_limit integer default 10,
  p_season_id text default null
)
returns table (
  rank bigint,
  username text,
  character_id text,
  score integer,
  created_at timestamptz,
  mine boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.rank,
         i.display_name as username,
         coalesce(pl.character_id, 'charlie') as character_id,
         i.score,
         i.created_at,
         i.mine
  from public.arcade_top_scores_impl(p_game_id, p_limit, p_season_id) i
  left join public.arcade_players pl on pl.user_id = i.user_id;
$$;

revoke all on function public.arcade_top_scores(text, integer, text) from public, anon, authenticated, service_role;
grant execute on function public.arcade_top_scores(text, integer, text) to anon, authenticated;

create view public.arcade_leaderboard_all_time
with (security_invoker = true) as
select g.game_id, t.rank, t.username as display_name, t.score, t.created_at, t.mine
from (
  values
    ('neon-chase'::text),
    ('void-beast'),
    ('aquatic-rush'),
    ('spin-ball')
) as g(game_id)
cross join lateral public.arcade_top_scores(g.game_id, 10, 'all-time') as t;

revoke all on table public.arcade_leaderboard_all_time from public, anon, authenticated;
grant select on table public.arcade_leaderboard_all_time to anon, authenticated;

-- ---------------------------------------------------------------
-- Counts for /api/nexus-status. Service role only. Approved scores
-- only, so a pending forgery is not the public high score.
-- ---------------------------------------------------------------
create or replace function public.arcade_count_players()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) from public.arcade_players;
$$;

revoke all on function public.arcade_count_players() from public, anon, authenticated, service_role;
grant execute on function public.arcade_count_players() to service_role;

create or replace function public.arcade_count_scores(p_game text default null, p_since timestamptz default null)
returns bigint
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_game is not null and (char_length(p_game) > 32 or p_game !~ '^[a-z0-9-]+$') then
    return 0;
  end if;

  return (
    select count(*)
    from public.arcade_scores s
    where s.status = 'approved'
      and (p_game is null or s.game_id = p_game)
      and (p_since is null or s.created_at >= p_since)
  );
end;
$$;

revoke all on function public.arcade_count_scores(text, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.arcade_count_scores(text, timestamptz) to service_role;

create or replace function public.arcade_max_score(p_game text default null)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_game is not null and (char_length(p_game) > 32 or p_game !~ '^[a-z0-9-]+$') then
    return null;
  end if;

  return (
    select max(s.score)
    from public.arcade_scores s
    where s.status = 'approved'
      and (p_game is null or s.game_id = p_game)
  );
end;
$$;

revoke all on function public.arcade_max_score(text) from public, anon, authenticated, service_role;
grant execute on function public.arcade_max_score(text) to service_role;

commit;
