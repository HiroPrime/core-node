-- A lower or equal score must not replace a higher pending score.
-- Apply only with `supabase db push` or the Supabase connector.
-- Both wrap this file in a single transaction.
--
-- arcade_submit_score returns text:
--   stored    the row was inserted
--   kept      a pending score >= p_score is already there; nothing inserted
--   rejected  the run was consumed and the score was not stored

drop function if exists public.arcade_submit_score(uuid, integer);

create function public.arcade_submit_score(p_run_id uuid, p_score integer)
returns text
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
    return 'rejected';
  end if;

  select g.min_seconds, g.max_per_second, g.max_score, g.max_age_seconds, g.review_at
  into v_min, v_pps, v_cap, v_max_age, v_review
  from public.arcade_game_limit(v_game) as g;

  v_elapsed := extract(epoch from (clock_timestamp() - v_started));

  if v_min is null or v_elapsed < v_min or v_elapsed > v_max_age or p_score > v_cap then
    return 'rejected';
  end if;

  if v_beats = 0 then
    -- A run that never checked in can only post a short crash.
    if v_elapsed > 15 then
      return 'rejected';
    end if;
    v_credited := v_elapsed;
  else
    v_gap := extract(epoch from (clock_timestamp() - v_last));
    if v_last is null or v_gap < 0 or v_gap > 12 then
      return 'rejected';
    end if;
    if p_score > v_checkpoint + v_gap * v_pps then
      return 'rejected';
    end if;
    v_credited := v_credited + v_gap;
  end if;

  if p_score > v_credited * v_pps then
    return 'rejected';
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

  -- Same function, same pg_advisory_xact_lock taken above. A second
  -- submit for this user and game waits until this transaction ends.
  -- An equal or lower score leaves the higher pending row in place.
  if exists (
    select 1
    from public.arcade_scores
    where user_id = auth.uid()
      and game_id = v_game
      and status = 'pending'
      and score >= p_score
  ) then
    return 'kept';
  end if;

  delete from public.arcade_scores
  where user_id = auth.uid()
    and game_id = v_game
    and status = 'pending'
    and score <= p_score;

  insert into public.arcade_scores (user_id, game_id, score, status)
  values (auth.uid(), v_game, p_score, case when v_hold then 'pending' else 'approved' end);

  return 'stored';
end;
$$;

revoke all on function public.arcade_submit_score(uuid, integer) from public, anon, authenticated, service_role;
grant execute on function public.arcade_submit_score(uuid, integer) to authenticated;

-- Already installed. Signature is the zero-argument trigger function.
alter function public.touch_portfolio_votes_updated_at() set search_path = public, pg_temp;
