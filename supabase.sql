-- ============================================================
-- TAPNATION DATABASE INSTALL + UPGRADE
-- Safe to run on the existing MVP project. Existing cards and
-- owners are preserved; missing columns, policies and RPCs are added.
-- Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. CORE CARD INVENTORY
-- ------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  claim_code text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  card_name text not null default 'TapNation Card',
  destination_type text not null default 'url',
  destination_url text,
  tap_count bigint not null default 0,
  last_tapped_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards add column if not exists card_theme text not null default 'midnight';
alter table public.cards add column if not exists is_active boolean not null default true;
alter table public.cards alter column card_name set default 'TapNation Card';

alter table public.cards drop constraint if exists cards_destination_type_check;
alter table public.cards add constraint cards_destination_type_check check (
  destination_type in (
    'url', 'instagram', 'tiktok', 'youtube', 'whatsapp',
    'google_review', 'linkedin', 'facebook', 'email', 'phone', 'maps'
  )
);

alter table public.cards drop constraint if exists cards_card_theme_check;
alter table public.cards add constraint cards_card_theme_check check (
  card_theme in ('midnight', 'citrus', 'cobalt', 'pearl')
);

alter table public.cards enable row level security;

drop policy if exists "Owners can read their cards" on public.cards;
create policy "Owners can read their cards"
on public.cards for select to authenticated
using (owner_id = auth.uid());

revoke all on table public.cards from anon;
revoke insert, update, delete on table public.cards from authenticated;
grant select on table public.cards to authenticated;

-- ------------------------------------------------------------
-- 2. USER PLANS
-- Starter gets routing + lifetime counts. Business also gets
-- daily analytics. Verified Paystack functions update profiles.plan.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists business_status text not null default 'inactive';
alter table public.profiles add column if not exists business_interval text;
alter table public.profiles add column if not exists billing_email text;
alter table public.profiles add column if not exists paystack_customer_code text;
alter table public.profiles add column if not exists paystack_subscription_code text;
alter table public.profiles add column if not exists business_access_until timestamptz;
alter table public.profiles add column if not exists business_updated_at timestamptz;

alter table public.profiles drop constraint if exists profiles_business_status_check;
alter table public.profiles add constraint profiles_business_status_check
check (business_status in ('inactive', 'active', 'past_due', 'cancelled'));

alter table public.profiles drop constraint if exists profiles_business_interval_check;
alter table public.profiles add constraint profiles_business_interval_check
check (business_interval is null or business_interval in ('monthly', 'annual'));

alter table public.profiles enable row level security;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = auth.uid());
revoke all on table public.profiles from anon;
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

