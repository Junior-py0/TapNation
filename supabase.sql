-- ============================================================
-- TAPROUTE MVP - SUPABASE SETUP
-- Run this entire file in:
-- Supabase Dashboard -> SQL Editor -> New query
--
-- Then go to Authentication -> Providers -> Email
-- For the fastest MVP, you may temporarily disable email confirmation.
-- Re-enable confirmation before a larger public launch.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. CARDS TABLE
-- ------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  claim_code text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  card_name text not null default 'TapRoute Card',
  destination_type text not null default 'url'
    check (destination_type in ('url', 'whatsapp')),
  destination_url text,
  tap_count bigint not null default 0,
  last_tapped_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards enable row level security;

-- Users may read only cards that belong to them.
drop policy if exists "Owners can read their cards" on public.cards;
create policy "Owners can read their cards"
on public.cards
for select
to authenticated
using (owner_id = auth.uid());

-- No client-side INSERT/UPDATE/DELETE policies are created.
-- Claims and updates go through controlled RPC functions below.

revoke all on table public.cards from anon;
revoke insert, update, delete on table public.cards from authenticated;
grant select on table public.cards to authenticated;

-- ------------------------------------------------------------
-- 2. PUBLIC NFC RESOLVER
-- Anyone tapping a card may resolve the slug.
-- It returns only the destination and display name.
-- It also increments the tap counter.
-- ------------------------------------------------------------
create or replace function public.resolve_card(p_slug text)
returns table (
  destination_url text,
  card_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cards
  set
    tap_count = tap_count + 1,
    last_tapped_at = now()
  where slug = upper(trim(p_slug))
    and destination_url is not null;

  return query
  select c.destination_url, c.card_name
  from public.cards c
  where c.slug = upper(trim(p_slug))
    and c.destination_url is not null
  limit 1;
end;
$$;

revoke all on function public.resolve_card(text) from public;
grant execute on function public.resolve_card(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 3. CLAIM A CARD
-- Customer signs in and enters the printed activation code.
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

  select *
  into v_card
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
  set
    owner_id = v_user,
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
-- 4. UPDATE A CARD
-- The customer may change the name + destination only if they own it.
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

  if p_destination_type not in ('url', 'whatsapp') then
    return jsonb_build_object('success', false, 'message', 'Invalid destination type.');
  end if;

  if p_destination_url is null
     or p_destination_url !~* '^https?://'
     or p_destination_url ~* '^(javascript|data|file):' then
    return jsonb_build_object('success', false, 'message', 'Enter a valid http/https URL.');
  end if;

  update public.cards
  set
    card_name = left(coalesce(nullif(trim(p_card_name), ''), 'TapRoute Card'), 40),
    destination_type = p_destination_type,
    destination_url = p_destination_url,
    updated_at = now()
  where id = p_card_id
    and owner_id = v_user;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Card not found or not owned by you.');
  end if;

  return jsonb_build_object('success', true, 'message', 'Card updated.');
end;
$$;

revoke all on function public.update_card(uuid, text, text, text) from public;
grant execute on function public.update_card(uuid, text, text, text) to authenticated;

-- ------------------------------------------------------------
-- 5. CREATE YOUR FIRST 4 TEST CARDS
-- Run this block ONCE.
--
-- The slug is the permanent public identifier written into the NFC.
-- The claim_code is what you give to the buyer.
-- ------------------------------------------------------------
insert into public.cards (slug, claim_code, card_name)
select
  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  'TapRoute Card'
from generate_series(1, 4);

-- Show the four generated cards.
select
  slug,
  claim_code,
  'YOUR_GITHUB_PAGES_URL/?c=' || slug as nfc_url
from public.cards
order by created_at desc
limit 4;

-- ------------------------------------------------------------
-- LATER: CREATE 50 NEW CARDS
-- When your 50 NFC tags arrive, run ONLY the block below.
-- ------------------------------------------------------------
-- insert into public.cards (slug, claim_code, card_name)
-- select
--   upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
--   upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
--   'TapRoute Card'
-- from generate_series(1, 50);
--
-- select slug, claim_code
-- from public.cards
-- where owner_id is null
-- order by created_at desc
-- limit 50;
