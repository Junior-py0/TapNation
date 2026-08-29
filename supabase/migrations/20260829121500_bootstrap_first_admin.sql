-- One-time owner bootstrap: only a sole existing account can become the first admin.
do $$
begin
  if not exists (select 1 from public.app_admins)
     and (select count(*) from auth.users) = 1 then
    insert into public.app_admins (user_id)
    select id from auth.users
    limit 1
    on conflict (user_id) do nothing;
  end if;
end;
$$;

