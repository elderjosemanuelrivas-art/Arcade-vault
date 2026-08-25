create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now(),
  constraint nickname_length check (char_length(nickname) between 3 and 10)
);

alter table public.profiles enable row level security;
grant select on public.profiles to anon;
grant select, update on public.profiles to authenticated;

create policy "Perfiles visibles por todos" on public.profiles
  for select using (true);
create policy "Cada quien actualiza su perfil" on public.profiles
  for update using ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, upper(new.raw_user_meta_data->>'nickname'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
