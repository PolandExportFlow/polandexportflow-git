drop policy "Users can delete their own item files." on "public"."order_items_files";

drop policy "Users can insert item files for their own orders." on "public"."order_items_files";

drop policy "Users can select their own item files." on "public"."order_items_files";

drop function if exists "public"."check_item_ownership"(item_id_to_check uuid);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sys_check_item_ownership(item_id_to_check uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = item_id_to_check AND o.user_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public.sys_admin_has_access(p_section text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
      SELECT EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
          AND (
            'all' = ANY(au.assigned_sections)
            OR p_section = ANY(au.assigned_sections)
          )
      );
    $function$
;

CREATE OR REPLACE FUNCTION public.sys_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
      SELECT EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
      );
    $function$
;

CREATE OR REPLACE FUNCTION public.user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
v_user uuid := auth.uid();
v_order_id uuid;
v_order_number text;
v_order_type text;

v_order_fullname text := coalesce(p_address->>'order_fullname', '');
v_order_phone text := coalesce(p_address->>'order_phone', '');
v_order_country text := coalesce(p_address->>'order_country', '');
v_order_city text := coalesce(p_address->>'order_city', '');
v_order_postal_code text := coalesce(p_address->>'order_postal_code', '');
v_order_street text := coalesce(p_address->>'order_street', '');
v_order_house_number text := nullif(p_address->>'order_house_number', '');
v_order_delivery_notes text := coalesce(p_address->>'order_delivery_notes', '');

v_items jsonb := coalesce(p_items, '[]'::jsonb);
v_it jsonb;
v_item_id uuid;
v_item_number text;
v_items_out jsonb := '[]'::jsonb;

v_payment_method text := 'paypal';
v_currency text := 'PLN';
v_total_items_value numeric := 0; 
 
BEGIN
IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
END IF;

IF p_service = 'Assisted Purchase' THEN
    v_order_type := 'Assisted Purchase';
ELSIF p_service = 'Parcel Forwarding' THEN
    v_order_type := 'Parcel Forwarding';
ELSE
    RAISE EXCEPTION 'Invalid service type: %', p_service;
END IF;

SELECT opm.payment_code INTO v_payment_method
FROM public.order_payment_methods opm
WHERE opm.payment_is_default = true LIMIT 1;

INSERT INTO public.orders (
    order_status, user_id, order_type, order_note, order_fullname, order_phone, 
    order_country, order_city, order_postal_code, order_street, order_house_number, order_delivery_notes
)
VALUES (
    'created', v_user, v_order_type, p_order_note, v_order_fullname, v_order_phone, 
    v_order_country, v_order_city, v_order_postal_code, v_order_street, v_order_house_number, v_order_delivery_notes
)
RETURNING orders.id, orders.order_number INTO v_order_id, v_order_number;

FOR v_it IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    INSERT INTO public.order_items (
        order_id, item_status, item_name, item_quantity, item_value, item_weight, 
        item_length, item_width, item_height, item_note, item_url
    )
    VALUES (
        v_order_id, 'created', coalesce(v_it->>'item_name',''), coalesce(nullif(v_it->>'item_quantity','')::int, 1), 
        coalesce(nullif(v_it->>'item_value','')::numeric, 0), nullif(v_it->>'item_weight','')::numeric, 
        nullif(v_it->>'item_length','')::numeric, nullif(v_it->>'item_width','')::numeric, 
        nullif(v_it->>'item_height','')::numeric, coalesce(v_it->>'item_note',''), coalesce(v_it->>'item_url','')
    )
    RETURNING order_items.id, order_items.item_number INTO v_item_id, v_item_number;

    v_total_items_value := v_total_items_value
        + coalesce(nullif(v_it->>'item_value','')::numeric, 0)
        * coalesce(nullif(v_it->>'item_quantity','')::int, 1);

   v_items_out := v_items_out || jsonb_build_array(
    jsonb_build_object(
        'item_id', v_item_id::text,      -- UUID, wciąż potrzebne dla relacji
        'item_number', v_item_number,    -- CZYTELNY NUMER (np. PEF-123-001)
        'storage_prefix', v_order_number || '/items/' || v_item_number -- Poprawiony prefix
    )
);
END LOOP;

