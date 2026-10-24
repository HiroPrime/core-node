-- Add the shared intake, vote, lead, and newsletter functions.
-- Apply only with `supabase db push` or the Supabase connector.
-- Both wrap this file in a single transaction.
--
-- This file does not revoke grants or drop policies on portfolio_votes,
-- leads, the newsletter tables, site_metrics, or the existing trackers.
-- Other HiroPrime sites can keep writing those tables and calling the
-- trackers with the anon key. Core Node can switch to the new RPCs now.
--
-- Existing tracker signatures stay (bigint in, the same arguments out).
-- Anon execute on those functions is left as it is.

-- ---------------------------------------------------------------
-- verified distinguishes a signed-in vote from a fingerprint.
-- Existing rows default to false. Old inserts that omit the column
-- still succeed.
-- ---------------------------------------------------------------
alter table public.portfolio_votes
  add column if not exists verified boolean not null default false;

-- Rate-limit log. New table, so it is closed to the API roles.
-- The definer functions below write it as the table owner.
create table if not exists public.intake_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists intake_hits_bucket_created
  on public.intake_hits (bucket, created_at desc);

create index if not exists intake_hits_created
  on public.intake_hits (created_at);

alter table public.intake_hits enable row level security;

revoke all on table public.intake_hits from public, anon, authenticated;

