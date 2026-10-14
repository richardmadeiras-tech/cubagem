-- Cole no SQL Editor do Supabase e execute uma vez.
create table if not exists public.lancamentos (
  id text primary key,
  dados jsonb not null,
  atualizado bigint not null,
  apagado boolean not null default false
);

alter table public.lancamentos enable row level security;

-- ATENÇÃO: sem login, quem tiver a anon key lê e grava tudo. Serve para uso pessoal.
-- Para separar por usuário, adicione login e uma coluna user_id com políticas auth.uid() = user_id.
create policy "acesso anon" on public.lancamentos
  for all to anon using (true) with check (true);
