
create table public.strava_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  athlete_id bigint,
  access_token text,
  refresh_token text,
  expires_at bigint,
  created_at timestamp with time zone default now(),
  unique(user_id)
);

alter table public.strava_tokens enable row level security;

create policy "Usuario acessa proprios tokens"
on public.strava_tokens for all
using (auth.uid() = user_id);