-- Shared counter. Not an RPC. Created here, so the public grant that
-- Postgres adds for a new function is removed.
create or replace function public.intake_allow(p_bucket text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
  v_sweep boolean;
begin
  if p_bucket is null or char_length(p_bucket) > 160 or p_limit is null or p_limit < 1 then
    return false;
  end if;

  -- Drop leftovers from every bucket. The created_at index makes the
  -- probe a short range lookup. About 1% of calls sweep anyway.
  v_sweep := random() < 0.01;
  if not v_sweep then
    select exists (
      select 1
      from public.intake_hits
      where created_at < now() - interval '1 day'
    ) into v_sweep;
  end if;
  if v_sweep then
    delete from public.intake_hits
    where created_at < now() - interval '1 day';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_bucket));

  delete from public.intake_hits
  where bucket = p_bucket
    and created_at < now() - p_window;

  select count(*)::integer into v_count
  from public.intake_hits
  where bucket = p_bucket
    and created_at >= now() - p_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.intake_hits (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on function public.intake_allow(text, integer, interval) from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Votes. One row per signed-in user, otherwise one row per fingerprint.
-- Anonymous fingerprints also share vote:anon, 60 per 10 minutes.
-- Tallies return the total and the signed-in count. No voter id.
-- ---------------------------------------------------------------
create or replace function public.portfolio_cast_vote(p_voter_key text, p_choice text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_verified boolean := false;
begin
  if p_choice is null or p_choice not in ('criticism', 'compliments') then
    return false;
  end if;

  if auth.uid() is not null
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    v_key := 'uid:' || auth.uid()::text;
    v_verified := true;
  elsif p_voter_key is not null
        and char_length(p_voter_key) between 8 and 80
        and p_voter_key ~ '^[A-Za-z0-9_-]+$' then
    v_key := p_voter_key;
    if not public.intake_allow('vote:anon', 60, interval '10 minutes') then
      return false;
    end if;
  else
    return false;
  end if;

  if not public.intake_allow('vote:' || v_key, 5, interval '10 minutes') then
    return false;
  end if;

  insert into public.portfolio_votes (voter_key, choice, verified)
  values (v_key, p_choice, v_verified)
  on conflict (voter_key) do update
    set choice = excluded.choice,
        verified = excluded.verified,
        updated_at = now();

  return true;
end;
$$;

revoke all on function public.portfolio_cast_vote(text, text) from public;
grant execute on function public.portfolio_cast_vote(text, text) to anon, authenticated, service_role;

create or replace function public.portfolio_vote_tallies()
returns table (choice text, votes bigint, verified_votes bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.choice,
         count(v.voter_key)::bigint as votes,
         count(v.voter_key) filter (where v.verified)::bigint as verified_votes
  from (values ('compliments'::text), ('criticism'::text)) as c(choice)
  left join public.portfolio_votes v on v.choice = c.choice
  group by c.choice
  order by c.choice;
$$;

revoke all on function public.portfolio_vote_tallies() from public;
grant execute on function public.portfolio_vote_tallies() to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Leads and newsletters. Honeypot field p_website must be empty.
-- Duplicate emails are accepted quietly. Callers get no row back.
-- The direct table grants stay, so existing site inserts still work.
-- ---------------------------------------------------------------
create or replace function public.submit_lead(
  p_email text,
  p_source text default null,
  p_website text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_source text;
begin
  if p_website is not null and btrim(p_website) <> '' then
    return true;
  end if;

  v_email := lower(btrim(coalesce(p_email, '')));
  if char_length(v_email) < 6
     or char_length(v_email) > 254
     or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return false;
  end if;

  v_source := lower(btrim(coalesce(p_source, 'corenode')));
  if char_length(v_source) > 32 or v_source !~ '^[a-z0-9_-]+$' then
    return false;
  end if;

  if not public.intake_allow('lead', 120, interval '10 minutes') then
    return false;
  end if;
  if not public.intake_allow('lead:' || v_email, 5, interval '1 hour') then
    return false;
  end if;

  insert into public.leads (email, source)
  values (v_email, v_source)
  on conflict (email) do nothing;

  return true;
end;
$$;

revoke all on function public.submit_lead(text, text, text) from public;
grant execute on function public.submit_lead(text, text, text) to anon, authenticated, service_role;

create or replace function public.submit_newsletter(
  p_list text,
  p_email text,
  p_website text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
  v_user uuid;
begin
  if p_website is not null and btrim(p_website) <> '' then
    return true;
  end if;

  if p_list is null or p_list not in ('basichiro', 'grimm') then
    return false;
  end if;

  v_email := lower(btrim(coalesce(p_email, '')));
  if char_length(v_email) < 6
     or char_length(v_email) > 254
     or v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    return false;
  end if;

  if auth.uid() is not null
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    select u.id into v_user from auth.users u where u.id = auth.uid();
  end if;

  if not public.intake_allow('newsletter:' || p_list, 120, interval '10 minutes') then
    return false;
  end if;
  if not public.intake_allow('newsletter:' || p_list || ':' || v_email, 5, interval '1 hour') then
    return false;
  end if;

  if p_list = 'basichiro' then
    insert into public.basichiro_newsletter (email, user_id)
    values (v_email, v_user)
    on conflict (email) do nothing;
  else
    insert into public.grimm_newsletter (email, user_id)
    values (v_email, v_user)
    on conflict (email) do nothing;
  end if;

  return true;
end;
$$;

revoke all on function public.submit_newsletter(text, text, text) from public;
grant execute on function public.submit_newsletter(text, text, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- Trackers. Same arguments and bigint results as today, and this file
-- does not change who can execute them. A caller over the rate limit
-- gets the current count back and does not add another hit.
-- Quest ids are limited to the four rows already stored.
-- ---------------------------------------------------------------
create or replace function public.track_core_node_explore(p_planet_id text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_count bigint;
begin
  if p_planet_id not in ('core', 'prime', 'grimm', 'shipyard', 'savepoint') then
    raise exception 'invalid planet_id: %', p_planet_id;
  end if;

  if not public.intake_allow('track:' || p_planet_id, 60, interval '1 minute') then
    select click_count into new_count
    from public.core_node_explore_clicks
    where planet_id = p_planet_id;
    return coalesce(new_count, 0);
  end if;

  update public.core_node_explore_clicks
  set click_count = click_count + 1,
      updated_at = now()
  where planet_id = p_planet_id
  returning click_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

create or replace function public.track_nexus_prime_quest(p_quest_id text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_count bigint;
begin
  if p_quest_id is null
     or p_quest_id not in ('prime-portal', 'grim-fracture', 'savepoint', 'nexus-prime') then
    raise exception 'invalid quest_id';
  end if;

  if not public.intake_allow('quest:' || p_quest_id, 60, interval '1 minute') then
    select explore_count into new_count
    from public.nexus_prime_quest_explores
    where quest_id = p_quest_id;
    return coalesce(new_count, 0);
  end if;

  insert into public.nexus_prime_quest_explores (quest_id, explore_count)
  values (p_quest_id, 1)
  on conflict (quest_id) do update
    set explore_count = public.nexus_prime_quest_explores.explore_count + 1,
        updated_at = now()
  returning explore_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

create or replace function public.track_nexus_prime_social(p_link text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_count bigint;
begin
  if p_link not in ('linkedin', 'x') then
    raise exception 'invalid social link: %', p_link;
  end if;

  if not public.intake_allow('social:' || p_link, 60, interval '1 minute') then
    select click_count into new_count
    from public.nexus_prime_social_clicks
    where link = p_link;
    return coalesce(new_count, 0);
  end if;

  update public.nexus_prime_social_clicks
  set click_count = click_count + 1,
      updated_at = now()
  where link = p_link
  returning click_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

create or replace function public.record_unique_visitor(p_site_id text, p_visitor_key text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted integer := 0;
  new_total bigint;
begin
  if p_site_id not in (
    'core_node', 'nexus_prime', 'grimm_fracture', 'save_point',
    'kidquest', 'my_character', 'webtoon_maker', 'basichiro'
  ) then
    raise exception 'invalid site_id: %', p_site_id;
  end if;

  if p_visitor_key is null or length(trim(p_visitor_key)) < 8 then
    raise exception 'invalid visitor_key';
  end if;

  if not public.intake_allow('visitor:' || p_site_id, 500, interval '10 minutes') then
    select total_unique_visitors into new_total
    from public.site_metrics
    where site_id = p_site_id;
    return coalesce(new_total, 0);
  end if;

  insert into public.site_visitors (site_id, visitor_key)
  values (p_site_id, p_visitor_key)
  on conflict (site_id, visitor_key) do nothing;

  get diagnostics inserted = row_count;

  if inserted > 0 then
    update public.site_metrics
    set total_unique_visitors = total_unique_visitors + 1,
        updated_at = now()
    where site_id = p_site_id
    returning total_unique_visitors into new_total;
  else
    update public.site_visitors
    set last_seen_at = now()
    where site_id = p_site_id
      and visitor_key = p_visitor_key;
    select total_unique_visitors into new_total
    from public.site_metrics
    where site_id = p_site_id;
  end if;

  return coalesce(new_total, 0);
end;
$$;

-- Same read as today. search_path gains pg_temp. Grants are untouched.
create or replace function public.get_constellation_population()
returns table (site_id text, total_unique_visitors bigint, updated_at timestamptz)
language sql
security definer
set search_path = public, pg_temp
as $$
  select s.site_id, s.total_unique_visitors, s.updated_at
  from public.site_metrics s
  order by s.site_id;
$$;
