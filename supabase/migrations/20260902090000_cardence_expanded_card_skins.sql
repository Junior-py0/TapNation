-- Expand Cardence storefront and production artwork colours.

alter table public.store_orders drop constraint if exists store_orders_card_skin_check;
alter table public.store_orders add constraint store_orders_card_skin_check
  check (card_skin in (
    'aubergine', 'porcelain', 'coral', 'cobalt', 'monochrome',
    'navy', 'forest', 'burgundy', 'sand', 'slate'
  ));

alter table public.card_batches drop constraint if exists card_batches_skin_check;
alter table public.card_batches add constraint card_batches_skin_check
  check (skin in (
    'auto', 'aubergine', 'porcelain', 'coral', 'cobalt', 'monochrome',
    'navy', 'forest', 'burgundy', 'sand', 'slate'
  ));

create or replace function public.admin_create_card_batch(
  p_quantity integer,
  p_batch_name text default 'Cardence batch',
  p_name_prefix text default 'Cardence Card',
  p_design_mode text default 'generic',
  p_skin text default 'auto',
  p_brand_name text default null,
  p_tagline text default null,
  p_logo_path text default null,
  p_base_url text default 'https://cardence.co.za'
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
  v_base_url text := rtrim(coalesce(nullif(trim(p_base_url), ''), 'https://cardence.co.za'), '/');
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
  if v_skin not in (
    'auto', 'aubergine', 'porcelain', 'coral', 'cobalt', 'monochrome',
    'navy', 'forest', 'burgundy', 'sand', 'slate'
  ) then
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
      v_slug := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      v_claim_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
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
