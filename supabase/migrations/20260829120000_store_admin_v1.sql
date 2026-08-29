-- TapNation storefront orders and protected admin overview.

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
values (
  'order-logos',
  'order-logos',
  false,
  3145728,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.admin_dashboard_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
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
    'cards', coalesce((
      select jsonb_agg(to_jsonb(card_row) order by card_row.created_at desc)
      from (
        select id, slug, card_name, owner_id, destination_type, destination_url, tap_count, claimed_at, created_at
        from public.cards
        order by created_at desc
        limit 100
      ) card_row
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(to_jsonb(order_row) order by order_row.created_at desc)
      from (
        select id, public_reference, customer_name, customer_email, customer_phone, product_type, quantity,
          total_cents, payment_status, fulfilment_status, logo_path, created_at
        from public.store_orders
        order by created_at desc
        limit 50
      ) order_row
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_overview() from public;
grant execute on function public.admin_dashboard_overview() to authenticated;