create table if not exists public.business_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_reference text not null unique,
  billing_interval text not null check (billing_interval in ('monthly', 'annual')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR',
  status text not null default 'initialized'
    check (status in ('initialized', 'success', 'failed', 'review')),
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_payments_user_created_idx
on public.business_payments (user_id, created_at desc);

alter table public.business_payments enable row level security;
revoke all on table public.business_payments from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. OWNER/ADMIN ACCESS
-- Add yourself after running this file (replace the email):
--
-- insert into public.app_admins (user_id)
-- select id from auth.users where email = 'YOUR_EMAIL_HERE'
-- on conflict (user_id) do nothing;
-- ------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from anon, authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- ------------------------------------------------------------
-- 4. TAP EVENTS
-- One privacy-light event is stored per successful route. It stores
-- no IP address, device fingerprint or precise location.
-- ------------------------------------------------------------
create table if not exists public.tap_events (
  id bigint generated always as identity primary key,
  card_id uuid not null references public.cards(id) on delete cascade,
  tapped_at timestamptz not null default now()
);

create index if not exists tap_events_card_time_idx
on public.tap_events (card_id, tapped_at desc);

alter table public.tap_events enable row level security;
revoke all on table public.tap_events from anon, authenticated;

-- ------------------------------------------------------------
-- 5. PUBLIC NFC RESOLVER
-- Resolves only active, configured cards. A successful resolution
-- increments the lifetime count and writes an analytics event.
-- ------------------------------------------------------------
create or replace function public.resolve_card(p_slug text)
returns table (destination_url text, card_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card_id uuid;
begin
  select c.id into v_card_id
  from public.cards c
  where c.slug = upper(trim(p_slug))
    and c.destination_url is not null
    and c.is_active = true
  limit 1;

  if v_card_id is null then
    return;
  end if;

  update public.cards
  set tap_count = tap_count + 1,
      last_tapped_at = now(),
      updated_at = now()
  where id = v_card_id;

  insert into public.tap_events (card_id) values (v_card_id);

  return query
  select c.destination_url, c.card_name
  from public.cards c
  where c.id = v_card_id;
end;
$$;

revoke all on function public.resolve_card(text) from public;
grant execute on function public.resolve_card(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 6. CLAIM A PHYSICAL CARD
-- ------------------------------------------------------------
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

revoke all on function public.claim_card(text) from public;
grant execute on function public.claim_card(text) to authenticated;

-- ------------------------------------------------------------
-- 7. UPDATE DESTINATIONS
-- The old four-argument RPC remains compatible. The v2 RPC adds
-- the visual theme used by the dashboard preview.
-- ------------------------------------------------------------
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
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  if p_destination_type not in (
    'url', 'instagram', 'tiktok', 'youtube', 'whatsapp',
    'google_review', 'linkedin', 'facebook', 'email', 'phone', 'maps'
  ) then
    return jsonb_build_object('success', false, 'message', 'Invalid destination type.');
  end if;

  if p_destination_url is null
     or length(p_destination_url) > 2048
     or p_destination_url !~* '^(https?://|mailto:|tel:)'
     or p_destination_url ~* '^(javascript|data|file):' then
    return jsonb_build_object('success', false, 'message', 'Enter a valid web, email or phone destination.');
  end if;

  update public.cards
  set card_name = left(coalesce(nullif(trim(p_card_name), ''), 'TapNation Card'), 40),
      destination_type = p_destination_type,
      destination_url = p_destination_url,
      updated_at = now()
  where id = p_card_id and owner_id = v_user;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Card not found or not owned by you.');
  end if;

  return jsonb_build_object('success', true, 'message', 'Card updated.');
end;
$$;

revoke all on function public.update_card(uuid, text, text, text) from public;
grant execute on function public.update_card(uuid, text, text, text) to authenticated;

create or replace function public.update_card_v2(
  p_card_id uuid,
  p_card_name text,
  p_destination_type text,
  p_destination_url text,
  p_card_theme text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_card_theme not in ('midnight', 'citrus', 'cobalt', 'pearl') then
    return jsonb_build_object('success', false, 'message', 'Invalid card theme.');
  end if;

  v_result := public.update_card(
    p_card_id,
    p_card_name,
    p_destination_type,
    p_destination_url
  );

  if not coalesce((v_result->>'success')::boolean, false) then
    return v_result;
  end if;

  update public.cards
  set card_theme = p_card_theme, updated_at = now()
  where id = p_card_id and owner_id = auth.uid();

  return jsonb_build_object('success', true, 'message', 'Card updated.');
end;
$$;

revoke all on function public.update_card_v2(uuid, text, text, text, text) from public;
grant execute on function public.update_card_v2(uuid, text, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 8. BUSINESS ANALYTICS
-- Returns aggregates only; raw event rows are never exposed.
-- ------------------------------------------------------------
create or replace function public.get_dashboard_analytics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_days integer := greatest(1, least(coalesce(p_days, 30), 90));
  v_plan text;
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'You must be logged in.';
  end if;

  select plan into v_plan from public.profiles where id = v_user;
  if coalesce(v_plan, 'starter') <> 'business' then
    raise exception 'Business plan required.';
  end if;

  with date_series as (
    select generate_series(
      current_date - (v_days - 1),
      current_date,
      interval '1 day'
    )::date as day
  ),
  daily_data as (
    select ds.day, count(te.id)::bigint as taps
    from date_series ds
    left join public.tap_events te
      on (te.tapped_at at time zone 'Africa/Johannesburg')::date = ds.day
     and exists (
       select 1 from public.cards c
       where c.id = te.card_id and c.owner_id = v_user
     )
    group by ds.day
    order by ds.day
  ),
  card_data as (
    select c.id, c.card_name, count(te.id)::bigint as taps
    from public.cards c
    left join public.tap_events te
      on te.card_id = c.id
     and te.tapped_at >= current_date - (v_days - 1)
    where c.owner_id = v_user
    group by c.id, c.card_name
    order by taps desc, c.card_name
  )
  select jsonb_build_object(
    'period_taps', (select coalesce(sum(taps), 0) from daily_data),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', day, 'taps', taps) order by day), '[]'::jsonb) from daily_data),
    'cards', (select coalesce(jsonb_agg(jsonb_build_object('card_id', id, 'card_name', card_name, 'taps', taps) order by taps desc, card_name), '[]'::jsonb) from card_data)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_dashboard_analytics(integer) from public;
grant execute on function public.get_dashboard_analytics(integer) to authenticated;

-- ------------------------------------------------------------
-- 9. ADMIN CARD BATCH GENERATOR
-- Securely callable from the public dashboard only by app_admins.
-- Slug goes on the NFC tag; claim_code goes in the customer pack.
-- ------------------------------------------------------------
create or replace function public.admin_create_cards(
  p_quantity integer,
  p_name_prefix text default 'TapNation Card',
  p_base_url text default ''
)
returns table (card_name text, slug text, claim_code text, nfc_url text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quantity integer := greatest(1, least(coalesce(p_quantity, 1), 100));
  v_prefix text := left(coalesce(nullif(trim(p_name_prefix), ''), 'TapNation Card'), 28);
  v_slug text;
  v_claim_code text;
  v_card_name text;
  i integer;
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;

  for i in 1..v_quantity loop
    loop
      v_slug := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
      v_claim_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      v_card_name := left(v_prefix || ' ' || i::text, 40);
      begin
        insert into public.cards (slug, claim_code, card_name)
        values (v_slug, v_claim_code, v_card_name);
        exit;
      exception when unique_violation then
        -- Extremely unlikely collision; generate a fresh pair.
      end;
    end loop;

    card_name := v_card_name;
    slug := v_slug;
    claim_code := v_claim_code;
    nfc_url := rtrim(coalesce(p_base_url, ''), '/') || '/?c=' || v_slug;
    return next;
  end loop;
end;
$$;

revoke all on function public.admin_create_cards(integer, text, text) from public;
grant execute on function public.admin_create_cards(integer, text, text) to authenticated;

-- ------------------------------------------------------------
-- 10. FIRST-RUN TEST INVENTORY
-- Creates four unclaimed cards only when the table is completely empty.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.cards) then
    insert into public.cards (slug, claim_code, card_name)
    select
      upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
      upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
      'TapNation Card ' || generate_series
    from generate_series(1, 4);
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 11. STOREFRONT ORDERS + ADMIN OVERVIEW
-- Orders are inserted only by the public Edge Function using the
-- service role. Customers never receive direct table access.
-- ------------------------------------------------------------
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_company text,
  product_type text not null check (product_type in ('original', 'custom', 'bulk')),
  quantity integer not null check (quantity between 1 and 100),
  unit_price_cents integer not null check (unit_price_cents > 0),
  merchandise_total_cents integer not null check (merchandise_total_cents > 0),
  shipping_amount_cents integer not null check (shipping_amount_cents >= 0),
  total_cents integer not null check (total_cents > 0),
  delivery_address jsonb not null default '{}'::jsonb,
  shipping_quote jsonb not null default '{}'::jsonb,
  order_notes text,
  logo_path text,
  payment_method text not null default 'invoice' check (payment_method in ('invoice', 'yoco_link', 'paystack')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  fulfilment_status text not null default 'new' check (fulfilment_status in ('new', 'designing', 'awaiting_approval', 'production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled')),
  courier_name text,
  courier_service text,
  tracking_reference text,
  tracking_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_orders_created_at_idx on public.store_orders (created_at desc);
create index if not exists store_orders_status_idx on public.store_orders (payment_status, fulfilment_status);
alter table public.store_orders enable row level security;
revoke all on table public.store_orders from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-logos', 'order-logos', false, 3145728,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
      'linked_cards', (select count(*) from public.cards where nullif(trim(destination_url), '') is not null),
      'activated_cards', (select count(*) from public.cards where owner_id is not null),
      'unclaimed_cards', (select count(*) from public.cards where owner_id is null),
      'open_orders', (select count(*) from public.store_orders where payment_status = 'pending' and fulfilment_status <> 'cancelled')
    ),
    'cards', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (
      select id, slug, card_name, owner_id, destination_type, destination_url, tap_count, claimed_at, created_at
      from public.cards order by created_at desc limit 100
    ) c), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (
      select id, public_reference, customer_name, customer_email, customer_phone, product_type, quantity,
        total_cents, payment_status, fulfilment_status, logo_path, created_at
      from public.store_orders order by created_at desc limit 50
    ) o), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;

-- Useful final check after the script runs.
select slug, claim_code, card_name, owner_id, destination_type
from public.cards;

-- ------------------------------------------------------------
-- 13. ADMIN BATCHES, DESIGNS AND PRINT PACKS
-- Run this section after the earlier install sections when upgrading an existing project.
-- Cardence admin batches, print metadata and production workflow.
-- Claim codes are returned only through administrator-only functions.

create table if not exists public.card_batches (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null,
  name_prefix text not null default 'Cardence Card',
  quantity integer not null check (quantity between 1 and 500),
  design_mode text not null default 'generic'
    check (design_mode in ('generic', 'custom')),
  skin text not null default 'auto'
    check (skin in ('auto', 'aubergine', 'porcelain', 'coral', 'cobalt', 'monochrome')),
  brand_name text,
  tagline text,
  logo_path text,
  base_url text not null default 'https://cardence.pages.dev',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists card_batches_created_at_idx
  on public.card_batches (created_at desc);

alter table public.card_batches enable row level security;
revoke all on table public.card_batches from anon, authenticated;

alter table public.cards add column if not exists batch_id uuid references public.card_batches(id) on delete set null;
alter table public.cards add column if not exists batch_position integer;
alter table public.cards add column if not exists production_status text not null default 'created';

alter table public.cards drop constraint if exists cards_production_status_check;
alter table public.cards add constraint cards_production_status_check
  check (production_status in ('created', 'encoded', 'printed', 'packed', 'shipped', 'retired'));

create index if not exists cards_batch_position_idx
  on public.cards (batch_id, batch_position);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-design-logos',
  'card-design-logos',
  false,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload card design logos" on storage.objects;
create policy "Admins can upload card design logos"
on storage.objects for insert to authenticated
with check (bucket_id = 'card-design-logos' and public.is_app_admin());

drop policy if exists "Admins can read card design logos" on storage.objects;
create policy "Admins can read card design logos"
on storage.objects for select to authenticated
using (bucket_id = 'card-design-logos' and public.is_app_admin());

drop policy if exists "Admins can update card design logos" on storage.objects;
create policy "Admins can update card design logos"
on storage.objects for update to authenticated
using (bucket_id = 'card-design-logos' and public.is_app_admin())
with check (bucket_id = 'card-design-logos' and public.is_app_admin());

drop policy if exists "Admins can delete card design logos" on storage.objects;
create policy "Admins can delete card design logos"
on storage.objects for delete to authenticated
using (bucket_id = 'card-design-logos' and public.is_app_admin());

create or replace function public.admin_create_card_batch(
  p_quantity integer,
  p_batch_name text default 'Cardence batch',
  p_name_prefix text default 'Cardence Card',
  p_design_mode text default 'generic',
  p_skin text default 'auto',
  p_brand_name text default null,
  p_tagline text default null,
  p_logo_path text default null,
  p_base_url text default 'https://cardence.pages.dev'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_quantity integer := greatest(1, least(coalesce(p_quantity, 1), 500));
  v_batch_id uuid;
  v_batch_name text := left(coalesce(nullif(trim(p_batch_name), ''), 'Cardence batch'), 80);
  v_prefix text := left(coalesce(nullif(trim(p_name_prefix), ''), 'Cardence Card'), 28);
  v_design_mode text := lower(coalesce(nullif(trim(p_design_mode), ''), 'generic'));
  v_skin text := lower(coalesce(nullif(trim(p_skin), ''), 'auto'));
  v_brand_name text := nullif(left(trim(coalesce(p_brand_name, '')), 100), '');
  v_tagline text := nullif(left(trim(coalesce(p_tagline, '')), 140), '');
  v_logo_path text := nullif(left(trim(coalesce(p_logo_path, '')), 240), '');
  v_base_url text := rtrim(coalesce(nullif(trim(p_base_url), ''), 'https://cardence.pages.dev'), '/');
  v_slug text;
  v_claim_code text;
  v_card_name text;
  i integer;
begin
  if v_admin is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;

  if v_design_mode not in ('generic', 'custom') then
    raise exception 'Invalid design mode.';
  end if;
  if v_skin not in ('auto', 'aubergine', 'porcelain', 'coral', 'cobalt', 'monochrome') then
    raise exception 'Invalid card skin.';
  end if;
  if v_base_url !~* '^https://' then
    raise exception 'The card base URL must use https://.';
  end if;

  insert into public.card_batches (
    batch_name, name_prefix, quantity, design_mode, skin, brand_name, tagline,
    logo_path, base_url, created_by
  ) values (
    v_batch_name, v_prefix, v_quantity, v_design_mode, v_skin, v_brand_name,
    v_tagline, v_logo_path, v_base_url, v_admin
  ) returning id into v_batch_id;

  for i in 1..v_quantity loop
    loop
      v_slug := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
      v_claim_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      v_card_name := left(v_prefix || ' ' || i::text, 40);
      begin
        insert into public.cards (
          slug, claim_code, card_name, batch_id, batch_position, card_theme,
          production_status
        ) values (
          v_slug, v_claim_code, v_card_name, v_batch_id, i, 'midnight', 'created'
        );
        exit;
      exception when unique_violation then
        -- Retry the rare slug or claim-code collision.
      end;
    end loop;
  end loop;

  return jsonb_build_object(
    'batch', (
      select to_jsonb(b) from public.card_batches b where b.id = v_batch_id
    ),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'batch_position', c.batch_position,
        'card_name', c.card_name,
        'slug', c.slug,
        'claim_code', c.claim_code,
        'nfc_url', v_base_url || '/?c=' || c.slug,
        'production_status', c.production_status
      ) order by c.batch_position)
      from public.cards c where c.batch_id = v_batch_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_create_card_batch(integer, text, text, text, text, text, text, text, text) from public;
grant execute on function public.admin_create_card_batch(integer, text, text, text, text, text, text, text, text) to authenticated;

create or replace function public.admin_get_batches()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id,
      'batch_name', b.batch_name,
      'name_prefix', b.name_prefix,
      'quantity', b.quantity,
      'design_mode', b.design_mode,
      'skin', b.skin,
      'brand_name', b.brand_name,
      'tagline', b.tagline,
      'logo_path', b.logo_path,
      'base_url', b.base_url,
      'created_at', b.created_at,
      'encoded_count', (select count(*) from public.cards c where c.batch_id = b.id and c.production_status = 'encoded'),
      'printed_count', (select count(*) from public.cards c where c.batch_id = b.id and c.production_status in ('printed', 'packed', 'shipped')),
      'activated_count', (select count(*) from public.cards c where c.batch_id = b.id and c.owner_id is not null),
      'tap_count', (select coalesce(sum(c.tap_count), 0) from public.cards c where c.batch_id = b.id)
    ) order by b.created_at desc)
    from public.card_batches b
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_get_batches() from public;
grant execute on function public.admin_get_batches() to authenticated;

create or replace function public.admin_get_batch_cards(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text;
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;

  select base_url into v_base_url from public.card_batches where id = p_batch_id;
  if v_base_url is null then
    raise exception 'Batch not found.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'batch_position', c.batch_position,
      'card_name', c.card_name,
      'slug', c.slug,
      'claim_code', c.claim_code,
      'nfc_url', v_base_url || '/?c=' || c.slug,
      'owner_id', c.owner_id,
      'destination_type', c.destination_type,
      'destination_url', c.destination_url,
      'tap_count', c.tap_count,
      'production_status', c.production_status,
      'claimed_at', c.claimed_at,
      'created_at', c.created_at
    ) order by c.batch_position)
    from public.cards c where c.batch_id = p_batch_id
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_get_batch_cards(uuid) from public;
grant execute on function public.admin_get_batch_cards(uuid) to authenticated;

create or replace function public.admin_update_card_production_status(
  p_card_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;
  if p_status not in ('created', 'encoded', 'printed', 'packed', 'shipped', 'retired') then
    return jsonb_build_object('success', false, 'message', 'Invalid production status.');
  end if;

  update public.cards
  set production_status = p_status, updated_at = now()
  where id = p_card_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Card not found.');
  end if;
  return jsonb_build_object('success', true, 'message', 'Production status updated.');
end;
$$;

revoke all on function public.admin_update_card_production_status(uuid, text) from public;
grant execute on function public.admin_update_card_production_status(uuid, text) to authenticated;
-- ------------------------------------------------------------
-- 12. LIVING CONTACT PROFILES
-- One default profile per account. Cards now open either the live
-- contact page or one secure external link.
-- ------------------------------------------------------------
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
set destination_type = case when nullif(trim(destination_url), '') is null then 'profile' else 'url' end
where destination_type not in ('profile', 'url')
   or (destination_type = 'url' and nullif(trim(destination_url), '') is null);

alter table public.cards alter column destination_type set default 'profile';
alter table public.cards add constraint cards_destination_type_check check (destination_type in ('profile', 'url'));

create or replace function public.claim_card(p_claim_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_card public.cards%rowtype;
begin
  if v_user is null then return jsonb_build_object('success', false, 'message', 'You must be logged in.'); end if;
  select * into v_card from public.cards where claim_code = upper(trim(p_claim_code)) for update;
  if not found then return jsonb_build_object('success', false, 'message', 'Activation code not found.'); end if;
  if v_card.owner_id is not null and v_card.owner_id <> v_user then
    return jsonb_build_object('success', false, 'message', 'This card has already been claimed.');
  end if;
  update public.cards set owner_id = v_user,
    destination_type = case when nullif(trim(destination_url), '') is null then 'profile' else 'url' end,
    claimed_at = coalesce(claimed_at, now()), updated_at = now() where id = v_card.id;
  return jsonb_build_object('success', true, 'message', 'Card claimed.', 'card_id', v_card.id, 'slug', v_card.slug);
end; $$;

create or replace function public.update_card(p_card_id uuid, p_card_name text, p_destination_type text, p_destination_url text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_url text := nullif(trim(p_destination_url), '');
begin
  if v_user is null then return jsonb_build_object('success', false, 'message', 'You must be logged in.'); end if;
  if p_destination_type not in ('profile', 'url') then
    return jsonb_build_object('success', false, 'message', 'Choose Contact profile or Other link.');
  end if;
  if p_destination_type = 'url' and (v_url is null or length(v_url) > 2048 or v_url !~* '^https://' or v_url ~* '^(javascript|data|file):') then
    return jsonb_build_object('success', false, 'message', 'Enter a secure https:// link.');
  end if;
  update public.cards set card_name = left(coalesce(nullif(trim(p_card_name), ''), 'TapNation Card'), 40),
    destination_type = p_destination_type,
    destination_url = case when p_destination_type = 'profile' then null else v_url end,
    updated_at = now()
  where id = p_card_id and owner_id = v_user;
  if not found then return jsonb_build_object('success', false, 'message', 'Card not found or not owned by you.'); end if;
  return jsonb_build_object('success', true, 'message', 'Card updated.');
end; $$;

create or replace function public.update_contact_profile(
  p_display_name text, p_phone text, p_public_email text, p_headline text, p_bio text,
  p_company text, p_location text, p_instagram_url text, p_facebook_url text,
  p_whatsapp_number text, p_linkedin_url text, p_tiktok_url text, p_youtube_url text,
  p_x_url text, p_website_url text
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_url text;
begin
  if v_user is null then return jsonb_build_object('success', false, 'message', 'You must be logged in.'); end if;
  if nullif(trim(p_display_name), '') is null then
    return jsonb_build_object('success', false, 'message', 'Add your name before saving.');
  end if;
  if length(trim(p_display_name)) > 80 or length(coalesce(trim(p_phone), '')) > 32
    or length(coalesce(trim(p_public_email), '')) > 160 or length(coalesce(trim(p_headline), '')) > 100
    or length(coalesce(trim(p_bio), '')) > 280 or length(coalesce(trim(p_company), '')) > 100
    or length(coalesce(trim(p_location), '')) > 100 or length(coalesce(trim(p_whatsapp_number), '')) > 32 then
    return jsonb_build_object('success', false, 'message', 'One or more profile fields are too long.');
  end if;
  if nullif(trim(p_public_email), '') is not null and trim(p_public_email) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    return jsonb_build_object('success', false, 'message', 'Enter a valid public email address.');
  end if;
  foreach v_url in array array[
    nullif(trim(p_instagram_url), ''), nullif(trim(p_facebook_url), ''), nullif(trim(p_linkedin_url), ''),
    nullif(trim(p_tiktok_url), ''), nullif(trim(p_youtube_url), ''), nullif(trim(p_x_url), ''),
    nullif(trim(p_website_url), '')
  ] loop
    if v_url is not null and (length(v_url) > 240 or v_url !~* '^https?://') then
      return jsonb_build_object('success', false, 'message', 'Social and website links must use http:// or https://.');
    end if;
  end loop;
  insert into public.profiles (id, display_name) values (v_user, left(trim(p_display_name), 80))
  on conflict (id) do update set
    display_name = left(trim(p_display_name), 80), phone = nullif(trim(p_phone), ''),
    public_email = nullif(lower(trim(p_public_email)), ''), headline = nullif(trim(p_headline), ''),
    bio = nullif(trim(p_bio), ''), company = nullif(trim(p_company), ''), location = nullif(trim(p_location), ''),
    instagram_url = nullif(trim(p_instagram_url), ''), facebook_url = nullif(trim(p_facebook_url), ''),
    whatsapp_number = nullif(trim(p_whatsapp_number), ''), linkedin_url = nullif(trim(p_linkedin_url), ''),
    tiktok_url = nullif(trim(p_tiktok_url), ''), youtube_url = nullif(trim(p_youtube_url), ''),
    x_url = nullif(trim(p_x_url), ''), website_url = nullif(trim(p_website_url), ''), updated_at = now();
  return jsonb_build_object('success', true, 'message', 'Contact profile updated.');
end; $$;

revoke all on function public.update_contact_profile(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.update_contact_profile(text,text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;

drop function if exists public.resolve_card(text);
create function public.resolve_card(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card public.cards%rowtype; v_profile jsonb;
begin
  select c.* into v_card from public.cards c
  where c.slug = upper(trim(p_slug)) and c.is_active = true
    and ((c.destination_type = 'profile' and c.owner_id is not null)
      or (c.destination_type = 'url' and nullif(trim(c.destination_url), '') is not null))
  limit 1;
  if not found then return null; end if;
  update public.cards set tap_count = tap_count + 1, last_tapped_at = now(), updated_at = now() where id = v_card.id;
  insert into public.tap_events (card_id) values (v_card.id);
  if v_card.destination_type = 'profile' then
    select jsonb_strip_nulls(jsonb_build_object(
      'display_name', p.display_name, 'phone', p.phone, 'public_email', p.public_email,
      'headline', p.headline, 'bio', p.bio, 'company', p.company, 'location', p.location,
      'instagram_url', p.instagram_url, 'facebook_url', p.facebook_url,
      'whatsapp_number', p.whatsapp_number, 'linkedin_url', p.linkedin_url,
      'tiktok_url', p.tiktok_url, 'youtube_url', p.youtube_url, 'x_url', p.x_url,
      'website_url', p.website_url
    )) into v_profile from public.profiles p where p.id = v_card.owner_id;
    return jsonb_build_object('route', 'profile', 'card_name', v_card.card_name, 'profile', coalesce(v_profile, '{}'::jsonb));
  end if;
  return jsonb_build_object('route', 'other', 'card_name', v_card.card_name, 'destination_url', v_card.destination_url);
end; $$;
revoke all on function public.resolve_card(text) from public;
grant execute on function public.resolve_card(text) to anon, authenticated;

create or replace function public.admin_dashboard_overview()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if auth.uid() is null or not public.is_app_admin() then raise exception 'Admin access required.'; end if;
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'total_cards', (select count(*) from public.cards),
      'linked_cards', (select count(*) from public.cards where (destination_type = 'profile' and owner_id is not null) or (destination_type = 'url' and nullif(trim(destination_url), '') is not null)),
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
end; $$;
revoke all on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;
