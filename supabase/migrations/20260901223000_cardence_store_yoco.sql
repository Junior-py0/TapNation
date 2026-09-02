-- Cardence commerce: Yoco accounting, Bob Go fulfilment and protected handovers.

alter table public.store_orders add column if not exists delivery_method text not null default 'courier';
alter table public.store_orders add column if not exists card_skin text not null default 'aubergine';
alter table public.store_orders add column if not exists brand_name text;
alter table public.store_orders add column if not exists tagline text;
alter table public.store_orders add column if not exists yoco_checkout_id text;
alter table public.store_orders add column if not exists yoco_payment_id text;
alter table public.store_orders add column if not exists yoco_processing_mode text;
alter table public.store_orders add column if not exists payment_payload jsonb not null default '{}'::jsonb;
alter table public.store_orders add column if not exists paid_at timestamptz;

alter table public.store_orders drop constraint if exists store_orders_delivery_method_check;
alter table public.store_orders add constraint store_orders_delivery_method_check
  check (delivery_method in ('courier', 'pickup'));

alter table public.store_orders drop constraint if exists store_orders_card_skin_check;
alter table public.store_orders add constraint store_orders_card_skin_check
  check (card_skin in ('aubergine', 'porcelain', 'coral', 'cobalt', 'monochrome'));

alter table public.store_orders drop constraint if exists store_orders_payment_method_check;
alter table public.store_orders add constraint store_orders_payment_method_check
  check (payment_method in ('invoice', 'yoco_link', 'paystack', 'yoco'));

alter table public.store_orders drop constraint if exists store_orders_payment_status_check;
alter table public.store_orders add constraint store_orders_payment_status_check
  check (payment_status in ('pending', 'paid', 'failed', 'review', 'refunded', 'cancelled'));

alter table public.store_orders drop constraint if exists store_orders_fulfilment_status_check;
alter table public.store_orders add constraint store_orders_fulfilment_status_check
  check (fulfilment_status in ('new', 'designing', 'awaiting_approval', 'production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'));

create unique index if not exists store_orders_yoco_checkout_idx
  on public.store_orders (yoco_checkout_id) where yoco_checkout_id is not null;

create table if not exists public.store_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);

alter table public.store_payment_events enable row level security;
revoke all on table public.store_payment_events from anon, authenticated;

create table if not exists public.store_pickup_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null default 'In-person handover',
  active boolean not null default true,
  max_uses integer not null default 1 check (max_uses between 1 and 20),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.store_pickup_codes enable row level security;
revoke all on table public.store_pickup_codes from anon, authenticated;

alter table public.store_orders add column if not exists pickup_code_id uuid
  references public.store_pickup_codes(id) on delete set null;

create or replace function public.consume_store_pickup_code(p_code text, p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code public.store_pickup_codes%rowtype;
begin
  select * into v_code
  from public.store_pickup_codes
  where code_hash = encode(digest(upper(trim(coalesce(p_code, ''))), 'sha256'), 'hex')
    and active = true
    and expires_at > now()
    and used_count < max_uses
  for update;

  if v_code.id is null then
    raise exception 'That handover code is invalid or has expired.';
  end if;

  update public.store_pickup_codes
  set used_count = used_count + 1,
      active = case when used_count + 1 >= max_uses then false else active end,
      last_used_at = now()
  where id = v_code.id;

  update public.store_orders set pickup_code_id = v_code.id, updated_at = now()
  where id = p_order_id;

  return v_code.id;
end;
$$;

revoke all on function public.consume_store_pickup_code(text, uuid) from public;
grant execute on function public.consume_store_pickup_code(text, uuid) to service_role;

create or replace function public.admin_create_store_pickup_code(
  p_label text default 'In-person handover',
  p_valid_minutes integer default 60,
  p_max_uses integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_row public.store_pickup_codes%rowtype;
  v_minutes integer := greatest(5, least(coalesce(p_valid_minutes, 60), 1440));
  v_uses integer := greatest(1, least(coalesce(p_max_uses, 1), 20));
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;

  loop
    v_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.store_pickup_codes
      where code_hash = encode(digest(v_code, 'sha256'), 'hex')
    );
  end loop;

  insert into public.store_pickup_codes (code_hash, label, max_uses, expires_at, created_by)
  values (
    encode(digest(v_code, 'sha256'), 'hex'),
    left(coalesce(nullif(trim(p_label), ''), 'In-person handover'), 100),
    v_uses,
    now() + make_interval(mins => v_minutes),
    auth.uid()
  ) returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'code', v_code,
    'label', v_row.label,
    'max_uses', v_row.max_uses,
    'expires_at', v_row.expires_at
  );
