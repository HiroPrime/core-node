-- Guests never write scores: only signed-in, non-anonymous users can insert
-- their own rows. Applied to project zuxbgrbryyrjmjnpopxb on 2026-10-20.
revoke insert, update, delete on public.arcade_scores from anon;
drop policy if exists "scores insert own" on public.arcade_scores;
create policy "scores insert own" on public.arcade_scores
  for insert to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  );
