-- SPIN-BALL (pinball) joins the arcade: allow its game id on arcade_scores.
alter table public.arcade_scores drop constraint if exists arcade_scores_game_id_check;
alter table public.arcade_scores
  add constraint arcade_scores_game_id_check
  check (game_id in ('neon-chase', 'void-beast', 'aquatic-rush', 'spin-ball'));