end;
$$;

revoke all on function public.admin_create_store_pickup_code(text, integer, integer) from public;
grant execute on function public.admin_create_store_pickup_code(text, integer, integer) to authenticated;

create or replace function public.admin_get_store_pickup_codes()
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
    select jsonb_agg(to_jsonb(c) order by c.created_at desc)
    from (
      select id, label, active, max_uses, used_count, expires_at, created_at, last_used_at
      from public.store_pickup_codes
      order by created_at desc
      limit 20
    ) c
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_get_store_pickup_codes() from public;
grant execute on function public.admin_get_store_pickup_codes() to authenticated;

create or replace function public.admin_update_store_order(
  p_order_id uuid,
  p_payment_status text default null,
  p_fulfilment_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_order public.store_orders%rowtype;
begin
  if auth.uid() is null or not public.is_app_admin() then
    raise exception 'Admin access required.';
  end if;
  if p_payment_status is not null and p_payment_status not in ('pending', 'paid', 'failed', 'review', 'refunded', 'cancelled') then
    raise exception 'Invalid payment status.';
  end if;
  if p_fulfilment_status is not null and p_fulfilment_status not in ('new', 'designing', 'awaiting_approval', 'production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Invalid fulfilment status.';
  end if;

  update public.store_orders
  set payment_status = coalesce(p_payment_status, payment_status),
      fulfilment_status = coalesce(p_fulfilment_status, fulfilment_status),
      paid_at = case when p_payment_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      updated_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_order.id is null then raise exception 'Order not found.'; end if;
  return to_jsonb(v_order);
end;
$$;

revoke all on function public.admin_update_store_order(uuid, text, text) from public;
grant execute on function public.admin_update_store_order(uuid, text, text) to authenticated;

drop policy if exists "Admins can read store order logos" on storage.objects;
create policy "Admins can read store order logos"
on storage.objects for select to authenticated
using (bucket_id = 'order-logos' and public.is_app_admin());

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
      'open_orders', (select count(*) from public.store_orders where payment_status = 'paid' and fulfilment_status not in ('delivered', 'cancelled'))
    ),
    'revenue', jsonb_build_object(
      'yoco_received_cents', (select coalesce(sum(total_cents), 0) from public.store_orders where payment_method = 'yoco' and payment_status = 'paid'),
      'card_sales_cents', (select coalesce(sum(merchandise_total_cents), 0) from public.store_orders where payment_method = 'yoco' and payment_status = 'paid'),
      'shipping_collected_cents', (select coalesce(sum(shipping_amount_cents), 0) from public.store_orders where payment_method = 'yoco' and payment_status = 'paid'),
      'paid_orders', (select count(*) from public.store_orders where payment_method = 'yoco' and payment_status = 'paid'),
      'refunded_cents', (select coalesce(sum(total_cents), 0) from public.store_orders where payment_method = 'yoco' and payment_status = 'refunded')
    ),
    'cards', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (
      select id, slug, card_name, owner_id, destination_type, destination_url, tap_count, claimed_at, created_at
      from public.cards order by created_at desc limit 100
    ) c), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc) from (
      select id, public_reference, customer_name, customer_email, customer_phone, customer_company,
        product_type, quantity, unit_price_cents, merchandise_total_cents, shipping_amount_cents, total_cents,
        delivery_address, shipping_quote, order_notes, logo_path, delivery_method, card_skin, brand_name,
        tagline, payment_method, payment_status, fulfilment_status, courier_name, courier_service,
        tracking_reference, tracking_url, yoco_checkout_id, yoco_payment_id, paid_at, created_at, updated_at
      from public.store_orders order by created_at desc limit 100
    ) o), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;
