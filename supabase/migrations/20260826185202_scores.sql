create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    text not null references public.games(id)    on delete cascade,
  score      int  not null check (score >= 0),
  played_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_played_at_idx  on public.scores (played_at desc);

alter table public.scores enable row level security;
grant select on public.scores to anon, authenticated;
grant insert on public.scores to authenticated;
create policy "Puntuaciones visibles por todos" on public.scores for select using (true);
create policy "Cada quien guarda solo su puntuación" on public.scores
  for insert with check ((select auth.uid()) = user_id);

create view public.game_stats
  with (security_invoker = on) as
  select
    game_id,
    max(score)      as best,
    count(*)        as plays,
    max(played_at)  as last_played_at
  from public.scores
  group by game_id;

grant select on public.game_stats to anon, authenticated;
