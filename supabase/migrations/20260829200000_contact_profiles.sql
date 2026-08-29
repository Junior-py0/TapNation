-- TapNation living contact profiles
-- Adds one dynamic profile per account and reduces card routing to Profile or Other link.

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists public_email text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists facebook_url text;
alter table public.profiles add column if not exists whatsapp_number text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists tiktok_url text;
alter table public.profiles add column if not exists youtube_url text;
alter table public.profiles add column if not exists x_url text;
alter table public.profiles add column if not exists website_url text;

alter table public.cards drop constraint if exists cards_destination_type_check;

update public.cards
set destination_type = case
  when nullif(trim(destination_url), '') is null then 'profile'
  else 'url'
end
where destination_type not in ('profile', 'url')
   or (destination_type = 'url' and nullif(trim(destination_url), '') is null);

alter table public.cards alter column destination_type set default 'profile';
alter table public.cards add constraint cards_destination_type_check
check (destination_type in ('profile', 'url'));

create or replace function public.claim_card(p_claim_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_card public.cards%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  select * into v_card
  from public.cards
  where claim_code = upper(trim(p_claim_code))
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Activation code not found.');
  end if;

  if v_card.owner_id is not null and v_card.owner_id <> v_user then
    return jsonb_build_object('success', false, 'message', 'This card has already been claimed.');
  end if;

  update public.cards
  set owner_id = v_user,
      destination_type = case when nullif(trim(destination_url), '') is null then 'profile' else 'url' end,
      claimed_at = coalesce(claimed_at, now()),
      updated_at = now()
  where id = v_card.id;

  return jsonb_build_object(
    'success', true,
    'message', 'Card claimed.',
    'card_id', v_card.id,
    'slug', v_card.slug
  );
end;
$$;

create or replace function public.update_card(
  p_card_id uuid,
  p_card_name text,
  p_destination_type text,
  p_destination_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_url text := nullif(trim(p_destination_url), '');
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  if p_destination_type not in ('profile', 'url') then
    return jsonb_build_object('success', false, 'message', 'Choose Contact profile or Other link.');
  end if;

  if p_destination_type = 'url' and (
    v_url is null
    or length(v_url) > 2048
    or v_url !~* '^https://'
    or v_url ~* '^(javascript|data|file):'
  ) then
    return jsonb_build_object('success', false, 'message', 'Enter a secure https:// link.');
  end if;

  update public.cards
  set card_name = left(coalesce(nullif(trim(p_card_name), ''), 'TapNation Card'), 40),
      destination_type = p_destination_type,
      destination_url = case when p_destination_type = 'profile' then null else v_url end,
      updated_at = now()
  where id = p_card_id and owner_id = v_user;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Card not found or not owned by you.');
  end if;

  return jsonb_build_object('success', true, 'message', 'Card updated.');
end;
$$;

create or replace function public.update_contact_profile(
  p_display_name text,
  p_phone text,
  p_public_email text,
  p_headline text,
  p_bio text,
  p_company text,
  p_location text,
  p_instagram_url text,
  p_facebook_url text,
  p_whatsapp_number text,
  p_linkedin_url text,
  p_tiktok_url text,
  p_youtube_url text,
  p_x_url text,
  p_website_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_url text;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  if nullif(trim(p_display_name), '') is null then
    return jsonb_build_object('success', false, 'message', 'Add your name before saving.');
  end if;

  if length(trim(p_display_name)) > 80
     or length(coalesce(trim(p_phone), '')) > 32
     or length(coalesce(trim(p_public_email), '')) > 160
     or length(coalesce(trim(p_headline), '')) > 100
     or length(coalesce(trim(p_bio), '')) > 280
     or length(coalesce(trim(p_company), '')) > 100
     or length(coalesce(trim(p_location), '')) > 100
     or length(coalesce(trim(p_whatsapp_number), '')) > 32 then
    return jsonb_build_object('success', false, 'message', 'One or more profile fields are too long.');
  end if;

  if nullif(trim(p_public_email), '') is not null
     and trim(p_public_email) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    return jsonb_build_object('success', false, 'message', 'Enter a valid public email address.');
  end if;

  foreach v_url in array array[
    nullif(trim(p_instagram_url), ''),
    nullif(trim(p_facebook_url), ''),
    nullif(trim(p_linkedin_url), ''),
    nullif(trim(p_tiktok_url), ''),
    nullif(trim(p_youtube_url), ''),
    nullif(trim(p_x_url), ''),
    nullif(trim(p_website_url), '')
  ]
  loop
    if v_url is not null and (length(v_url) > 240 or v_url !~* '^https?://') then
      return jsonb_build_object('success', false, 'message', 'Social and website links must use http:// or https://.');
    end if;
  end loop;

  insert into public.profiles (id, display_name)
  values (v_user, left(trim(p_display_name), 80))
  on conflict (id) do update set
    display_name = left(trim(p_display_name), 80),
    phone = nullif(trim(p_phone), ''),
    public_email = nullif(lower(trim(p_public_email)), ''),
    headline = nullif(trim(p_headline), ''),
    bio = nullif(trim(p_bio), ''),
    company = nullif(trim(p_company), ''),
    location = nullif(trim(p_location), ''),
    instagram_url = nullif(trim(p_instagram_url), ''),
    facebook_url = nullif(trim(p_facebook_url), ''),
    whatsapp_number = nullif(trim(p_whatsapp_number), ''),
    linkedin_url = nullif(trim(p_linkedin_url), ''),
    tiktok_url = nullif(trim(p_tiktok_url), ''),
    youtube_url = nullif(trim(p_youtube_url), ''),
    x_url = nullif(trim(p_x_url), ''),
    website_url = nullif(trim(p_website_url), ''),
    updated_at = now();

  return jsonb_build_object('success', true, 'message', 'Contact profile updated.');
end;
$$;

revoke all on function public.update_contact_profile(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.update_contact_profile(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

drop function if exists public.resolve_card(text);

create function public.resolve_card(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_profile jsonb;
begin
  select c.* into v_card
  from public.cards c
  where c.slug = upper(trim(p_slug))
    and c.is_active = true
    and (
      (c.destination_type = 'profile' and c.owner_id is not null)
      or
      (c.destination_type = 'url' and nullif(trim(c.destination_url), '') is not null)
    )
  limit 1;

  if not found then
    return null;
  end if;

  update public.cards
  set tap_count = tap_count + 1,
      last_tapped_at = now(),
      updated_at = now()
  where id = v_card.id;

  insert into public.tap_events (card_id) values (v_card.id);

  if v_card.destination_type = 'profile' then
    select jsonb_strip_nulls(jsonb_build_object(
      'display_name', p.display_name,
      'phone', p.phone,
      'public_email', p.public_email,
      'headline', p.headline,
      'bio', p.bio,
      'company', p.company,
      'location', p.location,
      'instagram_url', p.instagram_url,
      'facebook_url', p.facebook_url,
      'whatsapp_number', p.whatsapp_number,
      'linkedin_url', p.linkedin_url,
      'tiktok_url', p.tiktok_url,
      'youtube_url', p.youtube_url,
      'x_url', p.x_url,
      'website_url', p.website_url
    ))
    into v_profile
    from public.profiles p
    where p.id = v_card.owner_id;

    return jsonb_build_object(
      'route', 'profile',
      'card_name', v_card.card_name,
      'profile', coalesce(v_profile, '{}'::jsonb)
    );
  end if;

  return jsonb_build_object(
    'route', 'other',
    'card_name', v_card.card_name,
    'destination_url', v_card.destination_url
  );
end;
$$;

revoke all on function public.resolve_card(text) from public;
grant execute on function public.resolve_card(text) to anon, authenticated;

create or replace function public.admin_dashboard_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'total_cards', (select count(*) from public.cards),
      'linked_cards', (
        select count(*) from public.cards
        where (destination_type = 'profile' and owner_id is not null)
           or (destination_type = 'url' and nullif(trim(destination_url), '') is not null)
      ),
      'activated_cards', (select count(*) from public.cards where owner_id is not null),
      'unclaimed_cards', (select count(*) from public.cards where owner_id is null),
      'open_orders', (select count(*) from public.store_orders where payment_status = 'pending' and fulfilment_status <> 'cancelled')
    ),
    'cards', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (
      select id, slug, card_name, owner_id, destination_type, destination_url, tap_count, claimed_at, created_at
      from public.cards order by created_at desc limit 100
    ) c), '[]'::jsonb),
    'orders', '[]'::jsonb
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;
