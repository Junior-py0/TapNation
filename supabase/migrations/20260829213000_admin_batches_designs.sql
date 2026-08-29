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

