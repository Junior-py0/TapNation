-- Read-only deployment check. Does not reveal administrator identities.
create or replace function public.admin_is_configured()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins);
$$;

revoke all on function public.admin_is_configured() from public;
grant execute on function public.admin_is_configured() to anon, authenticated;

