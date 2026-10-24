-- Close direct API access to portfolio_votes.
-- Apply only with `supabase db push` or the Supabase connector.
-- Both wrap this file in a single transaction.
--
-- Apply this after the other HiroPrime sites cast votes with
-- portfolio_cast_vote and read portfolio_vote_tallies. The RPCs keep
-- working. service_role table access stays.

drop policy if exists portfolio_votes_insert on public.portfolio_votes;
drop policy if exists portfolio_votes_select on public.portfolio_votes;
drop policy if exists portfolio_votes_update on public.portfolio_votes;

alter table public.portfolio_votes enable row level security;

revoke all on table public.portfolio_votes from public, anon, authenticated;
