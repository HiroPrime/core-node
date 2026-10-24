-- Close direct API access to leads and both newsletter tables.
-- Apply only with `supabase db push` or the Supabase connector.
-- Both wrap this file in a single transaction.
--
-- Apply this after basichiro, grimm-fracture, and the other sites insert
-- through submit_lead and submit_newsletter. Those RPCs keep working.
-- service_role table access stays.

drop policy if exists "Allow anonymous inserts to leads" on public.leads;
drop policy if exists "Anyone can submit leads" on public.leads;
drop policy if exists basichiro_newsletter_insert on public.basichiro_newsletter;
drop policy if exists basichiro_newsletter_select_own on public.basichiro_newsletter;
drop policy if exists grimm_newsletter_insert on public.grimm_newsletter;
drop policy if exists grimm_newsletter_select_own on public.grimm_newsletter;

alter table public.leads enable row level security;
alter table public.basichiro_newsletter enable row level security;
alter table public.grimm_newsletter enable row level security;

revoke all on table public.leads from public, anon, authenticated;
revoke all on table public.basichiro_newsletter from public, anon, authenticated;
revoke all on table public.grimm_newsletter from public, anon, authenticated;
