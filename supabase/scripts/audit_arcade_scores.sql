-- Read-only audit of arcade_scores for likely forged rows.
-- Run as a privileged role (postgres or the service role). This script
-- only SELECTs. It does not delete, update, or insert.
--
-- A row is flagged when its score is above the cap in
-- 20261024043000_arcade_score_hardening.sql, or when it is above
-- max_run_age * sustained points-per-second (impossible even for a
-- full-length run at the sustained rate). Historical rows have no run
-- duration, so this is a ceiling check, not a proof.
--
-- Thresholds (keep in step with arcade_game_limit):
--   neon-chase    cap 900      max age 360s   rate 5/s      full-run max 1800
--   void-beast    cap 450000   max age 720s   rate 2000/s   full-run max 1440000
--   aquatic-rush  cap 200000   max age 480s   rate 1200/s   full-run max 576000
--   spin-ball     cap 300000   max age 600s   rate 5000/s   full-run max 3000000

begin transaction read only;

select
  s.id,
  s.user_id,
  s.game_id,
  s.score,
  s.created_at,
  s.status,
  concat_ws(
    ',',
    case when s.score > l.max_score then 'over_cap' end,
    case when s.score > l.max_age_seconds * l.max_per_second then 'impossible_rate' end
  ) as reason
from public.arcade_scores s
join (
  values
    ('neon-chase'::text, 5::numeric, 900, 360),
    ('void-beast', 2000, 450000, 720),
    ('aquatic-rush', 1200, 200000, 480),
    ('spin-ball', 5000, 300000, 600)
) as l(game_id, max_per_second, max_score, max_age_seconds)
  on l.game_id = s.game_id
where s.score > l.max_score
   or s.score > l.max_age_seconds * l.max_per_second
order by s.game_id, s.score desc, s.created_at asc;

commit;