INSERT INTO public.order_payment (
    order_id, user_id, payment_status, payment_method_code, payment_currency, payment_note, 
    split_due, split_received, total_items_value, 
    total_service_fee, total_subtotal, total_expected_amount, 
    admin_amount_received, admin_amount_costs
)
VALUES (
    v_order_id, v_user, 'none', v_payment_method, v_currency, p_order_note, 
    0, 0, coalesce(v_total_items_value, 0), 
    0, 0, 0, 
    0, 0
)
ON CONFLICT (order_id) DO UPDATE
SET
    payment_method_code     = EXCLUDED.payment_method_code,
    total_items_value       = EXCLUDED.total_items_value,
    total_service_fee       = EXCLUDED.total_service_fee,
    total_subtotal          = EXCLUDED.total_subtotal,
    total_expected_amount   = EXCLUDED.total_expected_amount,
    payment_currency        = EXCLUDED.payment_currency;
    
RETURN jsonb_build_object(
    'order_id', v_order_id::text,
    'order_number', v_order_number,
    'storage_prefix', v_order_number,
    'items', v_items_out
);
END;$function$
;

CREATE OR REPLACE FUNCTION public.user_order_delete(p_lookup text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_order_status text;
  v_order_user uuid;
  v_deleted_count int := 0;
  v_current_user uuid := auth.uid();
BEGIN
  -- 1. Walidacja autoryzacji
  if v_current_user is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if p_lookup is null or length(trim(p_lookup)) = 0 then
    raise exception 'ORDER_LOOKUP_EMPTY' using errcode = 'P0001';
  end if;

  -- 2. Pobierz dane zamówienia (po id lub order_number)
  select id, order_status, user_id
  into v_order_id, v_order_status, v_order_user
  from public.orders
  where (id::text = btrim(p_lookup) OR order_number = btrim(p_lookup))
  limit 1;

  if v_order_id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 3. BEZPIECZEŃSTWO: Sprawdź czy to na pewno zamówienie tego usera
  if v_order_user is distinct from v_current_user then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  -- 4. Sprawdź status (tylko 'created' można usuwać)
  if lower(coalesce(v_order_status,'')) <> 'created' then
    raise exception 'ORDER_NOT_DELETABLE: Only orders in "created" status can be deleted' using errcode = 'P0001';
  end if;

  -- === KASKADOWE USUWANIE (Czyszczenie tabel powiązanych) ===
  
  -- 1. Pliki przedmiotów
  DELETE FROM public.order_items_files 
  WHERE item_id IN (SELECT id FROM public.order_items WHERE order_id = v_order_id);

  -- 2. Pliki ogólne zamówienia
  DELETE FROM public.order_files WHERE order_id = v_order_id;
  
  -- 3. Płatności, Oferty, Przedmioty
  DELETE FROM public.order_payment WHERE order_id = v_order_id;
  DELETE FROM public.order_quotes WHERE order_id = v_order_id;
  DELETE FROM public.order_items WHERE order_id = v_order_id;

  -- === FINAŁ: USUWANIE ZAMÓWIENIA ===
  DELETE FROM public.orders WHERE id = v_order_id;
  
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    -- To się nie powinno już wydarzyć dzięki SECURITY DEFINER
    raise exception 'ORDER_NOT_DELETED' using errcode = 'P0001';
  end if;

  RETURN jsonb_build_object(
    'deleted', true,
    'order_id', v_order_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_order_item_add(p_lookup text, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_order_id uuid;
  j jsonb := jsonb_strip_nulls(p_patch);
  v_new_item public.order_items;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
  IF coalesce(btrim(p_lookup), '') = '' THEN RAISE EXCEPTION 'BAD_PAYLOAD' USING ERRCODE = 'P0001'; END IF;

  -- Sprawdzenie uprawnień (nadal robimy to ręcznie dla bezpieczeństwa)
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE (order_number = p_lookup OR id::text = p_lookup) AND user_id = v_uid;

  IF v_order_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

  -- Insert (teraz zadziała dzięki SECURITY DEFINER)
  INSERT INTO public.order_items (
    order_id, item_name, item_url, item_value, item_quantity, item_note,
    item_weight, item_length, item_width, item_height, item_status
  )
  VALUES (
    v_order_id,
    coalesce(j->>'item_name', 'New item'),
    j->>'item_url',
    coalesce((j->>'item_value')::numeric, 0),
    coalesce((j->>'item_quantity')::numeric, 1),
    j->>'item_note',
    coalesce((j->>'item_weight')::numeric, 0),
    coalesce((j->>'item_length')::numeric, 0),
    coalesce((j->>'item_width')::numeric, 0),
    coalesce((j->>'item_height')::numeric, 0),
    coalesce(j->>'item_status', 'none')
  )
  RETURNING * INTO v_new_item;

  -- Zwracamy wynik
  RETURN jsonb_build_object(
    'item', (
      SELECT jsonb_build_object(
        'id', v_new_item.id,
        'item_number', v_new_item.item_number,
        'item_status', v_new_item.item_status,
        'item_name', v_new_item.item_name,
        'item_url', v_new_item.item_url,
        'item_note', v_new_item.item_note,
        'item_quantity', v_new_item.item_quantity,
        'item_value', v_new_item.item_value,
        'item_weight', v_new_item.item_weight,
        'item_width', v_new_item.item_width,
        'item_height', v_new_item.item_height,
        'item_length', v_new_item.item_length,
        'created_at', v_new_item.created_at,
        'files', '[]'::jsonb
      )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_order_item_delete(p_lookup text, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_uid      uuid := auth.uid();
    v_order_id uuid;
    v_item_count integer;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;

    -- Weryfikacja zamówienia
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE (order_number = p_lookup OR id::text = p_lookup) AND user_id = v_uid;

    IF v_order_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

    -- Usunięcie
    DELETE FROM public.order_items oi
    WHERE oi.id = p_item_id AND oi.order_id = v_order_id
    RETURNING 1 INTO v_item_count;

    IF v_item_count IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

    RETURN jsonb_build_object('success', TRUE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_item_owner_id uuid;
  j jsonb := coalesce(p_patch, '{}'::jsonb);
  v_updated_item public.order_items;
BEGIN
  -- 1. Walidacja
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;

  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'BAD_PAYLOAD: Missing item ID' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Weryfikacja własności
  SELECT o.user_id INTO v_item_owner_id
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id;

  IF v_item_owner_id IS NULL THEN RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF v_item_owner_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = 'P0001'; END IF;

  -- 3. Aktualizacja (Pancerna wersja z COALESCE)
  UPDATE public.order_items
  SET 
    item_name     = COALESCE(j->>'item_name', item_name),
    item_url      = COALESCE(j->>'item_url', item_url),
    item_note     = COALESCE(j->>'item_note', item_note),
    item_status   = COALESCE(j->>'item_status', item_status),
    item_quantity = COALESCE(nullif(j->>'item_quantity', '')::int, item_quantity),
    item_value    = COALESCE(nullif(j->>'item_value', '')::numeric, item_value),
    item_weight   = COALESCE(nullif(j->>'item_weight', '')::numeric, item_weight),
    item_width    = COALESCE(nullif(j->>'item_width', '')::numeric, item_width),
    item_height   = COALESCE(nullif(j->>'item_height', '')::numeric, item_height),
    item_length   = COALESCE(nullif(j->>'item_length', '')::numeric, item_length)
  WHERE id = p_item_id
  RETURNING * INTO v_updated_item;

  -- 4. Zwrot danych
  RETURN jsonb_build_object(
    'item', (
      SELECT jsonb_build_object(
        'id', v_updated_item.id,
        'item_number', v_updated_item.item_number,
        'item_status', v_updated_item.item_status,
        'item_name', v_updated_item.item_name,
        'item_url', v_updated_item.item_url,
        'item_note', v_updated_item.item_note,
        'item_quantity', v_updated_item.item_quantity,
        'item_value', v_updated_item.item_value,
        'item_weight', v_updated_item.item_weight,
        'item_width', v_updated_item.item_width,
        'item_height', v_updated_item.item_height,
        'item_length', v_updated_item.item_length,
        'created_at', v_updated_item.created_at,
        'files', (
            SELECT coalesce(jsonb_agg(
                jsonb_build_object(
                    'id', f.id, 'file_name', f.file_name, 'storage_path', f.storage_path,
                    'mime_type', f.mime_type, 'file_size', f.file_size, 'created_at', f.created_at
                ) ORDER BY f.created_at ASC
            ), '[]'::jsonb)
            FROM public.order_items_files f 
            WHERE f.item_id = v_updated_item.id
        )
      )
    )
  );
END;
$function$
;


  create policy "Users can delete their own item files."
  on "public"."order_items_files"
  as permissive
  for delete
  to authenticated
using (public.sys_check_item_ownership(item_id));



  create policy "Users can insert item files for their own orders."
  on "public"."order_items_files"
  as permissive
  for insert
  to authenticated
with check (public.sys_check_item_ownership(item_id));



  create policy "Users can select their own item files."
  on "public"."order_items_files"
  as permissive
  for select
  to authenticated
using (public.sys_check_item_ownership(item_id));



