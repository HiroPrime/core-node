-- Close anon and authenticated access to visitor counts and the trackers.
-- Apply only with `supabase db push` or the Supabase connector.
-- Both wrap this file in a single transaction.
--
-- Apply this after nexus-prime, kidquest, my-character, webtoon-maker,
-- save-point, grimm-fracture, and basichiro call these functions with the
-- service role. Signatures are unchanged. service_role execute stays.

drop policy if exists site_metrics_public_read on public.site_metrics;
drop policy if exists explore_public_read on public.core_node_explore_clicks;
drop policy if exists quest_public_read on public.nexus_prime_quest_explores;
drop policy if exists social_public_read on public.nexus_prime_social_clicks;

alter table public.site_metrics enable row level security;
alter table public.site_visitors enable row level security;
alter table public.core_node_explore_clicks enable row level security;
alter table public.nexus_prime_quest_explores enable row level security;
alter table public.nexus_prime_social_clicks enable row level security;

revoke all on table public.site_metrics from public, anon, authenticated;
revoke all on table public.site_visitors from public, anon, authenticated;
revoke all on table public.core_node_explore_clicks from public, anon, authenticated;
revoke all on table public.nexus_prime_quest_explores from public, anon, authenticated;
revoke all on table public.nexus_prime_social_clicks from public, anon, authenticated;

revoke all on function public.track_core_node_explore(text) from public, anon, authenticated;
revoke all on function public.track_nexus_prime_quest(text) from public, anon, authenticated;
revoke all on function public.track_nexus_prime_social(text) from public, anon, authenticated;
revoke all on function public.record_unique_visitor(text, text) from public, anon, authenticated;
revoke all on function public.get_constellation_population() from public, anon, authenticated;
revoke all on function public.increment_unique_visitors() from public, anon, authenticated;

grant execute on function public.track_core_node_explore(text) to service_role;
grant execute on function public.track_nexus_prime_quest(text) to service_role;
grant execute on function public.track_nexus_prime_social(text) to service_role;
grant execute on function public.record_unique_visitor(text, text) to service_role;
grant execute on function public.get_constellation_population() to service_role;
grant execute on function public.increment_unique_visitors() to service_role;
