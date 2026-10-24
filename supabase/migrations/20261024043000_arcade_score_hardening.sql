-- Arcade scores can no longer be inserted from the browser.
-- A signed-in player starts a run (arcade_start_run) and submits that run's
-- score (arcade_submit_score). The server stamps started_at / used /
-- created_at. Clients have no insert, update, or delete grant, and no
-- column through which they can set those fields.
--
-- NOT applied automatically. Review, then run with `supabase db push`
-- or paste into the Supabase SQL editor. Do not apply from the app.

-- ---------------------------------------------------------------
-- Per-game ceilings, from the scoring loops:
--
-- neon-chase (src/components/NeonChase.tsx)
--   Score is cars passed, one point each. The field keeps about 3 cars
--   and the fastest close is ~1.6 z/s, about 5 passes/s. Ceiling 8/s.
--   Cap 12000: ~40 minutes at 5/s, or 25 minutes at the ceiling.
--
-- void-beast (src/components/VoidBeast.tsx)
--   25 points per second alive, plus kills (swarm 100, sting 250,
--   carrier 500, boss 2000 + loop bonus). A full early wave is ~500
--   points every 1.15s. Sustained play is roughly 400-750 points/s.
--   Ceiling 1500/s. Cap 1500000: about an hour at a strong 400/s.
--
-- aquatic-rush (src/components/AquaticRush.tsx)
--   Score is treasure picked up. Climb is 160 px/s, lanes are 250-430 px
--   apart, and a lane rolls one gem (100-3000, crown only deep and rare).
--   Late game, if every lane were a crown, is under ~1900 points/s.
--   Ceiling 2500/s. Cap 2000000.
--
-- spin-ball (src/components/Pinball.tsx, src/lib/arcade/pinball-physics.ts)
--   3 balls. Bumpers score at most once per 0.45s (blue 100 / 500 boosted,
--   red 50 / 200, star 250; comet x2, charged x1.5). All seven bumpers on
--   that cooldown under comet is ~9300 points/s, plus slingshots, spinner
--   passes, and the 1000/10000 light bonuses. Ceiling 15000/s still rejects
--   a ball stuck in a spinner (the physics step can award that much faster).
--   Cap 2000000.
--
-- A run older than 6 hours is rejected. Score submissions are limited to
-- 100 per user per game per 10 minutes. Run starts are limited to 200 per
-- user per game per 10 minutes so the runs table cannot be flooded.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Runs: one single-use token per attempt. No API policies.
-- ---------------------------------------------------------------
create table if not exists public.arcade_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  game_id     text not null check (game_id in ('neon-chase', 'void-beast', 'aquatic-rush', 'spin-ball')),
  started_at  timestamptz not null default now(),
  used        boolean not null default false
);

create index if not exists arcade_runs_user_game_started
  on public.arcade_runs (user_id, game_id, started_at desc);

alter table public.arcade_runs enable row level security;

-- Clients never write started_at or used. Insert forces both; update can
-- only flip used false -> true and cannot move the clock or the owner.
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
revoke all on function public.arcade_runs_stamp() from public, anon, authenticated;

-- ---------------------------------------------------------------
-- Scores: drop the direct insert path. Keep created_at server-owned.
-- ---------------------------------------------------------------
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

revoke all on function public.arcade_scores_set_season() from public, anon, authenticated;

drop policy if exists "scores insert own" on public.arcade_scores;

-- TRUNCATE, TRIGGER, REFERENCES, INSERT, UPDATE, DELETE, and SELECT on
-- user_id all go away. Leaderboards do not read this table.
revoke all on table public.arcade_scores from public, anon, authenticated;
grant select (game_id, score, season_id, created_at)
  on table public.arcade_scores to anon, authenticated;

-- ---------------------------------------------------------------
-- arcade_start_run(game) -> uuid token
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
      or (used = false and started_at < now() - interval '6 hours')
    );

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

revoke all on function public.arcade_start_run(text) from public, anon, authenticated;
grant execute on function public.arcade_start_run(text) to authenticated;

-- ---------------------------------------------------------------
-- arcade_submit_score(run_id, score) -> true when the row is stored
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
  v_elapsed numeric;
  v_min numeric;
  v_pps numeric;
  v_cap integer;
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

  -- Same key as arcade_start_run. Held until this transaction ends, so two
  -- submits for one player and game cannot both pass the rate-limit count.
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || v_game));

  v_game := null;
  v_started := null;
  update public.arcade_runs
  set used = true
  where id = p_run_id
    and user_id = auth.uid()
    and used = false
  returning game_id, started_at into v_game, v_started;

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

  v_elapsed := extract(epoch from (clock_timestamp() - v_started));

  select r.min_seconds, r.max_per_second, r.max_score
  into v_min, v_pps, v_cap
  from (
    values
      ('neon-chase'::text, 2::numeric, 8::numeric, 12000),
      ('void-beast', 3, 1500, 1500000),
      ('aquatic-rush', 3, 2500, 2000000),
      ('spin-ball', 3, 15000, 2000000)
  ) as r(game_id, min_seconds, max_per_second, max_score)
  where r.game_id = v_game;

  if v_min is null
     or v_elapsed < v_min
     or v_elapsed > 6 * 3600
     or p_score > v_cap
     or p_score > v_elapsed * v_pps then
    return false;
  end if;

  insert into public.arcade_scores (user_id, game_id, score)
  values (auth.uid(), v_game, p_score);

  return true;
end;
$$;

revoke all on function public.arcade_submit_score(uuid, integer) from public, anon, authenticated;
grant execute on function public.arcade_submit_score(uuid, integer) to authenticated;

-- ---------------------------------------------------------------
-- Leaderboard. No user ids. `mine` is computed inside the function.
-- Optional p_season: null = active season, 'all-time' = every season.
-- ---------------------------------------------------------------
drop view if exists public.arcade_leaderboard_all_time;
drop function if exists public.arcade_top_scores(text, int, text);

create function public.arcade_top_scores(
  p_game text,
  p_limit integer default 10,
  p_season text default null
)
returns table (
  rank bigint,
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
      and (v_season = 'all-time' or s.season_id = v_season)
    order by s.user_id, s.score desc, s.created_at asc
  )
  select row_number() over (order by b.score desc, b.created_at asc) as rank,
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

revoke all on function public.arcade_top_scores(text, integer, text) from public;
grant execute on function public.arcade_top_scores(text, integer, text) to anon, authenticated;

create view public.arcade_leaderboard_all_time
with (security_invoker = true) as
select g.game_id, t.rank, t.display_name, t.score, t.created_at, t.mine
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
