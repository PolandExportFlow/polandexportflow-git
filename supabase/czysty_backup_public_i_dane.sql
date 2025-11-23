--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _realtime; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA _realtime;


ALTER SCHEMA _realtime OWNER TO postgres;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pg_net; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_net; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_net IS 'Async HTTP';


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: supabase_functions; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA supabase_functions;


ALTER SCHEMA supabase_functions OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: admin_get_modal_order(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_get_modal_order(p_lookup text, p_limit_attachments integer) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
 v_lookup text := trim(p_lookup);
 o record;
 out_json jsonb;
BEGIN

 if v_lookup is null or v_lookup = '' then
  return null;
 end if;

 -- 1. POBIERANIE GŁÓWNEGO ZAMÓWIENIA
 select
  id, order_number, order_status, user_id,
  order_note, created_at, admin_note,
  order_type,
  order_fullname, order_phone,
  order_country,
  order_city, order_postal_code,
  order_street, order_house_number,
  order_delivery_notes,
  selected_carrier, selected_tracking_link,
  selected_quote_id,
  selected_shipping_price,
  order_email
 into o
 from public.orders
 where (id::text = v_lookup or order_number = v_lookup)
 limit 1;

 if not found then
  return null;
 end if;

 out_json :=
  jsonb_build_object(
  'uuid', o.id::text,
  
  -- ⭐️ STATUS PANEL ⭐️
  'status', jsonb_build_object(
   'order_id', o.id::text,
   'id', o.id::text,
   'order_number', o.order_number,
   'order_status', coalesce(o.order_status, 'created'),
   'order_type', coalesce(o.order_type, 'Parcel Forwarding'),
   'created_at', o.created_at,
   'selected_carrier', o.selected_carrier,
   'selected_tracking_link', o.selected_tracking_link,
   'selected_shipping_price', coalesce(o.selected_shipping_price, 0)::text,
   'user_full_name', (SELECT u.full_name FROM public.users u WHERE u.id = o.user_id),
   'user_email', (SELECT u.email FROM public.users u WHERE u.id = o.user_id),
   'user_id', o.user_id
  ),

  -- ADDRESS PANEL (bez zmian)
  'address', jsonb_build_object(
   'order_fullname', o.order_fullname,
   'order_email', o.order_email,
   'order_phone', o.order_phone,
   'order_country', o.order_country,
   'order_city', o.order_city,
   'order_postal_code', o.order_postal_code,
   'order_street', o.order_street,
   'order_delivery_notes', o.order_delivery_notes,
   'order_house_number', o.order_house_number
  ),

  -- PAYMENT (NAPRAWIONE: Przywrócono op.payment_service_fee)
  'payment', (
   SELECT row_to_json(op_data)
   FROM (
    SELECT 
     op.id, op.order_id, op.user_id, op.payment_status, 
     op.payment_method_code, op.payment_currency, op.payment_note, 
     op.total_items_value, op.total_subtotal, op.total_service_fee, 
     op.payment_service_fee, -- <-- ⭐️ TO POLE ZOSTAŁO PRZYWRÓCONE (procent)
     op.total_expected_amount, 
     op.split_due, op.split_received, 
     op.admin_amount_costs, op.admin_amount_received, op.admin_amount_profit,
     opm.payment_fee AS payment_fee_pct 
    FROM public.order_payment op
    LEFT JOIN public.order_payment_methods opm ON op.payment_method_code = opm.payment_code
    WHERE op.order_id = o.id
    LIMIT 1
   ) op_data
  ),

  -- TRANSACTIONS (bez zmian)
  'transactions', (
   SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb)
   FROM public.order_payment_transactions t
   WHERE t.order_id = o.id
  ),
  
  -- QUOTES (bez zmian)
  'quotes', (
   SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'quote_carrier', q.quote_carrier,
    'quote_carrier_fee', q.quote_carrier_fee,
    'quote_delivery_days', q.quote_delivery_days,
    'quote_note', q.quote_note,
    'quote_status', q.quote_status,
    'quote_created_at', q.quote_created_at,
    'quote_expires_at', q.quote_expires_at,
    'is_selected', (o.selected_quote_id = q.id)
   ) ORDER BY q.quote_created_at DESC), '[]'::jsonb)
   FROM public.order_quotes q
   WHERE q.order_id = o.id
  ),
  
  -- ATTACHMENTS (bez zmian)
  'attachments', (
   SELECT COALESCE(jsonb_agg(sub.attachment ORDER BY sub.created_at DESC), '[]'::jsonb)
   FROM (
    SELECT jsonb_build_object(
     'id', f.id,
     'storage_path', f.storage_path, 
     'file_name', f.file_name,
     'mime_type', f.mime_type,
     'created_at', f.created_at
    ) AS attachment, f.created_at
    FROM public.order_attachments f
    WHERE f.order_id = o.id
    ORDER BY f.created_at DESC
    LIMIT p_limit_attachments
   ) sub
  ),
  
  -- ITEMS (bez zmian)
  'items', (
   SELECT COALESCE(
    jsonb_agg(
     jsonb_build_object(
      'id', i.id,
      'order_id', i.order_id,
      'item_number', i.item_number,
      'item_name', i.item_name,
      'item_status', i.item_status,
      'item_quantity', i.item_quantity,
      'item_value', i.item_value,
      'item_weight', i.item_weight,
      'dimensions', jsonb_build_object(
       'item_length', i.item_length,
       'item_width', i.item_width,
       'item_height', i.item_height
      ),
      'item_note', i.item_note,
      'item_url', i.item_url,
      'created_at', i.created_at,
      'item_images', (
       SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
         'id', ia.id,
         'storage_path', ia.storage_path,
         'file_name', ia.file_name,
         'mime_type', ia.mime_type,
         'file_size', ia.file_size,
         'created_at', ia.created_at
        ) ORDER BY ia.created_at ASC
       ), '[]'::jsonb)
       FROM public.order_items_attachments ia
       WHERE ia.item_id = i.id
      )
     )
     ORDER BY i.created_at ASC, i.item_number ASC
    ),
    '[]'::jsonb
   )
   FROM public.order_items i
   WHERE i.order_id = o.id
  ),
  'order_note', COALESCE(o.order_note, ''),
  'admin_note', COALESCE(o.admin_note, '')
 );

 RETURN out_json;
END;
$$;


ALTER FUNCTION public.admin_get_modal_order(p_lookup text, p_limit_attachments integer) OWNER TO postgres;

--
-- Name: admin_get_modal_profile(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_get_modal_profile(p_user_id uuid, p_limit_orders integer, p_limit_files integer) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_profile JSONB;
    v_orders JSONB;
    v_files JSONB;
    v_analytics JSONB;
    v_lifetime_value numeric;
    v_orders_count integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object('error', 'user_not_found');
    END IF;

    SELECT JSONB_BUILD_OBJECT(
        'id', u.id,
        'account_type', u.account_type,
        'admin_note', u.admin_note,
        'created_at', u.created_at,
        'is_verified', u.is_verified,
        'user_code', u.user_code,
        'full_name', u.full_name,
        'email', u.email,
        'phone', u.phone,
        'default_full_name', COALESCE(u.default_full_name, u.full_name),
        'default_email', COALESCE(u.default_email, u.email),
        'default_phone', COALESCE(u.default_phone, u.phone),
        'default_country', u.default_country,
        'default_city', u.default_city,
        'default_postal', u.default_postal,
        'default_street', u.default_street,
        'default_apartment', u.default_apartment
    )
    INTO v_profile
    FROM public.users u
    WHERE u.id = p_user_id;

    WITH payment_details AS (
        SELECT
            op.order_id,
            op.admin_amount_received, 
            op.admin_amount_costs
        FROM public.order_payment op
    ),
    recent_orders AS (
        SELECT
            jsonb_build_object(
                'id', o.id, 
                'order_number', COALESCE(o.order_number, o.id::text), 
                'created_at', o.created_at,
                'order_status', o.order_status
            ) AS x
        FROM public.orders o
        LEFT JOIN payment_details pd ON pd.order_id = o.id
        WHERE o.user_id = p_user_id
        ORDER BY o.created_at DESC
        LIMIT p_limit_orders
    )
    SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
    INTO v_orders
    FROM recent_orders;

    WITH all_files AS (
        SELECT id, user_id, file_name, mime_type, created_at, storage_path
        FROM public.order_attachments a
        WHERE a.user_id = p_user_id
        UNION ALL
        SELECT id, user_id, file_name, mime_type, created_at, storage_path
        FROM public.order_items_attachments ia
        WHERE ia.user_id = p_user_id
    )
    SELECT COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', f.id,
                'file_name', f.file_name,
                'mime_type', f.mime_type,
                'storage_path', f.storage_path,
                'created_at', f.created_at
            )
            ORDER BY f.created_at DESC
        ),
        '[]'::JSONB
    )
    INTO v_files
    FROM all_files f
    LIMIT p_limit_files;

    SELECT 
        COUNT(*), 
        COALESCE(SUM(op.admin_amount_received - op.admin_amount_costs), 0)
    INTO 
        v_orders_count, 
        v_lifetime_value
    FROM public.orders o
    INNER JOIN public.order_payment op ON op.order_id = o.id
    WHERE o.user_id = p_user_id;

    SELECT JSONB_BUILD_OBJECT(
        'orders_count', v_orders_count,
        'first_order_at', MIN(o.created_at),
        'last_order_at', MAX(o.created_at),
        'lifetime_value_pln', v_lifetime_value::numeric,
        'avg_order_value_pln', 
        CASE 
            WHEN v_orders_count > 0 THEN (v_lifetime_value / v_orders_count)::numeric 
            ELSE 0::numeric 
        END
    )
    INTO v_analytics
    FROM public.orders o
    WHERE o.user_id = p_user_id;

    RETURN JSONB_BUILD_OBJECT(
        'profile', v_profile,
        'orders', v_orders,
        'files', v_files,
        'analytics', v_analytics
    );
END;
$$;


ALTER FUNCTION public.admin_get_modal_profile(p_user_id uuid, p_limit_orders integer, p_limit_files integer) OWNER TO postgres;

--
-- Name: admin_has_access(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_has_access(p_section text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND (
        'all' = ANY(au.assigned_sections)
        OR p_section = ANY(au.assigned_sections)
      )
  );
$$;


ALTER FUNCTION public.admin_has_access(p_section text) OWNER TO postgres;

--
-- Name: admin_is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND array_length(au.assigned_sections, 1) IS NOT NULL
  );
$$;


ALTER FUNCTION public.admin_is_admin() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    item_status text DEFAULT 'none'::text,
    item_name text,
    item_url text,
    item_note text,
    item_value numeric(12,2),
    item_quantity integer,
    item_weight numeric(10,2),
    item_length numeric(10,2),
    item_width numeric(10,2),
    item_height numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    item_number text
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: admin_order_item_add(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_item_add(p_order_id uuid, p_patch jsonb DEFAULT '{}'::jsonb) RETURNS public.order_items
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
j jsonb := coalesce(p_patch, '{}'::jsonb);
r public.order_items;
v_order_code text;
v_item_code text;
BEGIN
SELECT o.order_number INTO v_order_code
FROM public.orders o WHERE o.id = p_order_id;

IF v_order_code IS NULL THEN
RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
END IF;

v_item_code := coalesce(
nullif(j->>'item_number', ''),
public.sys_create_pef_item_code(v_order_code)
);

INSERT INTO public.order_items (
order_id, item_number, item_status, item_name, item_url, item_note,
item_value, item_quantity, item_weight, item_length, item_width, item_height,
created_at
)
VALUES (
p_order_id, v_item_code,
coalesce(nullif(j->>'item_status', ''), 'none'),
coalesce(nullif(j->>'item_name', ''), 'New item'),
nullif(j->>'item_url', ''),
nullif(j->>'item_note', ''),
coalesce(nullif(j->>'item_value', '')::numeric, 0),
greatest(1, coalesce(nullif(j->>'item_quantity', '')::int, 1)),
coalesce(nullif(j->>'item_weight', '')::numeric, 0),
coalesce(nullif(j->>'item_length', '')::numeric, 0),
coalesce(nullif(j->>'item_width', '')::numeric, 0),
coalesce(nullif(j->>'item_height', '')::numeric, 0),
now()
)
RETURNING * INTO r;

RETURN r;
END;$$;


ALTER FUNCTION public.admin_order_item_add(p_order_id uuid, p_patch jsonb) OWNER TO postgres;

--
-- Name: order_items_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    file_size bigint,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'uploading'::text NOT NULL
);


ALTER TABLE public.order_items_files OWNER TO postgres;

--
-- Name: admin_order_item_attachments_add(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_item_attachments_add(p_item_id uuid, p_attachments jsonb) RETURNS SETOF public.order_items_files
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_item_id uuid := p_item_id;
    v_user_id uuid;
    obj jsonb;
    r public.order_items_attachments;
BEGIN
    SELECT (SELECT user_id FROM orders o WHERE o.id = oi.order_id)
    INTO v_user_id
    FROM public.order_items oi
    WHERE oi.id = v_item_id;

    IF v_user_id IS NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE id = v_item_id) THEN
            RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    FOR obj IN SELECT * FROM jsonb_array_elements(p_attachments)
    LOOP
        INSERT INTO public.order_items_attachments (
            id, 
            item_id, 
            user_id,
            file_name, 
            storage_path, 
            mime_type, 
            file_size, 
            created_at 
            -- ⭐️ USUNIĘTO 'updated_at' STĄD
        )
        VALUES (
            coalesce(nullif(obj->>'id',''), gen_random_uuid()::text)::uuid,
            v_item_id,
            v_user_id,
            nullif(obj->>'file_name',''),
            nullif(obj->>'storage_path',''),
            nullif(obj->>'mime_type',''),
            coalesce(nullif(obj->>'file_size','')::bigint, 0),
            coalesce(nullif(obj->>'created_at','')::timestamptz, now())
            -- ⭐️ USUNIĘTO 'now()' STĄD
        )
        RETURNING * INTO r;
        
        RETURN NEXT r;
    END LOOP;

    UPDATE public.order_items SET updated_at = now() WHERE id = v_item_id;
END;
$$;


ALTER FUNCTION public.admin_order_item_attachments_add(p_item_id uuid, p_attachments jsonb) OWNER TO postgres;

--
-- Name: admin_order_item_attachments_delete(uuid, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_item_attachments_delete(p_item_id uuid, p_attachment_ids text[]) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    deleted_ids text[];
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE id = p_item_id) THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    WITH deleted AS (
        DELETE FROM public.order_items_attachments
        WHERE item_id = p_item_id
          AND id::text = ANY(p_attachment_ids)
        RETURNING id
    )
    SELECT array_agg(id) INTO deleted_ids FROM deleted;

    UPDATE public.order_items SET updated_at = now() WHERE id = p_item_id;

    RETURN deleted_ids;
END;
$$;


ALTER FUNCTION public.admin_order_item_attachments_delete(p_item_id uuid, p_attachment_ids text[]) OWNER TO postgres;

--
-- Name: admin_order_item_delete(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_item_delete(p_item_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.order_items WHERE id = p_item_id;
    IF NOT found THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
END;
$$;


ALTER FUNCTION public.admin_order_item_delete(p_item_id uuid) OWNER TO postgres;

--
-- Name: admin_order_item_update(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_item_update(p_item_id uuid, p_patch jsonb DEFAULT '{}'::jsonb) RETURNS public.order_items
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
j jsonb := coalesce(p_patch, '{}'::jsonb);
r public.order_items;
BEGIN
SELECT * INTO r FROM public.order_items WHERE id = p_item_id;
IF r.id IS NULL THEN
RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
END IF;

UPDATE public.order_items
SET item_name = case when j ? 'item_name' then nullif(j->>'item_name','') else item_name end,
item_url = case when j ? 'item_url' then nullif(j->>'item_url','') else item_url end,
item_note = case when j ? 'item_note' then nullif(j->>'item_note','') else item_note end,
item_quantity = case when j ? 'item_quantity'
then greatest(1, nullif(j->>'item_quantity','')::int)
else item_quantity end,
item_value = case when j ? 'item_value' then nullif(j->>'item_value','')::numeric else item_value end,
item_weight = case when j ? 'item_weight' then nullif(j->>'item_weight','')::numeric else item_weight end,
item_width = case when j ? 'item_width' then nullif(j->>'item_width','')::numeric else item_width end,
item_height = case when j ? 'item_height' then nullif(j->>'item_height','')::numeric else item_height end,
item_length = case when j ? 'item_length' then nullif(j->>'item_length','')::numeric else item_length end,
item_status = case when j ? 'item_status' then nullif(j->>'item_status','') else item_status end
WHERE id = p_item_id
RETURNING * INTO r;

RETURN r;
END;$$;


ALTER FUNCTION public.admin_order_item_update(p_item_id uuid, p_patch jsonb) OWNER TO postgres;

--
-- Name: order_payment_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    transaction_amount numeric DEFAULT 0.00 NOT NULL,
    transaction_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_payment_transactions OWNER TO postgres;

--
-- Name: admin_order_payment_transaction_add(uuid, uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_payment_transaction_add(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text) RETURNS public.order_payment_transactions
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
  new_transaction public.order_payment_transactions;
BEGIN
  INSERT INTO public.order_payment_transactions
    (payment_id, order_id, transaction_amount, transaction_note)
  VALUES
    (p_payment_id, p_order_id, p_amount, p_note)
  RETURNING * INTO new_transaction;
  RETURN new_transaction;
END;$$;


ALTER FUNCTION public.admin_order_payment_transaction_add(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text) OWNER TO postgres;

--
-- Name: admin_order_payment_transaction_delete(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_payment_transaction_delete(p_transaction_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
BEGIN
  DELETE FROM public.order_payment_transactions
  WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found with id %', p_transaction_id;
  END IF;

END;$$;


ALTER FUNCTION public.admin_order_payment_transaction_delete(p_transaction_id uuid) OWNER TO postgres;

--
-- Name: admin_order_resolve_id(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_resolve_id(p_input text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_id uuid;
begin
  -- jeżeli to już UUID → zwróć po castcie
  begin
    v_id := p_input::uuid;
    return v_id;
  exception when others then
    -- nie jest UUID, lecimy dalej
    null;
  end;

  -- szukaj po order_number
  select o.id
    into v_id
  from public.orders o
  where o.order_number = p_input
  limit 1;

  return v_id; -- może być null
end;
$$;


ALTER FUNCTION public.admin_order_resolve_id(p_input text) OWNER TO postgres;

--
-- Name: admin_order_update_additional_info(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_additional_info(p_lookup text, p_info text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id          uuid;
    -- ZMIENNE LOKALNE DO ZAPISANIA STANÓW PRZED ZWROTEM:
    v_order_note  text;
    v_updated_at  timestamptz;
    v_rows        int;
    v_new_note    text := coalesce(regexp_replace(coalesce(p_info, ''), '\s+', ' ', 'g'), '');
BEGIN
    -- znajdź zamówienie po UUID albo order_number
    SELECT o.id
    INTO v_id
    FROM public.orders o
    WHERE o.id::text = p_lookup OR o.order_number = p_lookup
    LIMIT 1;

    IF v_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
    END IF;

    -- aktualizuj notatkę klienta (order_note)
    UPDATE public.orders
        SET order_note = v_new_note,
            updated_at = now()
    WHERE id = v_id
        AND order_note IS DISTINCT FROM v_new_note
    RETURNING order_note, updated_at INTO v_order_note, v_updated_at; -- POBIERAMY ZMIENIONE WARTOŚCI

    GET DIAGNOSTICS v_rows = row_count;
    
    -- Jeśli nie było update'u (v_rows = 0), pobieramy stary stan:
    IF v_rows = 0 THEN
        SELECT order_note, updated_at 
        INTO v_order_note, v_updated_at
        FROM public.orders 
        WHERE id = v_id;
    END IF;


    -- ZWROT DANYCH (używamy bezpiecznych zmiennych lokalnych)
    RETURN jsonb_build_object(
        'ok',               true,
        'updated',          (v_rows > 0),
        'order_id',         v_id::text,
        'order_note',       v_order_note,
        'updated_at',       v_updated_at
    );
END;
$$;


ALTER FUNCTION public.admin_order_update_additional_info(p_lookup text, p_info text) OWNER TO postgres;

--
-- Name: admin_order_update_address(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_address(p_lookup text, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id uuid;
BEGIN
  -- 1. Walidacja wejścia
  if p_lookup is null or length(trim(p_lookup)) = 0 then
    raise exception 'BAD_LOOKUP' using errcode = 'P0001';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'BAD_PATCH' using errcode = 'P0001';
  end if;

  -- 2. Znajdź zamówienie (admin może edytować każde)
  select id
  into v_order_id
  from public.orders
  where (id::text = trim(p_lookup) or order_number = trim(p_lookup))
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 3. Aktualizuj TYLKO klucze obecne w p_patch
  update public.orders
  set
    order_fullname = case when p_patch ? 'order_fullname' then nullif(p_patch->>'order_fullname','') else order_fullname end,
    order_email = case when p_patch ? 'order_email' then nullif(trim(p_patch->>'order_email'),'') else order_email end,
    order_phone = case when p_patch ? 'order_phone' then nullif(p_patch->>'order_phone','') else order_phone end,
    order_country = case when p_patch ? 'order_country' then nullif(p_patch->>'order_country','') else order_country end,
    order_city = case when p_patch ? 'order_city' then nullif(p_patch->>'order_city','') else order_city end,
    order_postal_code = case when p_patch ? 'order_postal_code' then nullif(p_patch->>'order_postal_code','') else order_postal_code end,
    order_street = case when p_patch ? 'order_street' then nullif(p_patch->>'order_street','') else order_street end,
    order_house_number = case when p_patch ? 'order_house_number' then nullif(p_patch->>'order_house_number','') else order_house_number end,
    order_delivery_notes = case when p_patch ? 'order_delivery_notes' then nullif(p_patch->>'order_delivery_notes','') else order_delivery_notes end
  where id = v_order_id;

  return jsonb_build_object('ok', true, 'updated', true, 'order_id', v_order_id);
END;
$$;


ALTER FUNCTION public.admin_order_update_address(p_lookup text, p_patch jsonb) OWNER TO postgres;

--
-- Name: admin_order_update_admin_note(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_admin_note(p_lookup text, p_info text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id          uuid;
    v_rows        int;
    v_new_note    text := coalesce(p_info, ''); -- COALESCE dla bezpieczeństwa
    
    -- ZMIENNE LOKALNE DO ZAPISANIA ZAKTUALIZOWANYCH WARTOŚCI
    v_admin_note  text;
    v_updated_at  timestamptz;
BEGIN
    -- 1. Znajdź zamówienie po UUID albo order_number
    SELECT o.id
    INTO v_id
    FROM public.orders o
    WHERE o.id::text = p_lookup OR o.order_number = p_lookup
    LIMIT 1;

    IF v_id IS NULL THEN
        -- Zgodnie z formatem front-endu zwracamy błąd JSON
        RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
    END IF;

    -- 2. Aktualizuj notatkę i pobierz zaktualizowane wartości (RETURNING INTO)
    UPDATE public.orders
        SET admin_note = v_new_note,
            updated_at = now()
    WHERE id = v_id
        AND admin_note IS DISTINCT FROM v_new_note -- Aktualizuj tylko, jeśli jest zmiana
    RETURNING admin_note, updated_at
    INTO v_admin_note, v_updated_at;

    GET DIAGNOSTICS v_rows = row_count;

    -- 3. Jeśli update nie nastąpił (v_rows = 0), pobierz aktualne wartości z bazy
    IF v_rows = 0 THEN
        SELECT admin_note, updated_at 
        INTO v_admin_note, v_updated_at
        FROM public.orders 
        WHERE id = v_id;
    END IF;

    -- 4. Zwróć wynik (używając bezpiecznych zmiennych lokalnych)
    RETURN jsonb_build_object(
        'ok',           true,
        'updated',      (v_rows > 0),
        'order_id',     v_id::text,
        -- ZGODNOŚĆ Z CONVENCJĄ FRONT-ENDU
        'admin_note',   v_admin_note,
        'updated_at',   v_updated_at
    );
END;
$$;


ALTER FUNCTION public.admin_order_update_admin_note(p_lookup text, p_info text) OWNER TO postgres;

--
-- Name: admin_order_update_attachments_add(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_attachments_add(p_order_id uuid, p_user_id uuid, p_files jsonb) RETURNS SETOF jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    f jsonb;
    v_row public.order_attachments%ROWTYPE;
BEGIN
    FOR f IN SELECT * FROM jsonb_array_elements(p_files)
    LOOP
        INSERT INTO public.order_attachments (
            order_id, user_id, storage_path, file_name, mime_type, created_at
        )
        VALUES (
            p_order_id,
            p_user_id, -- UŻYWAMY NOWEGO ARGUMENTU
            f->>'storage_path', 
            f->>'file_name',
            f->>'mime_type',    
            now()
        )
        RETURNING * INTO v_row;

        -- ZWROT DANYCH ZGODNY Z TYPEM ATTACHMENT (storage_path)
        RETURN NEXT jsonb_build_object(
            'id', v_row.id,
            'storage_path', v_row.storage_path,
            'file_name', v_row.file_name,
            'mime_type', v_row.mime_type,
            'created_at', v_row.created_at
        );
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION public.admin_order_update_attachments_add(p_order_id uuid, p_user_id uuid, p_files jsonb) OWNER TO postgres;

--
-- Name: admin_order_update_attachments_delete(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_attachments_delete(p_file_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_rows int;
BEGIN
    DELETE FROM public.order_attachments f
    WHERE f.id = p_file_id;

    GET DIAGNOSTICS v_rows = row_count;
    
    -- Zwraca TRUE jeśli usunięto 1 wiersz, FALSE jeśli 0
    RETURN v_rows > 0;
END;
$$;


ALTER FUNCTION public.admin_order_update_attachments_delete(p_file_id uuid) OWNER TO postgres;

--
-- Name: admin_order_update_payment_admin_data(text, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_payment_admin_data(p_lookup text, p_costs numeric, p_received numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id UUID;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = p_lookup LIMIT 1;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  UPDATE public.order_payment
  SET 
    admin_amount_costs = p_costs,
    admin_amount_received = p_received,
    admin_amount_profit = p_received - p_costs
  WHERE order_id = v_order_id;
END;
$$;


ALTER FUNCTION public.admin_order_update_payment_admin_data(p_lookup text, p_costs numeric, p_received numeric) OWNER TO postgres;

--
-- Name: admin_order_update_payment_note(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_payment_note(p_lookup text, p_note text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id UUID;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = p_lookup LIMIT 1;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  UPDATE public.order_payment
  SET payment_note = p_note
  WHERE order_id = v_order_id;
END;
$$;


ALTER FUNCTION public.admin_order_update_payment_note(p_lookup text, p_note text) OWNER TO postgres;

--
-- Name: admin_order_update_payment_products_split(text, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id UUID;
  v_total_items NUMERIC;
  v_new_split_due NUMERIC;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = p_lookup LIMIT 1;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  -- Pobierz całkowitą wartość produktów, aby obliczyć resztę
  SELECT total_items_value INTO v_total_items
  FROM public.order_payment
  WHERE order_id = v_order_id;

  v_new_split_due := v_total_items - p_split_received;

  UPDATE public.order_payment
  SET 
    split_received = p_split_received,
    split_due = v_new_split_due
  WHERE order_id = v_order_id;
END;
$$;


ALTER FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric) OWNER TO postgres;

--
-- Name: admin_order_update_payment_products_split(text, numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric, p_split_due numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id UUID;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = p_lookup LIMIT 1;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Order not found for lookup: %', p_lookup; END IF;

  -- ⭐️ Usunięto całą logikę obliczeniową
  -- Zapisujemy obie wartości bezpośrednio z parametrów
  UPDATE public.order_payment
  SET 
    split_received = p_split_received,
    split_due = p_split_due
  WHERE order_id = v_order_id;
END;
$$;


ALTER FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric, p_split_due numeric) OWNER TO postgres;

--
-- Name: admin_order_update_payment_service_fee(text, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_payment_service_fee(p_lookup text, p_service_fee numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id UUID;
  v_payment record;
  v_new_service_fee_amount NUMERIC;
  v_new_payment_fee_amount NUMERIC; -- Obliczona, ale nie zapisywana
  v_new_total_expected NUMERIC;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = p_lookup LIMIT 1;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Order not found for lookup: %', p_lookup; END IF;

  SELECT op.*, opm.payment_fee AS payment_fee_pct
  INTO v_payment
  FROM public.order_payment op
  LEFT JOIN public.order_payment_methods opm ON op.payment_method_code = opm.payment_code
  WHERE op.order_id = v_order_id;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment record not found for order_id: %', v_order_id;
  END IF;

  v_new_service_fee_amount := round(v_payment.total_subtotal * (p_service_fee / 100.0), 2);
  v_new_payment_fee_amount := round((v_payment.total_subtotal + v_new_service_fee_amount) * (COALESCE(v_payment.payment_fee_pct, 0) / 100.0), 2);
  v_new_total_expected := v_payment.total_subtotal + v_new_service_fee_amount + v_new_payment_fee_amount;

  -- ⭐️ POPRAWIONY UPDATE ⭐️
  -- Zaktualizuj tylko te kolumny, które istnieją w bazie
  UPDATE public.order_payment
  SET 
    payment_service_fee = p_service_fee,      -- Procent (np. 9)
    total_service_fee = v_new_service_fee_amount,   -- Kwota (np. 18.00)
    total_expected_amount = v_new_total_expected    -- Całkowita suma (np. 225.50)
    -- Usunięto linię, która próbowała zapisać `payment_fee`
  WHERE id = v_payment.id;
END;
$$;


ALTER FUNCTION public.admin_order_update_payment_service_fee(p_lookup text, p_service_fee numeric) OWNER TO postgres;

--
-- Name: admin_order_update_payment_status(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_payment_status(p_lookup text, p_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id UUID;
BEGIN
  SELECT id INTO v_order_id FROM public.orders WHERE order_number = p_lookup LIMIT 1;
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  UPDATE public.order_payment
  SET payment_status = p_status
  WHERE order_id = v_order_id;
END;
$$;


ALTER FUNCTION public.admin_order_update_payment_status(p_lookup text, p_status text) OWNER TO postgres;

--
-- Name: admin_order_update_status(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_order_update_status(p_lookup text, p_status text, p_source text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    v_id uuid;
    o public.orders%ROWTYPE;
BEGIN
    SELECT public.admin_order_resolve_id(p_lookup) INTO v_id;
    IF v_id IS NULL THEN
        SELECT id INTO v_id
        FROM public.orders
        WHERE id::text = p_lookup OR order_number = p_lookup
        LIMIT 1;
    END IF;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'Order not found for %', p_lookup USING ERRCODE = 'P0002';
    END IF;

    -- 1. ZAKTUALIZUJ STATUS / TYP (Usunięto 'updated_at')
    UPDATE public.orders
        SET order_status = COALESCE(p_status, order_status),
            order_type   = COALESCE(p_source, order_type)
    WHERE id = v_id;

    -- 2. POBIERZ ŚWIEŻE DANE
    SELECT * INTO o
    FROM public.orders
    WHERE id = v_id;

    -- 3. ZWRÓĆ DANE (Usunięto 'updated_at')
    RETURN jsonb_build_object(
        'status', jsonb_build_object(
            'order_id',             o.id::text,
            'id',                   o.id::text,
            'order_number',         o.order_number,
            'order_status',         o.order_status, 
            'order_type',           COALESCE(o.order_type, 'Parcel Forwarding'), 
            'created_at',           o.created_at,
            'selected_carrier',     o.selected_carrier,
            'selected_tracking_link', o.selected_tracking_link,
            'selected_shipping_price', coalesce(o.selected_shipping_price, 0)::text,
            'user_full_name',       (SELECT u.full_name FROM public.users u WHERE u.id = o.user_id),
            'user_email',           (SELECT u.email FROM public.users u WHERE u.id = o.user_id),
            'user_id',              o.user_id
        )
    );
END;$$;


ALTER FUNCTION public.admin_order_update_status(p_lookup text, p_status text, p_source text) OWNER TO postgres;

--
-- Name: admin_quote_accept_by_id(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_quote_accept_by_id(p_quote_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
with q as (
  select id,
         order_id,
         quote_carrier,
         quote_carrier_fee
  from public.order_quotes
  where id = p_quote_id
),
upd_quotes as (
  update public.order_quotes oq
  set quote_status     = 'accepted',
      quote_expires_at = null
  from q
  where oq.id = q.id
)
update public.orders o
set selected_quote_id       = q.id,
    selected_carrier        = q.quote_carrier,
    selected_shipping_price = q.quote_carrier_fee,
    updated_at              = now()
from q
where o.id = q.order_id;
$$;


ALTER FUNCTION public.admin_quote_accept_by_id(p_quote_id uuid) OWNER TO postgres;

--
-- Name: order_quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    quote_number text NOT NULL,
    quote_carrier text NOT NULL,
    quote_carrier_fee numeric(12,2) NOT NULL,
    quote_status text DEFAULT 'active'::text NOT NULL,
    quote_created_at timestamp with time zone DEFAULT now(),
    quote_expires_at timestamp with time zone,
    quote_note text,
    quote_delivery_days text,
    CONSTRAINT order_quotes_quote_status_check CHECK ((quote_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'active'::text, 'cancelled'::text])))
);


ALTER TABLE public.order_quotes OWNER TO postgres;

--
-- Name: admin_quote_create_by_order_id(uuid, jsonb, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_quote_create_by_order_id(p_order_id uuid, p_rows jsonb, p_valid_days integer DEFAULT 14) RETURNS SETOF public.order_quotes
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  v_prefix  text;
  v_expires timestamptz := now() + make_interval(days => greatest(1, least(60, coalesce(p_valid_days,14))));
  r         jsonb;
  v_n       int;
  v_number  text;
  v_id      uuid;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_id is null';
  END IF;

  SELECT o.order_number INTO v_prefix
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'order not found for id=%', p_order_id;
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) LOOP
    SELECT coalesce(max((regexp_match(q.quote_number, '-Q-(\d+)$'))[1]::int), 0) + 1
      INTO v_n
    FROM public.order_quotes q
    WHERE q.order_id = p_order_id;

    LOOP
      v_number := v_prefix || '-Q-' || lpad(v_n::text, 3, '0');

      BEGIN
        INSERT INTO public.order_quotes (
          id,
          order_id,
          quote_number,
          quote_carrier,
          quote_carrier_fee,
          quote_status,
          quote_created_at,
          quote_expires_at,
          quote_note,
          quote_delivery_days
        ) VALUES (
          gen_random_uuid(),
          p_order_id,
          v_number,
          coalesce(r->>'carrierLabel', r->>'carrierKey'),
          nullif(r->>'pricePLN','')::numeric,
          'active',
          now(),
          v_expires,
          nullif(r->>'note',''),
          nullif(r->>'deliveryDays','')
        )
        RETURNING id INTO v_id;

        EXIT; -- wstawiono OK

      EXCEPTION
        WHEN unique_violation THEN
          v_n := v_n + 1; -- spróbuj kolejny numer
          CONTINUE;
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY
    SELECT *
    FROM public.order_quotes
    WHERE order_id = p_order_id
    ORDER BY quote_created_at DESC;
END;
$_$;


ALTER FUNCTION public.admin_quote_create_by_order_id(p_order_id uuid, p_rows jsonb, p_valid_days integer) OWNER TO postgres;

--
-- Name: admin_quote_create_id_by_order_id(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_quote_create_id_by_order_id(p_order_id uuid) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
with ord as (
  select o.order_number
  from public.orders o
  where o.id = p_order_id
),
last_no as (
  select max(coalesce((regexp_match(q.quote_number, '-Q-(\\d+)$'))[1]::int, 0)) as n
  from public.order_quotes q
  where q.order_id = p_order_id
)
select
  coalesce((select order_number from ord), 'ORD')
  || '-Q-'
  || lpad((coalesce((select n from last_no),0) + 1)::text, 3, '0');
$_$;


ALTER FUNCTION public.admin_quote_create_id_by_order_id(p_order_id uuid) OWNER TO postgres;

--
-- Name: admin_quote_delete_by_id(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_quote_delete_by_id(p_quote_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  delete from public.order_quotes where id = p_quote_id;
$$;


ALTER FUNCTION public.admin_quote_delete_by_id(p_quote_id uuid) OWNER TO postgres;

--
-- Name: admin_quote_expire_and_purge(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_quote_expire_and_purge(p_grace_days integer DEFAULT 14) RETURNS TABLE(expired_to_inactive integer, purged_inactive integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- ACTIVE -> INACTIVE
  UPDATE order_quotes
     SET quote_status = 'inactive',
         quote_expires_at = NOW() + make_interval(days => GREATEST(p_grace_days, 0))
   WHERE quote_status = 'active'
     AND quote_expires_at IS NOT NULL
     AND quote_expires_at < NOW();

  GET DIAGNOSTICS expired_to_inactive = ROW_COUNT;

  -- INACTIVE -> DELETE
  DELETE FROM order_quotes
   WHERE quote_status = 'inactive'
     AND quote_expires_at IS NOT NULL
     AND quote_expires_at < NOW();

  GET DIAGNOSTICS purged_inactive = ROW_COUNT;

  RETURN;
END;
$$;


ALTER FUNCTION public.admin_quote_expire_and_purge(p_grace_days integer) OWNER TO postgres;

--
-- Name: admin_quote_list_by_order_id(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_quote_list_by_order_id(p_order_id uuid) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
select coalesce(
  jsonb_agg(jsonb_build_object(
    'id', q.id,
    'quoteNumber', q.quote_number,
    'carrier', q.quote_carrier,
    'price', q.quote_carrier_fee,
    'deliveryDays', q.quote_delivery_days,
    'note', q.quote_note,
    'created_at', q.quote_created_at,
    'expires_at', q.quote_expires_at,
    'status', q.quote_status
  ) order by q.quote_created_at desc),
  '[]'::jsonb
)
from public.order_quotes q
where q.order_id = p_order_id;
$$;


ALTER FUNCTION public.admin_quote_list_by_order_id(p_order_id uuid) OWNER TO postgres;

--
-- Name: admin_rebuild_items_search(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_rebuild_items_search() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_order_id uuid;
  v_text text;
begin
  -- ustal order_id dla operacji
  if (tg_op = 'DELETE') then
    v_order_id := old.order_id;
  else
    v_order_id := new.order_id;
  end if;

  -- zbuduj tekst z aktualnych pozycji tego zamówienia
  select string_agg(
           trim(both ' ' from concat(i.item_name, ' ×', i.item_quantity)),
           ', ' order by i.created_at asc
         )
  into v_text
  from public.order_items i
  where i.order_id = v_order_id;

  -- KLUCZ: jeśli nie ma już pozycji → USUŃ rekord z search
  if v_text is null or length(btrim(v_text)) = 0 then
    delete from public.order_items_search where order_id = v_order_id;
  else
    insert into public.order_items_search (order_id, items_text)
    values (v_order_id, v_text)
    on conflict (order_id) do update
      set items_text = excluded.items_text;
  end if;

  return null;
end;
$$;


ALTER FUNCTION public.admin_rebuild_items_search() OWNER TO postgres;

--
-- Name: admin_tasks_delete_completed(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_tasks_delete_completed() RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
  v_count int;
begin
  delete from admin_tasks
  where task_status = 'completed'
    and completed_at is not null
    and completed_at < now() - interval '24 hours';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


ALTER FUNCTION public.admin_tasks_delete_completed() OWNER TO postgres;

--
-- Name: admin_user_profile_update_admin_note(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.admin_user_profile_update_admin_note(p_user_id uuid, p_notes text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id uuid;
  v_rows int;
BEGIN
  SELECT u.id INTO v_id
  FROM public.users u
  WHERE u.id = p_user_id
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  UPDATE public.users
  SET admin_note = COALESCE(p_notes, '')
  WHERE id = v_id;

  GET DIAGNOSTICS v_rows = row_count;

  RETURN (
    SELECT jsonb_build_object(
      'ok', true,
      'updated', (v_rows > 0),
      'user_id', u.id::text,
      'admin_note', u.admin_note
    )
    FROM public.users u
    WHERE u.id = v_id
  );
END;
$$;


ALTER FUNCTION public.admin_user_profile_update_admin_note(p_user_id uuid, p_notes text) OWNER TO postgres;

--
-- Name: sys_check_if_user_exists(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sys_check_if_user_exists(p_email text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
declare
  v_exists boolean;
begin
  select exists(
    select 1
    from auth.users u
    where lower(u.email) = lower(p_email)
  )
  into v_exists;

  return coalesce(v_exists, false);
end;
$$;


ALTER FUNCTION public.sys_check_if_user_exists(p_email text) OWNER TO postgres;

--
-- Name: sys_create_pef_item_code(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sys_create_pef_item_code(p_order_code text) RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  v_code   text;
  v_suffix text;
begin
  loop
    v_suffix := lpad(floor(random() * 1000)::text, 3, '0'); -- 000–999
    v_code   := p_order_code || '-' || v_suffix;

    exit when not exists (
      select 1 from public.order_items i
      where i.item_number = v_code                        -- ⬅️ było item_code
    );
  end loop;

  return v_code;
end;
$$;


ALTER FUNCTION public.sys_create_pef_item_code(p_order_code text) OWNER TO postgres;

--
-- Name: sys_create_pef_order_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sys_create_pef_order_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  v_code text;
begin
  -- generuj 6 losowych cyfr
  v_code := 'PEF-' || lpad(floor(random() * 1000000)::text, 6, '0');

  -- upewnij się, że nie istnieje taki order_number
  while exists (
    select 1 from public.orders o where o.order_number = v_code
  ) loop
    v_code := 'PEF-' || lpad(floor(random() * 1000000)::text, 6, '0');
  end loop;

  return v_code;
end;
$$;


ALTER FUNCTION public.sys_create_pef_order_code() OWNER TO postgres;

--
-- Name: sys_create_pef_user_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sys_create_pef_user_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
declare
  v_code text;
  v_suffix text;
begin
  loop
    -- 🔹 Losowy 7-cyfrowy kod (0000000–9999999)
    v_suffix := lpad(floor(random() * 10000000)::text, 7, '0');
    v_code := 'PEF-U' || v_suffix;

    -- 🔹 Sprawdź unikalność
    exit when not exists (
      select 1 from public.users u
      where u.user_code = v_code
    );
  end loop;

  return v_code;
end;
$$;


ALTER FUNCTION public.sys_create_pef_user_code() OWNER TO postgres;

--
-- Name: sys_handle_new_user(); Type: FUNCTION; Schema: public; Owner: supabase_admin
--

CREATE FUNCTION public.sys_handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_email     text;
  v_full_name text;
  v_phone     text;
BEGIN
  -- Wczytanie i czyszczenie metadanych
  v_email := lower(coalesce(NEW.email, ''));
  v_full_name := nullif(
                    trim(
                      coalesce(
                        NEW.raw_user_meta_data->>'full_name',
                        NEW.raw_user_meta_data->>'fullName',
                        NEW.raw_user_meta_data->>'name',
                        (coalesce(NEW.raw_user_meta_data->>'given_name','') || ' ' ||
                         coalesce(NEW.raw_user_meta_data->>'family_name','')),
                        v_email
                      )
                    ),
                  '');
  v_phone := nullif(trim(coalesce(NEW.raw_user_meta_data->>'phone', '')), '');

  -- INSERT OR UPDATE w tabeli public.users
  INSERT INTO public.users (
    id, email, full_name, phone, account_type, created_at, is_verified
  )
  VALUES (
    NEW.id,
    v_email,
    coalesce(v_full_name, v_email),
    v_phone,
    'b2c',
    now(),
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET email        = EXCLUDED.email, 
      full_name    = coalesce(nullif(EXCLUDED.full_name, ''), public.users.full_name), 
      phone        = coalesce(nullif(EXCLUDED.phone, ''), public.users.phone),
      account_type = coalesce(public.users.account_type, 'b2c'),
      is_verified  = EXCLUDED.is_verified;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sys_handle_new_user() OWNER TO supabase_admin;

--
-- Name: sys_storage_path_belongs_to_user(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sys_storage_path_belongs_to_user(path text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
declare
  v_uid   uuid := auth.uid();
  v_first text;     -- pierwszy segment ścieżki = order_number
  v_owner uuid;
begin
  -- brak sesji / zła ścieżka
  if v_uid is null or path is null or length(btrim(path)) = 0 then
    return false;
  end if;

  -- normalizacja i wyjęcie 1. segmentu
  v_first := split_part(regexp_replace(btrim(path), '^/+', ''), '/', 1);
  if coalesce(v_first, '') = '' then
    return false;
  end if;

  -- sprawdź właściciela zamówienia o tym order_number
  select o.user_id
    into v_owner
  from public.orders o
  where o.order_number = v_first
  limit 1;

  if not found then
    return false;
  end if;

  return v_owner = v_uid;

exception when others then
  -- twardo, bezpiecznie:
  return false;
end;
$$;


ALTER FUNCTION public.sys_storage_path_belongs_to_user(path text) OWNER TO postgres;

--
-- Name: sys_sync_user_profile_after_update(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sys_sync_user_profile_after_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_email_new  text;
  v_full_name  text;
  v_phone      text;
BEGIN
  IF (NEW.email IS DISTINCT FROM OLD.email)
     OR (NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data)
     OR (NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at)
  THEN
    v_email_new := lower(coalesce(NEW.email, ''));

    v_full_name := nullif(
                     trim(
                       coalesce(
                         NEW.raw_user_meta_data->>'full_name',
                         NEW.raw_user_meta_data->>'fullName',
                         NEW.raw_user_meta_data->>'name',
                         (coalesce(NEW.raw_user_meta_data->>'given_name','') || ' ' ||
                          coalesce(NEW.raw_user_meta_data->>'family_name','')),
                         v_email_new
                       )
                     ),
                   '');

    v_phone := nullif(trim(coalesce(NEW.raw_user_meta_data->>'phone', '')), '');

    UPDATE public.users u
    SET email       = v_email_new,
        full_name   = coalesce(v_full_name, v_email_new),
        phone       = coalesce(v_phone, u.phone),
        is_verified = (NEW.email_confirmed_at IS NOT NULL)
    WHERE u.id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.sys_sync_user_profile_after_update() OWNER TO postgres;

--
-- Name: trg_admin_quotes_apply_accepted(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_admin_quotes_apply_accepted() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  other_accepted record;
begin
  -- 1) Gdy NOWA/EDYTOWANA wycena jest accepted
  if new.quote_status = 'accepted' then
    -- tylko jedna accepted na zamówienie
    update public.order_quotes
       set quote_status = 'active'
     where order_id = new.order_id
       and id <> new.id
       and quote_status = 'accepted';

    -- wbijamy wybraną do orders
    update public.orders
       set selected_quote_id       = new.id,
           selected_carrier        = new.quote_carrier,
           selected_shipping_price = new.quote_carrier_fee,
           updated_at              = now()
     where id = new.order_id;

  else
    -- 2) Cofnięto z accepted -> przepisz inną accepted lub wyczyść
    if tg_op = 'update' and old.quote_status = 'accepted' and new.quote_status <> 'accepted' then
      select id, quote_carrier, quote_carrier_fee
        into other_accepted
      from public.order_quotes
      where order_id = new.order_id
        and quote_status = 'accepted'
      order by quote_created_at desc nulls last
      limit 1;

      if found then
        update public.orders
           set selected_quote_id       = other_accepted.id,
               selected_carrier        = other_accepted.quote_carrier,
               selected_shipping_price = other_accepted.quote_carrier_fee,
               updated_at              = now()
         where id = new.order_id;
      else
        update public.orders
           set selected_quote_id       = null,
               selected_carrier        = null,
               selected_shipping_price = null,
               updated_at              = now()
         where id = new.order_id;
      end if;
    end if;
  end if;

  -- 3) Gdy accepted edytujemy (zmiana carrier/fee) – dociągnij do orders
  if tg_op = 'update'
     and new.quote_status = 'accepted'
     and (coalesce(new.quote_carrier,'') is distinct from coalesce(old.quote_carrier,'')
       or new.quote_carrier_fee is distinct from old.quote_carrier_fee)
  then
    update public.orders
       set selected_carrier        = new.quote_carrier,
           selected_shipping_price = new.quote_carrier_fee,
           updated_at              = now()
     where id = new.order_id
       and selected_quote_id = new.id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.trg_admin_quotes_apply_accepted() OWNER TO postgres;

--
-- Name: trg_sys_order_items_set_item_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_sys_order_items_set_item_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_order_number text;
begin
  if new.item_number is not null and new.item_number <> '' then
    return new;
  end if;

  select o.order_number into v_order_number
  from public.orders o
  where o.id = new.order_id;

  if v_order_number is null then
    raise exception 'Order % has no order_number yet', new.order_id::text;
  end if;

  new.item_number := public.sys_create_pef_item_code(v_order_number);
  return new;
end;
$$;


ALTER FUNCTION public.trg_sys_order_items_set_item_number() OWNER TO postgres;

--
-- Name: trg_sys_orders_set_order_number(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_sys_orders_set_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.sys_create_pef_order_code();
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.trg_sys_orders_set_order_number() OWNER TO postgres;

--
-- Name: trg_sys_user_set_user_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trg_sys_user_set_user_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.user_code := sys_create_pef_user_code();
  return new;
end;
$$;


ALTER FUNCTION public.trg_sys_user_set_user_code() OWNER TO postgres;

--
-- Name: user_get_default_address(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_get_default_address() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_address_patch json;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT
        json_build_object(
            'order_fullname', default_full_name,
            'order_email', default_email,
            'order_phone', default_phone,
            'order_country', default_country,
            'order_city', default_city,
            'order_postal_code', default_postal,
            'order_street', default_street,
            'order_house_number', default_apartment
        )
    INTO v_address_patch
    FROM public.users
    WHERE id = v_uid
    LIMIT 1;

    IF v_address_patch IS NULL THEN
        RAISE EXCEPTION 'User or default address not found';
    END IF;

    RETURN v_address_patch;
END;
$$;


ALTER FUNCTION public.user_get_default_address() OWNER TO postgres;

--
-- Name: user_get_modal_order(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_get_modal_order(p_lookup text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid;
  v_lookup text := trim(p_lookup);
  o record;
  out_json jsonb;
BEGIN
  v_uid := auth.uid();

  if v_lookup is null or v_lookup = '' then return null; end if;
  if v_uid is null then return null; end if;

  -- 1. Pobierz główne zamówienie
  select * into o
  from public.orders
  where (id::text = v_lookup or order_number = v_lookup)
    and user_id = v_uid
  limit 1;

  if not found then return null; end if;

  out_json := 
    jsonb_build_object(
    'statusPanel', jsonb_build_object(
        'order_number', o.order_number,
        'order_status', coalesce(o.order_status, 'created'),
        'order_type', nullif(o.order_type, ''),
        'order_note', nullif(o.order_note, ''),
        -- ✅ ZMIANA NAZWY KLUCZA NA 'files'
        'files', (
            SELECT coalesce(
                jsonb_agg(
                    jsonb_build_object(
                        'id', a.id,
                        'file_name', a.file_name,
                        'storage_path', a.storage_path,
                        'mime_type', a.mime_type,
                        'file_size', a.file_size,
                        'created_at', a.created_at
                    ) ORDER BY a.created_at DESC
                ), '[]'::jsonb
            )
            FROM public.order_files a
            WHERE a.order_id = o.id
        )
    ),

    'checkoutPanel', (
        -- (Tutaj kod bez zmian, skróciłem dla czytelności, wklej całość z poprzedniego lub zostaw logikę checkoutu)
        -- ... (logika płatności bez zmian) ...
        WITH last_payment AS ( SELECT * FROM public.order_payment WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1 ),
        default_method AS ( SELECT * FROM public.order_payment_methods WHERE payment_is_default = true LIMIT 1 ),
        chosen AS (
             SELECT lp.*, coalesce(dm.payment_fee, 0) as method_fee 
             FROM last_payment lp FULL JOIN default_method dm ON true LIMIT 1
        )
        SELECT jsonb_build_object(
            'payment_currency', coalesce(chosen.payment_currency, 'PLN'),
            'payment_method_code', coalesce(chosen.payment_method_code, 'paypal'),
            'payment_status', coalesce(chosen.payment_status, 'none'),
            'payment_fee_pct', coalesce(chosen.method_fee, 0),
            'order_total_items_value', coalesce(chosen.total_items_value, 0),
            'order_service_fee', coalesce(chosen.total_service_fee, 0),
            'selected_shipping_price', coalesce(o.selected_shipping_price, 0),
            'split_due', coalesce(chosen.split_due, 0),
            'split_received', coalesce(chosen.split_received, 0),
            'quotes', (
                SELECT coalesce(jsonb_agg(jsonb_build_object(
                    'id', q.id, 'quote_carrier', q.quote_carrier, 'quote_carrier_fee', q.quote_carrier_fee,
                    'quote_delivery_days', q.quote_delivery_days, 'quote_status', q.quote_status,
                    'quote_note', nullif(q.quote_note,''), 'selected', (q.id = o.selected_quote_id)
                ) ORDER BY q.quote_created_at DESC), '[]'::jsonb)
                FROM public.order_quotes q WHERE q.order_id = o.id
            )
        ) FROM chosen
    ),

    'addressPanel', jsonb_build_object(
        'order_fullname', o.order_fullname, 'order_email', o.order_email, 'order_phone', o.order_phone,
        'order_country', o.order_country, 'order_city', o.order_city, 'order_postal_code', o.order_postal_code,
        'order_street', o.order_street, 'order_house_number', o.order_house_number,
        'order_delivery_notes', nullif(o.order_delivery_notes, '')
    ),

    'trackingPanel', case 
        when o.selected_carrier IS NOT NULL or o.selected_tracking_link IS NOT NULL then
            jsonb_build_object('selected_carrier', nullif(o.selected_carrier, ''), 'selected_tracking_link', o.selected_tracking_link)
        else null end,

    'itemsPanel', (
        SELECT coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', i.id,
                    'item_number', i.item_number,
                    'item_status', i.item_status,
                    'item_name', i.item_name,
                    'item_url', nullif(i.item_url,''),
                    'item_note', nullif(i.item_note,''),
                    'item_value', coalesce(i.item_value, 0),
                    'item_quantity', coalesce(i.item_quantity, 1),
                    'item_weight', coalesce(i.item_weight, 0),
                    'item_length', coalesce(i.item_length, 0),
                    'item_width', coalesce(i.item_width, 0),
                    'item_height', coalesce(i.item_height, 0),
                    -- ✅ ZMIANA NAZWY KLUCZA NA 'files'
                    'files', (
                        SELECT coalesce(
                            jsonb_agg(
                                jsonb_build_object(
                                    'id', f.id, 'file_name', f.file_name, 'storage_path', f.storage_path,
                                    'mime_type', f.mime_type, 'file_size', f.file_size, 'created_at', f.created_at
                                ) ORDER BY f.created_at ASC
                            ), '[]'::jsonb
                        )
                        FROM public.order_items_files f
                        WHERE f.item_id = i.id
                    )
                ) ORDER BY i.created_at DESC, i.id DESC
            ), '[]'::jsonb
        )
        FROM public.order_items i WHERE i.order_id = o.id
    )
  );

  return out_json;
END;
$$;


ALTER FUNCTION public.user_get_modal_order(p_lookup text) OWNER TO postgres;

--
-- Name: user_order_create(text, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
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
    v_order_id, v_user, 'pending', v_payment_method, v_currency, p_order_note, 
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
END;$$;


ALTER FUNCTION public.user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text) OWNER TO postgres;

--
-- Name: user_order_delete(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_delete(p_lookup text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_order_id uuid;
  v_order_status text;
  v_order_user uuid;
  v_deleted_count int := 0;
  v_current_user uuid := auth.uid();
BEGIN
  -- Walidacja autoryzacji
  if v_current_user is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if p_lookup is null or length(trim(p_lookup)) = 0 then
    raise exception 'ORDER_LOOKUP_EMPTY' using errcode = 'P0001';
  end if;

  -- Pobierz dane zamówienia (po id lub order_number)
  select id, order_status, user_id
  into v_order_id, v_order_status, v_order_user
  from public.orders
  where (id::text = btrim(p_lookup) OR order_number = btrim(p_lookup))
  limit 1;

  if v_order_id is null then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Sprawdź właściciela
  if v_order_user is distinct from v_current_user then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  -- Sprawdź status (tylko 'created' można usuwać)
  if lower(coalesce(v_order_status,'')) <> 'created' then
    raise exception 'ORDER_NOT_DELETABLE' using errcode = 'P0001';
  end if;

  -- === KASKADOWE USUWANIE Z NOWYCH TABEL PLIKÓW ===
  
  -- 1. Pliki przedmiotów (order_items_files)
  DELETE FROM public.order_items_files 
  WHERE item_id IN (SELECT id FROM public.order_items WHERE order_id = v_order_id);

  -- 2. Pliki ogólne zamówienia (order_files)
  DELETE FROM public.order_files WHERE order_id = v_order_id;
  
  -- === USUWANIE BIZNESOWE ===

  delete from public.order_items where order_id = v_order_id;
  delete from public.order_quotes where order_id = v_order_id;
  delete from public.order_payment where order_id = v_order_id;

  -- Na końcu usuwamy samo zamówienie
  delete from public.orders where id = v_order_id;
  
  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    raise exception 'ORDER_NOT_DELETED' using errcode = 'P0001';
  end if;

  return json_build_object(
    'deleted', true,
    'order_id', v_order_id
  );
END;
$$;


ALTER FUNCTION public.user_order_delete(p_lookup text) OWNER TO postgres;

--
-- Name: user_order_file_delete(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_file_delete(p_file_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_path text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;

  -- Sprawdź czy plik istnieje i należy do usera
  SELECT storage_path INTO v_path
  FROM public.order_files
  WHERE id = p_file_id
    AND user_id = v_uid;

  IF NOT FOUND THEN
    -- Jeśli nie ma rekordu, zwracamy sukces (idempotentność)
    RETURN json_build_object('deleted', false, 'message', 'File not found or access denied');
  END IF;

  -- Usuń z bazy
  DELETE FROM public.order_files WHERE id = p_file_id;

  RETURN json_build_object('deleted', true, 'path', v_path);
END;
$$;


ALTER FUNCTION public.user_order_file_delete(p_file_id uuid) OWNER TO postgres;

--
-- Name: user_order_item_add(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_item_add(p_lookup text, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$DECLARE
v_uid uuid;
v_order_id uuid;
j jsonb := jsonb_strip_nulls(p_patch);
v_new_item public.order_items;
BEGIN
v_uid := auth.uid();

IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
IF coalesce(btrim(p_lookup), '') = '' THEN RAISE EXCEPTION 'BAD_PAYLOAD' USING ERRCODE = 'P0001'; END IF;

SELECT id INTO v_order_id
FROM public.orders
WHERE (order_number = p_lookup OR id::text = p_lookup) AND user_id = v_uid;

IF v_order_id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

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
'attachments', '[]'::jsonb
)
)
);
END;$$;


ALTER FUNCTION public.user_order_item_add(p_lookup text, p_patch jsonb) OWNER TO postgres;

--
-- Name: user_order_item_delete(text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_item_delete(p_lookup text, p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_uid      uuid := auth.uid();
    v_order_id uuid;
    v_item_count integer;
BEGIN
    -- 1. WALIDACJA & AUTORYZACJA (Wymagamy ID itemu)
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001';
    END IF;

    IF coalesce(btrim(p_lookup), '') = '' OR p_item_id IS NULL THEN
        RAISE EXCEPTION 'BAD_PAYLOAD: Missing order reference or item ID' USING ERRCODE = 'P0001'; -- NAPRAWIONY BŁĄD
    END IF;

    -- 2. WYSZUKIWANIE I WERYFIKACJA ZAMÓWIENIA
    SELECT id INTO v_order_id
    FROM public.orders
    WHERE (order_number = p_lookup OR id::text = p_lookup)
      AND user_id = v_uid;

    IF v_order_id IS NULL THEN
        RAISE EXCEPTION 'NOT_FOUND: Order not found or unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- 3. USUNIĘCIE ITEMU
    DELETE FROM public.order_items oi
    WHERE
        oi.id = p_item_id
        AND oi.order_id = v_order_id -- Kluczowe: upewnienie się, że item należy do tego zamówienia
    RETURNING 1 INTO v_item_count;

    IF v_item_count IS NULL THEN
         RAISE EXCEPTION 'NOT_FOUND: Item not found in this order' USING ERRCODE = 'P0001';
    END IF;

    -- 4. ZWROT REZULTATU
    RETURN jsonb_build_object(
        'item_id', p_item_id,
        'order_id', v_order_id,
        'success', TRUE,
        'status', 'deleted'
    );

END;
$$;


ALTER FUNCTION public.user_order_item_delete(p_lookup text, p_item_id uuid) OWNER TO postgres;

--
-- Name: user_order_item_file_delete(text, uuid, text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_item_file_delete(p_lookup text, p_item_id uuid, p_file_ids text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_order_id  uuid;
  v_item_id   uuid;
  v_deleted_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;

  -- 1. Znajdź zamówienie
  SELECT o.id INTO v_order_id
  FROM public.orders o
  WHERE (o.id::text = btrim(p_lookup) OR o.order_number = btrim(p_lookup))
    AND o.user_id = v_uid
  LIMIT 1;
  
  IF v_order_id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  -- 2. Znajdź item
  SELECT oi.id INTO v_item_id
  FROM public.order_items oi
  WHERE oi.id = p_item_id AND oi.order_id = v_order_id
  LIMIT 1;

  IF v_item_id IS NULL THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;

  -- 3. Usuń pliki z tabeli 'order_items_files'
  WITH deleted AS (
    DELETE FROM public.order_items_files
    WHERE item_id = v_item_id
      AND id::text = ANY(p_file_ids)
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  -- 4. Zwróć aktualną listę
  RETURN (
    WITH files_list AS (
      SELECT coalesce(jsonb_agg(
               jsonb_build_object(
                 'id', f.id, 
                 'file_name', f.file_name, 
                 'storage_path', f.storage_path,
                 'mime_type', f.mime_type, 
                 'file_size', f.file_size, 
                 'created_at', f.created_at
               ) ORDER BY f.created_at ASC
             ), '[]'::jsonb) AS arr
      FROM public.order_items_files f
      WHERE f.item_id = v_item_id
    )
    SELECT jsonb_build_object(
      'ok', true,
      'deleted_count', v_deleted_count,
      'item', (
          SELECT to_jsonb(oi) 
          FROM public.order_items oi 
          WHERE oi.id = v_item_id
      ) || jsonb_build_object('files', files_list.arr)
    )
    FROM files_list
  );
END;
$$;


ALTER FUNCTION public.user_order_item_file_delete(p_lookup text, p_item_id uuid, p_file_ids text[]) OWNER TO postgres;

--
-- Name: user_order_item_update(text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$DECLARE
v_uid uuid := auth.uid();
v_now timestamptz := now();
v_order_id uuid;
v_item_id uuid;
j jsonb := coalesce(p_patch, '{}'::jsonb);
r public.order_items; -- Wiersz itemu do zwrotu
BEGIN
IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0001'; END IF;
IF coalesce(btrim(p_lookup), '') = '' OR p_item_id IS NULL THEN
RAISE EXCEPTION 'BAD_PAYLOAD' USING ERRCODE = 'P0001';
END IF;

SELECT o.id INTO v_order_id
FROM public.orders o
WHERE (o.id::text = btrim(p_lookup) OR o.order_number = btrim(p_lookup))
AND o.user_id = v_uid
LIMIT 1;

IF v_order_id IS NULL THEN RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

SELECT * INTO r
FROM public.order_items oi
WHERE oi.id = p_item_id AND oi.order_id = v_order_id
LIMIT 1;

IF r.id IS NULL THEN RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;

UPDATE public.order_items
SET 
item_name = CASE WHEN j ? 'item_name' THEN nullif(j->>'item_name','') ELSE item_name END,
item_url = CASE WHEN j ? 'item_url' THEN nullif(j->>'item_url','') ELSE item_url END,
item_note = CASE WHEN j ? 'item_note' THEN nullif(j->>'item_note','') ELSE item_note END,
item_quantity = CASE WHEN j ? 'item_quantity' THEN greatest(1, coalesce((j->>'item_quantity')::int, item_quantity)) ELSE item_quantity END,
item_value = CASE WHEN j ? 'item_value' THEN (CASE WHEN coalesce(j->>'item_value','') = '' THEN NULL ELSE (j->>'item_value')::numeric END) ELSE item_value END,
item_weight = CASE WHEN j ? 'item_weight' THEN (CASE WHEN coalesce(j->>'item_weight','') = '' THEN NULL ELSE (j->>'item_weight')::numeric END) ELSE item_weight END,
item_width = CASE WHEN j ? 'item_width' THEN (CASE WHEN coalesce(j->>'item_width','') = '' THEN NULL ELSE (j->>'item_width')::numeric END) ELSE item_width END,
item_height = CASE WHEN j ? 'item_height' THEN (CASE WHEN coalesce(j->>'item_height','') = '' THEN NULL ELSE (j->>'item_height')::numeric END) ELSE item_height END,
item_length = CASE WHEN j ? 'item_length' THEN (CASE WHEN coalesce(j->>'item_length','') = '' THEN NULL ELSE (j->>'item_length')::numeric END) ELSE item_length END,
item_status = CASE WHEN j ? 'item_status' THEN nullif(j->>'item_status','') ELSE item_status END
WHERE id = p_item_id
RETURNING * INTO r; -- Zapisujemy zaktualizowany wiersz do 'r'

RETURN (
WITH atts AS (
SELECT coalesce(jsonb_agg(
jsonb_build_object(
'id', a.id, 'file_name', a.file_name, 'storage_path', a.storage_path,
'mime_type', a.mime_type, 'file_size', a.file_size, 'created_at', a.created_at
) ORDER BY a.created_at ASC
), '[]'::jsonb) AS arr
FROM public.order_items_attachments a
WHERE a.item_id = p_item_id
)
SELECT jsonb_build_object(
'ok', true,
'item', jsonb_build_object(
'id', r.id, 
'item_number', r.item_number, 
'item_status', r.item_status,
'item_name', r.item_name, 
'item_url', r.item_url, 
'item_note', r.item_note,
'item_quantity', r.item_quantity, 
'item_value', r.item_value, 
'item_weight', r.item_weight,
'item_width', r.item_width, 
'item_height', r.item_height, 
'item_length', r.item_length,
'created_at', r.created_at, 
'attachments', atts.arr
)
)
FROM atts
);
END;$$;


ALTER FUNCTION public.user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb) OWNER TO postgres;

--
-- Name: user_order_update_address(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_update_address(p_lookup text, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
v_uid uuid := auth.uid();
v_order_id uuid;
BEGIN
if v_uid is null then
raise exception 'UNAUTHORIZED' using errcode = 'P0001';
end if;

if p_lookup is null or length(trim(p_lookup)) = 0 then
raise exception 'BAD_LOOKUP' using errcode = 'P0001';
end if;
if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
raise exception 'BAD_PATCH' using errcode = 'P0001';
end if;

select id
into v_order_id
from public.orders
where (id::text = trim(p_lookup) or order_number = trim(p_lookup))
and user_id = v_uid
and coalesce(order_status, 'created') = 'created'
for update;

if not found then
raise exception 'ORDER_NOT_EDITABLE' using errcode = 'P0001';
end if;

update public.orders
set
order_fullname = case when p_patch ? 'order_fullname' then nullif(p_patch->>'order_fullname','') else order_fullname end,
order_email = case when p_patch ? 'order_email' then nullif(trim(p_patch->>'order_email'),'') else order_email end,
order_phone = case when p_patch ? 'order_phone' then nullif(p_patch->>'order_phone','') else order_phone end,
order_country = case when p_patch ? 'order_country' then nullif(p_patch->>'order_country','') else order_country end,
order_city = case when p_patch ? 'order_city' then nullif(p_patch->>'order_city','') else order_city end,
order_postal_code = case when p_patch ? 'order_postal_code' then nullif(p_patch->>'order_postal_code','') else order_postal_code end,
order_street = case when p_patch ? 'order_street' then nullif(p_patch->>'order_street','') else order_street end,
order_house_number = case when p_patch ? 'order_house_number' then nullif(p_patch->>'order_house_number','') else order_house_number end,
order_delivery_notes = case when p_patch ? 'order_delivery_notes' then nullif(p_patch->>'order_delivery_notes','') else order_delivery_notes end
where id = v_order_id;

return jsonb_build_object('ok', true, 'updated', true, 'order_id', v_order_id);
END;$$;


ALTER FUNCTION public.user_order_update_address(p_lookup text, p_patch jsonb) OWNER TO postgres;

--
-- Name: user_order_update_checkout(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_update_checkout(p_lookup text, p_patch jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$DECLARE
v_uid uuid;
v_order_id uuid;
v_quote_raw text;
v_quote_id uuid;
v_method_input text;
v_method_code text;
v_currency text;
BEGIN
v_uid := auth.uid(); 

IF v_uid IS NULL THEN
RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='P0001';
END IF;

IF p_lookup IS NULL OR btrim(p_lookup) = '' THEN
RAISE EXCEPTION 'ORDER_LOOKUP_EMPTY' USING ERRCODE='P0001';
END IF;

BEGIN
v_order_id := uuid(btrim(p_lookup));
EXCEPTION WHEN OTHERS THEN
v_order_id := NULL;
END;

IF v_order_id IS NULL THEN
SELECT id INTO v_order_id
FROM public.orders
WHERE order_number = btrim(p_lookup)
AND user_id = v_uid
LIMIT 1;
ELSE 
SELECT id INTO v_order_id
FROM public.orders
WHERE id = v_order_id
AND user_id = v_uid
LIMIT 1;
END IF;

IF v_order_id IS NULL THEN
RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE='P0001';
END IF;

/* ===== QUOTE ===== */
IF p_patch ? 'selected_quote_id' THEN
v_quote_raw := nullif(p_patch->>'selected_quote_id','');

IF v_quote_raw IS NOT NULL THEN
BEGIN v_quote_id := uuid(v_quote_raw);
EXCEPTION WHEN OTHERS THEN v_quote_id := NULL; END;

IF v_quote_id IS NULL THEN
SELECT q.id INTO v_quote_id
FROM public.order_quotes q
WHERE q.order_id = v_order_id
AND q.id::text = v_quote_raw
LIMIT 1;
END IF;

IF v_quote_id IS NULL THEN
RAISE EXCEPTION 'QUOTE_NOT_FOUND' USING ERRCODE='P0001';
END IF;

UPDATE public.order_quotes
SET quote_status = 'accepted'
WHERE id = v_quote_id
AND order_id = v_order_id;

UPDATE public.order_quotes
SET quote_status = 'active'
WHERE order_id = v_order_id
AND id <> v_quote_id
AND lower(coalesce(quote_status,'')) = 'accepted';

UPDATE public.orders
SET selected_quote_id = v_quote_id
WHERE id = v_order_id;
END IF;
END IF;

/* ===== PAYMENT (POPRAWIONA LOGIKA) ===== */
IF (p_patch ? 'payment_currency') OR (p_patch ? 'payment_method_code') THEN
v_currency := nullif(p_patch->>'payment_currency','');

IF p_patch ? 'payment_method_code' THEN
v_method_input := nullif(p_patch->>'payment_method_code','');

IF v_method_input IS NOT NULL THEN
SELECT m.payment_code
INTO v_method_code
FROM public.order_payment_methods m
WHERE upper(m.payment_code) = upper(v_method_input)
AND coalesce(m.payment_is_active, TRUE) = TRUE
LIMIT 1;

IF v_method_code IS NULL THEN
RAISE EXCEPTION 'PAYMENT_METHOD_NOT_FOUND' USING ERRCODE='P0001';
END IF;
END IF;
END IF;

INSERT INTO public.order_payment (order_id, user_id, payment_method_code, payment_currency)
SELECT 
v_order_id, 
v_uid, 
coalesce(v_method_code, 'paypal'), -- Użyj domyślnej 'paypal' jeśli v_method_code jest NULL
coalesce(v_currency, 'PLN') -- Użyj domyślnej 'PLN' jeśli v_currency jest NULL
ON CONFLICT (order_id) DO UPDATE
SET 
payment_method_code = coalesce(v_method_code, public.order_payment.payment_method_code),
payment_currency = coalesce(v_currency, public.order_payment.payment_currency);
END IF;

RETURN jsonb_build_object('ok', TRUE, 'updated', TRUE);
END;$$;


ALTER FUNCTION public.user_order_update_checkout(p_lookup text, p_patch jsonb) OWNER TO postgres;

--
-- Name: user_order_update_note(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.user_order_update_note(p_lookup text, p_note text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_order_id uuid;
begin
  select id into v_order_id
  from orders
  where (id::text = p_lookup or order_number = p_lookup)
    and user_id = auth.uid();

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  update orders
  set order_note = nullif(trim(p_note), '')
  where id = v_order_id;

  return json_build_object('ok', true);
end;
$$;


ALTER FUNCTION public.user_order_update_note(p_lookup text, p_note text) OWNER TO postgres;

--
-- Name: http_request(); Type: FUNCTION; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE FUNCTION supabase_functions.http_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'supabase_functions'
    AS $$
  DECLARE
    request_id bigint;
    payload jsonb;
    url text := TG_ARGV[0]::text;
    method text := TG_ARGV[1]::text;
    headers jsonb DEFAULT '{}'::jsonb;
    params jsonb DEFAULT '{}'::jsonb;
    timeout_ms integer DEFAULT 1000;
  BEGIN
    IF url IS NULL OR url = 'null' THEN
      RAISE EXCEPTION 'url argument is missing';
    END IF;

    IF method IS NULL OR method = 'null' THEN
      RAISE EXCEPTION 'method argument is missing';
    END IF;

    IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
      headers = '{"Content-Type": "application/json"}'::jsonb;
    ELSE
      headers = TG_ARGV[2]::jsonb;
    END IF;

    IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
      params = '{}'::jsonb;
    ELSE
      params = TG_ARGV[3]::jsonb;
    END IF;

    IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
      timeout_ms = 1000;
    ELSE
      timeout_ms = TG_ARGV[4]::integer;
    END IF;

    CASE
      WHEN method = 'GET' THEN
        SELECT http_get INTO request_id FROM net.http_get(
          url,
          params,
          headers,
          timeout_ms
        );
      WHEN method = 'POST' THEN
        payload = jsonb_build_object(
          'old_record', OLD,
          'record', NEW,
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA
        );

        SELECT http_post INTO request_id FROM net.http_post(
          url,
          payload,
          params,
          headers,
          timeout_ms
        );
      ELSE
        RAISE EXCEPTION 'method argument % is invalid', method;
    END CASE;

    INSERT INTO supabase_functions.hooks
      (hook_table_id, hook_name, request_id)
    VALUES
      (TG_RELID, TG_NAME, request_id);

    RETURN NEW;
  END
$$;


ALTER FUNCTION supabase_functions.http_request() OWNER TO supabase_functions_admin;

--
-- Name: extensions; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL
);


ALTER TABLE _realtime.extensions OWNER TO supabase_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE _realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: tenants; Type: TABLE; Schema: _realtime; Owner: supabase_admin
--

CREATE TABLE _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer DEFAULT 200 NOT NULL,
    inserted_at timestamp(0) without time zone NOT NULL,
    updated_at timestamp(0) without time zone NOT NULL,
    max_events_per_second integer DEFAULT 100 NOT NULL,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer DEFAULT 100000 NOT NULL,
    max_channels_per_client integer DEFAULT 100 NOT NULL,
    max_joins_per_second integer DEFAULT 500 NOT NULL,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean DEFAULT false NOT NULL,
    migrations_ran integer DEFAULT 0,
    broadcast_adapter character varying(255) DEFAULT 'gen_rpc'::character varying,
    max_presence_events_per_second integer DEFAULT 1000,
    max_payload_size_in_kb integer DEFAULT 3000
);


ALTER TABLE _realtime.tenants OWNER TO supabase_admin;

--
-- Name: admin_currency_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_currency_rates (
    currency_code text NOT NULL,
    currency_rate_in_pln numeric(12,2) NOT NULL,
    CONSTRAINT admin_currency_rates_code_check CHECK ((currency_code = ANY (ARRAY['USD'::text, 'EUR'::text, 'GBP'::text]))),
    CONSTRAINT admin_currency_rates_currency_code_check CHECK ((char_length(currency_code) = 3)),
    CONSTRAINT admin_currency_rates_rate_pln_per_unit_check CHECK ((currency_rate_in_pln > (0)::numeric))
);


ALTER TABLE public.admin_currency_rates OWNER TO postgres;

--
-- Name: admin_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    note_category text NOT NULL,
    note_content text NOT NULL,
    note_is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_notes_category_check CHECK ((note_category = ANY (ARRAY['note'::text, 'todo'::text, 'idea'::text])))
);


ALTER TABLE public.admin_notes OWNER TO postgres;

--
-- Name: admin_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_name text NOT NULL,
    task_description text,
    task_type text NOT NULL,
    task_status text DEFAULT 'todo'::text NOT NULL,
    related_order_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT admin_tasks_task_status_check CHECK ((task_status = ANY (ARRAY['todo'::text, 'completed'::text]))),
    CONSTRAINT admin_tasks_type_check CHECK ((task_type = ANY (ARRAY['paczki'::text, 'finanse'::text, 'klienci'::text])))
);


ALTER TABLE public.admin_tasks OWNER TO postgres;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    user_id uuid NOT NULL,
    assigned_sections text[]
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: order_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    file_size bigint,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'uploading'::text NOT NULL
);


ALTER TABLE public.order_files OWNER TO postgres;

--
-- Name: order_items_search; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items_search (
    order_id uuid NOT NULL,
    items_text text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.order_items_search OWNER TO postgres;

--
-- Name: order_payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_payment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid,
    payment_status text DEFAULT 'none'::text NOT NULL,
    payment_method_code text,
    payment_currency text DEFAULT 'PLN'::text NOT NULL,
    payment_note text,
    split_due numeric DEFAULT 0.00,
    split_received numeric DEFAULT 0.00,
    total_items_value numeric DEFAULT 0.00,
    total_service_fee numeric DEFAULT 0.00,
    total_subtotal numeric DEFAULT 0.00,
    total_expected_amount numeric DEFAULT 0.00,
    admin_amount_received numeric DEFAULT 0.00,
    admin_amount_costs numeric DEFAULT 0.00,
    admin_amount_profit numeric DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_service_fee numeric DEFAULT 9 NOT NULL
);


ALTER TABLE public.order_payment OWNER TO postgres;

--
-- Name: order_payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_payment_methods (
    payment_code text NOT NULL,
    payment_method_name text NOT NULL,
    payment_fee numeric,
    payment_api text,
    payment_is_active boolean,
    payment_is_default boolean
);


ALTER TABLE public.order_payment_methods OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text NOT NULL,
    order_status text DEFAULT 'none'::text NOT NULL,
    user_id uuid NOT NULL,
    admin_note text,
    selected_quote_id uuid,
    selected_carrier text,
    order_fullname text NOT NULL,
    order_phone text,
    order_note text,
    order_country text,
    order_city text,
    order_postal_code text,
    order_street text,
    order_house_number text,
    order_delivery_notes text,
    created_at timestamp with time zone DEFAULT now(),
    selected_tracking_link text,
    order_type text NOT NULL,
    selected_shipping_price numeric(12,2),
    order_email text,
    CONSTRAINT orders_order_type_check CHECK ((order_type = ANY (ARRAY['Assisted Purchase'::text, 'Parcel Forwarding'::text]))),
    CONSTRAINT orders_selected_shipping_price_check CHECK (((selected_shipping_price IS NULL) OR (selected_shipping_price >= (0)::numeric)))
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    account_type text DEFAULT 'b2c'::text,
    default_country text,
    default_city text,
    default_postal text,
    default_street text,
    default_apartment text,
    created_at timestamp with time zone DEFAULT now(),
    admin_note text,
    is_verified boolean DEFAULT false,
    user_code text,
    default_full_name text,
    default_phone text,
    default_email text,
    CONSTRAINT users_account_type_check CHECK ((account_type = ANY (ARRAY['b2c'::text, 'b2b'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: v_admin_b2c_order_list; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_admin_b2c_order_list AS
 SELECT o.id AS order_id,
    o.order_number,
    o.order_status,
    o.created_at,
    o.order_country,
    o.user_id,
    o.selected_carrier,
    o.selected_tracking_link AS tracking_link,
    u.full_name AS user_full_name,
    u.email AS user_email,
    p.admin_amount_costs,
    p.admin_amount_received,
    ( SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', oi.item_name, 'item_quantity', oi.item_quantity) ORDER BY oi.item_number), '[]'::jsonb) AS items_json
           FROM public.order_items oi
          WHERE (oi.order_id = o.id)) AS items_json
   FROM ((public.orders o
     LEFT JOIN public.users u ON ((u.id = o.user_id)))
     LEFT JOIN public.order_payment p ON ((p.order_id = o.id)))
  ORDER BY o.created_at DESC;


ALTER VIEW public.v_admin_b2c_order_list OWNER TO postgres;

--
-- Name: v_admin_clients_list; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_admin_clients_list AS
 SELECT u.id,
    u.full_name AS name,
    u.email,
    u.phone,
    u.default_country AS country,
    u.account_type AS type,
    u.created_at,
    COALESCE(count(DISTINCT o.id), (0)::bigint) AS orders_count,
    COALESCE(sum(p.admin_amount_received), (0)::numeric) AS total_spent_pln,
    max(o.created_at) AS last_order_at,
    concat_ws(' '::text, u.full_name, u.email, u.phone, u.user_code, u.default_country, u.default_city) AS search
   FROM ((public.users u
     LEFT JOIN public.orders o ON ((u.id = o.user_id)))
     LEFT JOIN public.order_payment p ON ((o.id = p.order_id)))
  GROUP BY u.id, u.full_name, u.email, u.phone, u.default_country, u.account_type, u.created_at, u.user_code, u.default_city;


ALTER VIEW public.v_admin_clients_list OWNER TO postgres;

--
-- Name: v_admin_stats_b2c_orders; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_admin_stats_b2c_orders AS
 SELECT count(*) AS total,
    count(*) FILTER (WHERE (order_status = ANY (ARRAY['created'::text, 'submitted'::text]))) AS pending_quotes,
    count(*) FILTER (WHERE (order_status = ANY (ARRAY['quote_ready'::text, 'preparing_order'::text]))) AS in_progress,
    count(*) FILTER (WHERE (order_status = 'shipped'::text)) AS shipped,
    count(*) FILTER (WHERE (order_status = 'delivered'::text)) AS delivered
   FROM public.orders
  WHERE (COALESCE(order_status, ''::text) <> 'cancelled'::text);


ALTER VIEW public.v_admin_stats_b2c_orders OWNER TO postgres;

--
-- Name: v_users_orders_list; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_users_orders_list AS
 SELECT o.id,
    o.order_number,
    o.created_at,
    o.order_status,
    o.user_id,
    COALESCE(o.order_country, 'Nieznany'::text) AS order_country,
    COALESCE(jsonb_agg(jsonb_build_object('name', oi.item_name, 'qty', COALESCE(oi.item_quantity, 1)) ORDER BY oi.created_at) FILTER (WHERE (oi.id IS NOT NULL)), '[]'::jsonb) AS items_json,
    COALESCE(string_agg(oi.item_name, ' '::text ORDER BY oi.item_name) FILTER (WHERE (oi.id IS NOT NULL)), ''::text) AS items_text
   FROM (public.orders o
     LEFT JOIN public.order_items oi ON ((oi.order_id = o.id)))
  GROUP BY o.id, o.order_number, o.created_at, o.order_status, o.user_id, o.order_country;


ALTER VIEW public.v_users_orders_list OWNER TO postgres;

--
-- Name: hooks; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.hooks (
    id bigint NOT NULL,
    hook_table_id integer NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id bigint
);


ALTER TABLE supabase_functions.hooks OWNER TO supabase_functions_admin;

--
-- Name: TABLE hooks; Type: COMMENT; Schema: supabase_functions; Owner: supabase_functions_admin
--

COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';


--
-- Name: hooks_id_seq; Type: SEQUENCE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE SEQUENCE supabase_functions.hooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE supabase_functions.hooks_id_seq OWNER TO supabase_functions_admin;

--
-- Name: hooks_id_seq; Type: SEQUENCE OWNED BY; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER SEQUENCE supabase_functions.hooks_id_seq OWNED BY supabase_functions.hooks.id;


--
-- Name: migrations; Type: TABLE; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE TABLE supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE supabase_functions.migrations OWNER TO supabase_functions_admin;

--
-- Name: hooks id; Type: DEFAULT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks ALTER COLUMN id SET DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass);


--
-- Data for Name: extensions; Type: TABLE DATA; Schema: _realtime; Owner: supabase_admin
--

COPY _realtime.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at) FROM stdin;
6946541b-3d26-450a-ac58-4ca62cae8124	postgres_cdc_rls	{"region": "us-east-1", "db_host": "TWapGYlTYBLhgztnqpoeh+I9O0wELV3ZrQJc6VghB+U=", "db_name": "sWBpZNdjggEPTQVlI52Zfw==", "db_port": "+enMDFi1J/3IrrquHHwUmA==", "db_user": "uxbEq/zz8DXVD53TOI1zmw==", "slot_name": "supabase_realtime_replication_slot", "db_password": "sWBpZNdjggEPTQVlI52Zfw==", "publication": "supabase_realtime", "ssl_enforced": false, "poll_interval_ms": 100, "poll_max_changes": 100, "poll_max_record_bytes": 1048576}	realtime-dev	2025-11-22 21:18:04	2025-11-22 21:18:04
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: _realtime; Owner: supabase_admin
--

COPY _realtime.schema_migrations (version, inserted_at) FROM stdin;
20210706140551	2025-11-22 21:17:50
20220329161857	2025-11-22 21:17:50
20220410212326	2025-11-22 21:17:50
20220506102948	2025-11-22 21:17:50
20220527210857	2025-11-22 21:17:50
20220815211129	2025-11-22 21:17:50
20220815215024	2025-11-22 21:17:50
20220818141501	2025-11-22 21:17:50
20221018173709	2025-11-22 21:17:50
20221102172703	2025-11-22 21:17:50
20221223010058	2025-11-22 21:17:50
20230110180046	2025-11-22 21:17:50
20230810220907	2025-11-22 21:17:50
20230810220924	2025-11-22 21:17:50
20231024094642	2025-11-22 21:17:50
20240306114423	2025-11-22 21:17:50
20240418082835	2025-11-22 21:17:50
20240625211759	2025-11-22 21:17:50
20240704172020	2025-11-22 21:17:50
20240902173232	2025-11-22 21:17:50
20241106103258	2025-11-22 21:17:50
20250424203323	2025-11-22 21:17:50
20250613072131	2025-11-22 21:17:50
20250711044927	2025-11-22 21:17:50
20250811121559	2025-11-22 21:17:50
20250926223044	2025-11-22 21:17:50
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: _realtime; Owner: supabase_admin
--

COPY _realtime.tenants (id, name, external_id, jwt_secret, max_concurrent_users, inserted_at, updated_at, max_events_per_second, postgres_cdc_default, max_bytes_per_second, max_channels_per_client, max_joins_per_second, suspend, jwt_jwks, notify_private_alpha, private_only, migrations_ran, broadcast_adapter, max_presence_events_per_second, max_payload_size_in_kb) FROM stdin;
8a9e2ffa-0cca-4d21-b00f-5ad4df9b03f8	realtime-dev	realtime-dev	iNjicxc4+llvc9wovDvqymwfnj9teWMlyOIbJ8Fh6j2WNU8CIJ2ZgjR6MUIKqSmeDmvpsKLsZ9jgXJmQPpwL8w==	200	2025-11-22 21:18:04	2025-11-22 21:18:04	100	postgres_cdc_rls	100000	100	100	f	{"keys": [{"k": "c3VwZXItc2VjcmV0LWp3dC10b2tlbi13aXRoLWF0LWxlYXN0LTMyLWNoYXJhY3RlcnMtbG9uZw", "kty": "oct"}]}	f	f	65	gen_rpc	1000	3000
\.


--
-- Data for Name: admin_currency_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_currency_rates (currency_code, currency_rate_in_pln) FROM stdin;
\.


--
-- Data for Name: admin_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_notes (id, note_category, note_content, note_is_pinned, created_at) FROM stdin;
\.


--
-- Data for Name: admin_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_tasks (id, task_name, task_description, task_type, task_status, related_order_id, created_at, completed_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (user_id, assigned_sections) FROM stdin;
\.


--
-- Data for Name: order_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_files (id, order_id, user_id, file_name, mime_type, file_size, storage_path, created_at, status) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, item_status, item_name, item_url, item_note, item_value, item_quantity, item_weight, item_length, item_width, item_height, created_at, item_number) FROM stdin;
36e2a246-c5b6-43eb-b4d6-b8a20122ca1b	01f8536f-0828-4312-a7e2-54410d9a71e4	created	das	dsa		323.00	1	\N	\N	\N	\N	2025-11-22 21:45:13.8751+00	PEF-534242-008
\.


--
-- Data for Name: order_items_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items_files (id, item_id, user_id, file_name, mime_type, file_size, storage_path, created_at, status) FROM stdin;
\.


--
-- Data for Name: order_items_search; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items_search (order_id, items_text) FROM stdin;
01f8536f-0828-4312-a7e2-54410d9a71e4	das ×1
\.


--
-- Data for Name: order_payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_payment (id, order_id, user_id, payment_status, payment_method_code, payment_currency, payment_note, split_due, split_received, total_items_value, total_service_fee, total_subtotal, total_expected_amount, admin_amount_received, admin_amount_costs, admin_amount_profit, created_at, payment_service_fee) FROM stdin;
090b23c6-7ec5-4566-8503-add85529b53e	01f8536f-0828-4312-a7e2-54410d9a71e4	14bf356d-0d12-417a-89ec-730adcde2627	pending	\N	PLN	\N	0	0	323	0	0	0	0	0	0.00	2025-11-22 21:45:13.8751+00	9
\.


--
-- Data for Name: order_payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_payment_methods (payment_code, payment_method_name, payment_fee, payment_api, payment_is_active, payment_is_default) FROM stdin;
\.


--
-- Data for Name: order_payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_payment_transactions (id, order_id, payment_id, transaction_amount, transaction_note, created_at) FROM stdin;
\.


--
-- Data for Name: order_quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_quotes (id, order_id, quote_number, quote_carrier, quote_carrier_fee, quote_status, quote_created_at, quote_expires_at, quote_note, quote_delivery_days) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, order_status, user_id, admin_note, selected_quote_id, selected_carrier, order_fullname, order_phone, order_note, order_country, order_city, order_postal_code, order_street, order_house_number, order_delivery_notes, created_at, selected_tracking_link, order_type, selected_shipping_price, order_email) FROM stdin;
01f8536f-0828-4312-a7e2-54410d9a71e4	PEF-534242	created	14bf356d-0d12-417a-89ec-730adcde2627	\N	\N	\N	dsa	dsa	\N	Canada				\N		2025-11-22 21:45:13.8751+00	\N	Parcel Forwarding	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, full_name, phone, account_type, default_country, default_city, default_postal, default_street, default_apartment, created_at, admin_note, is_verified, user_code, default_full_name, default_phone, default_email) FROM stdin;
14bf356d-0d12-417a-89ec-730adcde2627	jakubmalota33@gmail.com	jakubmalota33@gmail.com	\N	b2c	\N	\N	\N	\N	\N	2025-11-22 21:44:57.817097+00	\N	f	PEF-U6166847	\N	\N	\N
\.


--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY supabase_functions.hooks (id, hook_table_id, hook_name, created_at, request_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--

COPY supabase_functions.migrations (version, inserted_at) FROM stdin;
initial	2025-11-22 21:17:47.313451+00
20210809183423_update_grants	2025-11-22 21:17:47.313451+00
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('supabase_functions.hooks_id_seq', 1, false);


--
-- Name: extensions extensions_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: admin_currency_rates admin_currency_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_currency_rates
    ADD CONSTRAINT admin_currency_rates_pkey PRIMARY KEY (currency_code);


--
-- Name: admin_notes admin_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_notes
    ADD CONSTRAINT admin_notes_pkey PRIMARY KEY (id);


--
-- Name: admin_tasks admin_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_tasks
    ADD CONSTRAINT admin_tasks_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (user_id);


--
-- Name: order_files order_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_files
    ADD CONSTRAINT order_attachments_pkey PRIMARY KEY (id);


--
-- Name: order_items_files order_items_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items_files
    ADD CONSTRAINT order_items_attachments_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_items_search order_items_search_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items_search
    ADD CONSTRAINT order_items_search_pkey PRIMARY KEY (order_id);


--
-- Name: order_payment_methods order_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment_methods
    ADD CONSTRAINT order_payment_methods_pkey PRIMARY KEY (payment_code);


--
-- Name: order_payment order_payment_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment
    ADD CONSTRAINT order_payment_order_id_key UNIQUE (order_id);


--
-- Name: order_payment order_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment
    ADD CONSTRAINT order_payment_pkey PRIMARY KEY (id);


--
-- Name: order_payment_transactions order_payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment_transactions
    ADD CONSTRAINT order_payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: order_quotes order_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_quotes
    ADD CONSTRAINT order_quotes_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_user_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_code_key UNIQUE (user_code);


--
-- Name: hooks hooks_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.hooks
    ADD CONSTRAINT hooks_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: supabase_functions; Owner: supabase_functions_admin
--

ALTER TABLE ONLY supabase_functions.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: extensions_tenant_external_id_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id);


--
-- Name: extensions_tenant_external_id_type_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type);


--
-- Name: tenants_external_id_index; Type: INDEX; Schema: _realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id);


--
-- Name: admin_users_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX admin_users_user_id_idx ON public.admin_users USING btree (user_id);


--
-- Name: idx_order_quotes_active_exp_on; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_quotes_active_exp_on ON public.order_quotes USING btree (quote_expires_at) WHERE ((quote_status = 'active'::text) AND (quote_expires_at IS NOT NULL));


--
-- Name: idx_order_quotes_inactive_exp_on; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_quotes_inactive_exp_on ON public.order_quotes USING btree (quote_expires_at) WHERE ((quote_status = 'inactive'::text) AND (quote_expires_at IS NOT NULL));


--
-- Name: idx_order_quotes_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_quotes_order_id ON public.order_quotes USING btree (order_id);


--
-- Name: idx_orders_order_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_order_number ON public.orders USING btree (order_number);


--
-- Name: idx_orders_order_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_order_type ON public.orders USING btree (order_type);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_orders_user_id_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_user_id_created_at ON public.orders USING btree (user_id, created_at DESC);


--
-- Name: order_items_item_number_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX order_items_item_number_uidx ON public.order_items USING btree (item_number);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_search_order_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX order_items_search_order_id_key ON public.order_items_search USING btree (order_id);


--
-- Name: order_payment_transactions_order_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX order_payment_transactions_order_id_idx ON public.order_payment_transactions USING btree (order_id);


--
-- Name: order_quotes_order_id_quote_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX order_quotes_order_id_quote_number_key ON public.order_quotes USING btree (order_id, quote_number);


--
-- Name: orders_order_number_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX orders_order_number_uq ON public.orders USING btree (order_number);


--
-- Name: uq_order_items_search_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_order_items_search_order_id ON public.order_items_search USING btree (order_id);


--
-- Name: users_email_lower_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_lower_uidx ON public.users USING btree (lower(email));


--
-- Name: supabase_functions_hooks_h_table_id_h_name_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);


--
-- Name: supabase_functions_hooks_request_id_idx; Type: INDEX; Schema: supabase_functions; Owner: supabase_functions_admin
--

CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);


--
-- Name: order_items trg_admin_order_items_search; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_admin_order_items_search AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.admin_rebuild_items_search();


--
-- Name: order_quotes trg_admin_quotes_apply_accepted; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_admin_quotes_apply_accepted BEFORE INSERT OR UPDATE ON public.order_quotes FOR EACH ROW EXECUTE FUNCTION public.trg_admin_quotes_apply_accepted();


--
-- Name: order_items trg_sys_order_items_set_item_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sys_order_items_set_item_number BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.trg_sys_order_items_set_item_number();


--
-- Name: orders trg_sys_orders_set_order_number; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sys_orders_set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_sys_orders_set_order_number();


--
-- Name: users trg_sys_user_set_user_code; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sys_user_set_user_code BEFORE INSERT ON public.users FOR EACH ROW WHEN ((new.user_code IS NULL)) EXECUTE FUNCTION public.trg_sys_user_set_user_code();


--
-- Name: extensions extensions_tenant_external_id_fkey; Type: FK CONSTRAINT; Schema: _realtime; Owner: supabase_admin
--

ALTER TABLE ONLY _realtime.extensions
    ADD CONSTRAINT extensions_tenant_external_id_fkey FOREIGN KEY (tenant_external_id) REFERENCES _realtime.tenants(external_id) ON DELETE CASCADE;


--
-- Name: admin_users admin_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_files order_attachments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_files
    ADD CONSTRAINT order_attachments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_files order_attachments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_files
    ADD CONSTRAINT order_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items_files order_items_attachments_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items_files
    ADD CONSTRAINT order_items_attachments_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_items_files order_items_attachments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items_files
    ADD CONSTRAINT order_items_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: order_items_search order_items_search_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items_search
    ADD CONSTRAINT order_items_search_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_payment order_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment
    ADD CONSTRAINT order_payment_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_payment_transactions order_payment_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment_transactions
    ADD CONSTRAINT order_payment_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_payment_transactions order_payment_transactions_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment_transactions
    ADD CONSTRAINT order_payment_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.order_payment(id);


--
-- Name: order_payment order_payment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_payment
    ADD CONSTRAINT order_payment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: order_quotes order_quotes_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_quotes
    ADD CONSTRAINT order_quotes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: admin_tasks Admins can delete tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete tasks" ON public.admin_tasks FOR DELETE TO authenticated USING (true);


--
-- Name: admin_tasks Admins can insert tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert tasks" ON public.admin_tasks FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: admin_tasks Admins can read all tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can read all tasks" ON public.admin_tasks FOR SELECT TO authenticated USING (true);


--
-- Name: admin_tasks Admins can update tasks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update tasks" ON public.admin_tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: order_files Allow authenticated to insert attachments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated to insert attachments" ON public.order_files FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: users Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: admin_currency_rates acr_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY acr_admin_write ON public.admin_currency_rates TO authenticated USING (((auth.jwt() ->> 'email'::text) = 'twojmail@domena.com'::text)) WITH CHECK (((auth.jwt() ->> 'email'::text) = 'twojmail@domena.com'::text));


--
-- Name: admin_currency_rates acr_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY acr_select ON public.admin_currency_rates FOR SELECT TO authenticated USING (true);


--
-- Name: admin_currency_rates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_currency_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_notes admin_notes_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_notes_admin_all ON public.admin_notes TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: admin_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_tasks admin_tasks_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_tasks_admin_all ON public.admin_tasks TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_users admin_users_select_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_users_select_self ON public.admin_users FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: admin_users admin_users_self_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_users_self_insert ON public.admin_users FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: admin_users admin_users_self_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_users_self_select ON public.admin_users FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: admin_users admin_users_self_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_users_self_update ON public.admin_users FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: admin_currency_rates currency_rates_admin_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY currency_rates_admin_delete ON public.admin_currency_rates FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: admin_currency_rates currency_rates_admin_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY currency_rates_admin_update ON public.admin_currency_rates FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid())))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: admin_currency_rates currency_rates_admin_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY currency_rates_admin_write ON public.admin_currency_rates FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE (au.user_id = auth.uid()))));


--
-- Name: admin_currency_rates currency_rates_select_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY currency_rates_select_auth ON public.admin_currency_rates FOR SELECT TO authenticated USING (true);


--
-- Name: order_payment_methods opm_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY opm_delete_admin ON public.order_payment_methods FOR DELETE TO authenticated USING ((public.admin_is_admin() OR public.admin_has_access('payments'::text)));


--
-- Name: order_payment_methods opm_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY opm_insert_admin ON public.order_payment_methods FOR INSERT TO authenticated WITH CHECK ((public.admin_is_admin() OR public.admin_has_access('payments'::text)));


--
-- Name: order_payment_methods opm_select_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY opm_select_all ON public.order_payment_methods FOR SELECT TO authenticated USING (true);


--
-- Name: order_payment_methods opm_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY opm_update_admin ON public.order_payment_methods FOR UPDATE TO authenticated USING ((public.admin_is_admin() OR public.admin_has_access('payments'::text))) WITH CHECK ((public.admin_is_admin() OR public.admin_has_access('payments'::text)));


--
-- Name: order_quotes oq_delete_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY oq_delete_admin ON public.order_quotes FOR DELETE TO authenticated USING ((public.admin_is_admin() OR public.admin_has_access('quotes'::text)));


--
-- Name: order_quotes oq_insert_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY oq_insert_admin ON public.order_quotes FOR INSERT TO authenticated WITH CHECK ((public.admin_is_admin() OR public.admin_has_access('quotes'::text)));


--
-- Name: order_quotes oq_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY oq_select_admin ON public.order_quotes FOR SELECT TO authenticated USING ((public.admin_is_admin() OR public.admin_has_access('quotes'::text)));


--
-- Name: order_quotes oq_update_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY oq_update_admin ON public.order_quotes FOR UPDATE TO authenticated USING ((public.admin_is_admin() OR public.admin_has_access('quotes'::text))) WITH CHECK ((public.admin_is_admin() OR public.admin_has_access('quotes'::text)));


--
-- Name: order_payment_methods; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: order_quotes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.order_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: order_quotes order_quotes_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY order_quotes_update_own ON public.order_quotes FOR UPDATE TO authenticated USING ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid())))) WITH CHECK ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));


--
-- Name: orders orders_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_update_own ON public.orders FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: orders orders_update_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY orders_update_owner ON public.orders FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users: read self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "users: read self" ON public.users FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: users users_select_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_select_self ON public.users FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: users users_self_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_self_select ON public.users FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: users users_self_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_self_update ON public.users FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: supabase_admin
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime_messages_publication OWNER TO supabase_admin;

--
-- Name: SCHEMA net; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA net TO supabase_functions_admin;
GRANT USAGE ON SCHEMA net TO postgres;
GRANT USAGE ON SCHEMA net TO anon;
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT USAGE ON SCHEMA net TO service_role;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA supabase_functions; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA supabase_functions TO postgres;
GRANT USAGE ON SCHEMA supabase_functions TO anon;
GRANT USAGE ON SCHEMA supabase_functions TO authenticated;
GRANT USAGE ON SCHEMA supabase_functions TO service_role;
GRANT ALL ON SCHEMA supabase_functions TO supabase_functions_admin;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer); Type: ACL; Schema: net; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO postgres;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO anon;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO authenticated;
GRANT ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO service_role;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO postgres;


--
-- Name: FUNCTION admin_get_modal_order(p_lookup text, p_limit_attachments integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_get_modal_order(p_lookup text, p_limit_attachments integer) TO anon;
GRANT ALL ON FUNCTION public.admin_get_modal_order(p_lookup text, p_limit_attachments integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_get_modal_order(p_lookup text, p_limit_attachments integer) TO service_role;


--
-- Name: FUNCTION admin_get_modal_profile(p_user_id uuid, p_limit_orders integer, p_limit_files integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_get_modal_profile(p_user_id uuid, p_limit_orders integer, p_limit_files integer) TO anon;
GRANT ALL ON FUNCTION public.admin_get_modal_profile(p_user_id uuid, p_limit_orders integer, p_limit_files integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_get_modal_profile(p_user_id uuid, p_limit_orders integer, p_limit_files integer) TO service_role;


--
-- Name: FUNCTION admin_has_access(p_section text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_has_access(p_section text) TO anon;
GRANT ALL ON FUNCTION public.admin_has_access(p_section text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_has_access(p_section text) TO service_role;


--
-- Name: FUNCTION admin_is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_is_admin() TO anon;
GRANT ALL ON FUNCTION public.admin_is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.admin_is_admin() TO service_role;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items TO anon;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.order_items TO service_role;


--
-- Name: FUNCTION admin_order_item_add(p_order_id uuid, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_item_add(p_order_id uuid, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.admin_order_item_add(p_order_id uuid, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_item_add(p_order_id uuid, p_patch jsonb) TO service_role;


--
-- Name: TABLE order_items_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items_files TO anon;
GRANT ALL ON TABLE public.order_items_files TO authenticated;
GRANT ALL ON TABLE public.order_items_files TO service_role;


--
-- Name: FUNCTION admin_order_item_attachments_add(p_item_id uuid, p_attachments jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_item_attachments_add(p_item_id uuid, p_attachments jsonb) TO anon;
GRANT ALL ON FUNCTION public.admin_order_item_attachments_add(p_item_id uuid, p_attachments jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_item_attachments_add(p_item_id uuid, p_attachments jsonb) TO service_role;


--
-- Name: FUNCTION admin_order_item_attachments_delete(p_item_id uuid, p_attachment_ids text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_item_attachments_delete(p_item_id uuid, p_attachment_ids text[]) TO anon;
GRANT ALL ON FUNCTION public.admin_order_item_attachments_delete(p_item_id uuid, p_attachment_ids text[]) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_item_attachments_delete(p_item_id uuid, p_attachment_ids text[]) TO service_role;


--
-- Name: FUNCTION admin_order_item_delete(p_item_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_item_delete(p_item_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_order_item_delete(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_item_delete(p_item_id uuid) TO service_role;


--
-- Name: FUNCTION admin_order_item_update(p_item_id uuid, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_item_update(p_item_id uuid, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.admin_order_item_update(p_item_id uuid, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_item_update(p_item_id uuid, p_patch jsonb) TO service_role;


--
-- Name: TABLE order_payment_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_payment_transactions TO anon;
GRANT ALL ON TABLE public.order_payment_transactions TO authenticated;
GRANT ALL ON TABLE public.order_payment_transactions TO service_role;


--
-- Name: FUNCTION admin_order_payment_transaction_add(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_payment_transaction_add(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_payment_transaction_add(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_payment_transaction_add(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text) TO service_role;


--
-- Name: FUNCTION admin_order_payment_transaction_delete(p_transaction_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_payment_transaction_delete(p_transaction_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_order_payment_transaction_delete(p_transaction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_payment_transaction_delete(p_transaction_id uuid) TO service_role;


--
-- Name: FUNCTION admin_order_resolve_id(p_input text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_resolve_id(p_input text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_resolve_id(p_input text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_resolve_id(p_input text) TO service_role;


--
-- Name: FUNCTION admin_order_update_additional_info(p_lookup text, p_info text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_additional_info(p_lookup text, p_info text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_additional_info(p_lookup text, p_info text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_additional_info(p_lookup text, p_info text) TO service_role;


--
-- Name: FUNCTION admin_order_update_address(p_lookup text, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_address(p_lookup text, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_address(p_lookup text, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_address(p_lookup text, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION admin_order_update_admin_note(p_lookup text, p_info text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_admin_note(p_lookup text, p_info text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_admin_note(p_lookup text, p_info text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_admin_note(p_lookup text, p_info text) TO service_role;


--
-- Name: FUNCTION admin_order_update_attachments_add(p_order_id uuid, p_user_id uuid, p_files jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_attachments_add(p_order_id uuid, p_user_id uuid, p_files jsonb) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_attachments_add(p_order_id uuid, p_user_id uuid, p_files jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_attachments_add(p_order_id uuid, p_user_id uuid, p_files jsonb) TO service_role;


--
-- Name: FUNCTION admin_order_update_attachments_delete(p_file_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_attachments_delete(p_file_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_attachments_delete(p_file_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_attachments_delete(p_file_id uuid) TO service_role;


--
-- Name: FUNCTION admin_order_update_payment_admin_data(p_lookup text, p_costs numeric, p_received numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_payment_admin_data(p_lookup text, p_costs numeric, p_received numeric) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_payment_admin_data(p_lookup text, p_costs numeric, p_received numeric) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_payment_admin_data(p_lookup text, p_costs numeric, p_received numeric) TO service_role;


--
-- Name: FUNCTION admin_order_update_payment_note(p_lookup text, p_note text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_payment_note(p_lookup text, p_note text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_payment_note(p_lookup text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_payment_note(p_lookup text, p_note text) TO service_role;


--
-- Name: FUNCTION admin_order_update_payment_products_split(p_lookup text, p_split_received numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric) TO service_role;


--
-- Name: FUNCTION admin_order_update_payment_products_split(p_lookup text, p_split_received numeric, p_split_due numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric, p_split_due numeric) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric, p_split_due numeric) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_payment_products_split(p_lookup text, p_split_received numeric, p_split_due numeric) TO service_role;


--
-- Name: FUNCTION admin_order_update_payment_service_fee(p_lookup text, p_service_fee numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_payment_service_fee(p_lookup text, p_service_fee numeric) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_payment_service_fee(p_lookup text, p_service_fee numeric) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_payment_service_fee(p_lookup text, p_service_fee numeric) TO service_role;


--
-- Name: FUNCTION admin_order_update_payment_status(p_lookup text, p_status text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_payment_status(p_lookup text, p_status text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_payment_status(p_lookup text, p_status text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_payment_status(p_lookup text, p_status text) TO service_role;


--
-- Name: FUNCTION admin_order_update_status(p_lookup text, p_status text, p_source text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_order_update_status(p_lookup text, p_status text, p_source text) TO anon;
GRANT ALL ON FUNCTION public.admin_order_update_status(p_lookup text, p_status text, p_source text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_order_update_status(p_lookup text, p_status text, p_source text) TO service_role;


--
-- Name: FUNCTION admin_quote_accept_by_id(p_quote_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_quote_accept_by_id(p_quote_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_quote_accept_by_id(p_quote_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_quote_accept_by_id(p_quote_id uuid) TO service_role;


--
-- Name: TABLE order_quotes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_quotes TO anon;
GRANT ALL ON TABLE public.order_quotes TO authenticated;
GRANT ALL ON TABLE public.order_quotes TO service_role;


--
-- Name: FUNCTION admin_quote_create_by_order_id(p_order_id uuid, p_rows jsonb, p_valid_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_quote_create_by_order_id(p_order_id uuid, p_rows jsonb, p_valid_days integer) TO anon;
GRANT ALL ON FUNCTION public.admin_quote_create_by_order_id(p_order_id uuid, p_rows jsonb, p_valid_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_quote_create_by_order_id(p_order_id uuid, p_rows jsonb, p_valid_days integer) TO service_role;


--
-- Name: FUNCTION admin_quote_create_id_by_order_id(p_order_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_quote_create_id_by_order_id(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_quote_create_id_by_order_id(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_quote_create_id_by_order_id(p_order_id uuid) TO service_role;


--
-- Name: FUNCTION admin_quote_delete_by_id(p_quote_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_quote_delete_by_id(p_quote_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_quote_delete_by_id(p_quote_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_quote_delete_by_id(p_quote_id uuid) TO service_role;


--
-- Name: FUNCTION admin_quote_expire_and_purge(p_grace_days integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_quote_expire_and_purge(p_grace_days integer) TO anon;
GRANT ALL ON FUNCTION public.admin_quote_expire_and_purge(p_grace_days integer) TO authenticated;
GRANT ALL ON FUNCTION public.admin_quote_expire_and_purge(p_grace_days integer) TO service_role;


--
-- Name: FUNCTION admin_quote_list_by_order_id(p_order_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_quote_list_by_order_id(p_order_id uuid) TO anon;
GRANT ALL ON FUNCTION public.admin_quote_list_by_order_id(p_order_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_quote_list_by_order_id(p_order_id uuid) TO service_role;


--
-- Name: FUNCTION admin_rebuild_items_search(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_rebuild_items_search() TO anon;
GRANT ALL ON FUNCTION public.admin_rebuild_items_search() TO authenticated;
GRANT ALL ON FUNCTION public.admin_rebuild_items_search() TO service_role;


--
-- Name: FUNCTION admin_tasks_delete_completed(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_tasks_delete_completed() TO anon;
GRANT ALL ON FUNCTION public.admin_tasks_delete_completed() TO authenticated;
GRANT ALL ON FUNCTION public.admin_tasks_delete_completed() TO service_role;


--
-- Name: FUNCTION admin_user_profile_update_admin_note(p_user_id uuid, p_notes text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.admin_user_profile_update_admin_note(p_user_id uuid, p_notes text) TO anon;
GRANT ALL ON FUNCTION public.admin_user_profile_update_admin_note(p_user_id uuid, p_notes text) TO authenticated;
GRANT ALL ON FUNCTION public.admin_user_profile_update_admin_note(p_user_id uuid, p_notes text) TO service_role;


--
-- Name: FUNCTION sys_check_if_user_exists(p_email text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sys_check_if_user_exists(p_email text) TO anon;
GRANT ALL ON FUNCTION public.sys_check_if_user_exists(p_email text) TO authenticated;
GRANT ALL ON FUNCTION public.sys_check_if_user_exists(p_email text) TO service_role;


--
-- Name: FUNCTION sys_create_pef_item_code(p_order_code text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sys_create_pef_item_code(p_order_code text) TO anon;
GRANT ALL ON FUNCTION public.sys_create_pef_item_code(p_order_code text) TO authenticated;
GRANT ALL ON FUNCTION public.sys_create_pef_item_code(p_order_code text) TO service_role;


--
-- Name: FUNCTION sys_create_pef_order_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sys_create_pef_order_code() TO anon;
GRANT ALL ON FUNCTION public.sys_create_pef_order_code() TO authenticated;
GRANT ALL ON FUNCTION public.sys_create_pef_order_code() TO service_role;


--
-- Name: FUNCTION sys_create_pef_user_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sys_create_pef_user_code() TO anon;
GRANT ALL ON FUNCTION public.sys_create_pef_user_code() TO authenticated;
GRANT ALL ON FUNCTION public.sys_create_pef_user_code() TO service_role;


--
-- Name: FUNCTION sys_handle_new_user(); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.sys_handle_new_user() TO postgres;
GRANT ALL ON FUNCTION public.sys_handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.sys_handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.sys_handle_new_user() TO service_role;


--
-- Name: FUNCTION sys_storage_path_belongs_to_user(path text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sys_storage_path_belongs_to_user(path text) TO anon;
GRANT ALL ON FUNCTION public.sys_storage_path_belongs_to_user(path text) TO authenticated;
GRANT ALL ON FUNCTION public.sys_storage_path_belongs_to_user(path text) TO service_role;


--
-- Name: FUNCTION sys_sync_user_profile_after_update(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sys_sync_user_profile_after_update() TO anon;
GRANT ALL ON FUNCTION public.sys_sync_user_profile_after_update() TO authenticated;
GRANT ALL ON FUNCTION public.sys_sync_user_profile_after_update() TO service_role;


--
-- Name: FUNCTION trg_admin_quotes_apply_accepted(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_admin_quotes_apply_accepted() TO anon;
GRANT ALL ON FUNCTION public.trg_admin_quotes_apply_accepted() TO authenticated;
GRANT ALL ON FUNCTION public.trg_admin_quotes_apply_accepted() TO service_role;


--
-- Name: FUNCTION trg_sys_order_items_set_item_number(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_sys_order_items_set_item_number() TO anon;
GRANT ALL ON FUNCTION public.trg_sys_order_items_set_item_number() TO authenticated;
GRANT ALL ON FUNCTION public.trg_sys_order_items_set_item_number() TO service_role;


--
-- Name: FUNCTION trg_sys_orders_set_order_number(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_sys_orders_set_order_number() TO anon;
GRANT ALL ON FUNCTION public.trg_sys_orders_set_order_number() TO authenticated;
GRANT ALL ON FUNCTION public.trg_sys_orders_set_order_number() TO service_role;


--
-- Name: FUNCTION trg_sys_user_set_user_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trg_sys_user_set_user_code() TO anon;
GRANT ALL ON FUNCTION public.trg_sys_user_set_user_code() TO authenticated;
GRANT ALL ON FUNCTION public.trg_sys_user_set_user_code() TO service_role;


--
-- Name: FUNCTION user_get_default_address(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_get_default_address() TO anon;
GRANT ALL ON FUNCTION public.user_get_default_address() TO authenticated;
GRANT ALL ON FUNCTION public.user_get_default_address() TO service_role;


--
-- Name: FUNCTION user_get_modal_order(p_lookup text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_get_modal_order(p_lookup text) TO anon;
GRANT ALL ON FUNCTION public.user_get_modal_order(p_lookup text) TO authenticated;
GRANT ALL ON FUNCTION public.user_get_modal_order(p_lookup text) TO service_role;


--
-- Name: FUNCTION user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text) TO anon;
GRANT ALL ON FUNCTION public.user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_create(p_service text, p_address jsonb, p_items jsonb, p_order_note text) TO service_role;


--
-- Name: FUNCTION user_order_delete(p_lookup text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_delete(p_lookup text) TO anon;
GRANT ALL ON FUNCTION public.user_order_delete(p_lookup text) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_delete(p_lookup text) TO service_role;


--
-- Name: FUNCTION user_order_file_delete(p_file_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_file_delete(p_file_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_order_file_delete(p_file_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_file_delete(p_file_id uuid) TO service_role;


--
-- Name: FUNCTION user_order_item_add(p_lookup text, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_item_add(p_lookup text, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.user_order_item_add(p_lookup text, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_item_add(p_lookup text, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION user_order_item_delete(p_lookup text, p_item_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_item_delete(p_lookup text, p_item_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_order_item_delete(p_lookup text, p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_item_delete(p_lookup text, p_item_id uuid) TO service_role;


--
-- Name: FUNCTION user_order_item_file_delete(p_lookup text, p_item_id uuid, p_file_ids text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_item_file_delete(p_lookup text, p_item_id uuid, p_file_ids text[]) TO anon;
GRANT ALL ON FUNCTION public.user_order_item_file_delete(p_lookup text, p_item_id uuid, p_file_ids text[]) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_item_file_delete(p_lookup text, p_item_id uuid, p_file_ids text[]) TO service_role;


--
-- Name: FUNCTION user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_item_update(p_lookup text, p_item_id uuid, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION user_order_update_address(p_lookup text, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_update_address(p_lookup text, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.user_order_update_address(p_lookup text, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_update_address(p_lookup text, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION user_order_update_checkout(p_lookup text, p_patch jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_update_checkout(p_lookup text, p_patch jsonb) TO anon;
GRANT ALL ON FUNCTION public.user_order_update_checkout(p_lookup text, p_patch jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_update_checkout(p_lookup text, p_patch jsonb) TO service_role;


--
-- Name: FUNCTION user_order_update_note(p_lookup text, p_note text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.user_order_update_note(p_lookup text, p_note text) TO anon;
GRANT ALL ON FUNCTION public.user_order_update_note(p_lookup text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION public.user_order_update_note(p_lookup text, p_note text) TO service_role;


--
-- Name: FUNCTION http_request(); Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

REVOKE ALL ON FUNCTION supabase_functions.http_request() FROM PUBLIC;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO postgres;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO anon;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO authenticated;
GRANT ALL ON FUNCTION supabase_functions.http_request() TO service_role;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;


--
-- Name: TABLE admin_currency_rates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_currency_rates TO anon;
GRANT ALL ON TABLE public.admin_currency_rates TO authenticated;
GRANT ALL ON TABLE public.admin_currency_rates TO service_role;


--
-- Name: TABLE admin_notes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_notes TO anon;
GRANT ALL ON TABLE public.admin_notes TO authenticated;
GRANT ALL ON TABLE public.admin_notes TO service_role;


--
-- Name: TABLE admin_tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_tasks TO anon;
GRANT ALL ON TABLE public.admin_tasks TO authenticated;
GRANT ALL ON TABLE public.admin_tasks TO service_role;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;


--
-- Name: TABLE order_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_files TO anon;
GRANT ALL ON TABLE public.order_files TO authenticated;
GRANT ALL ON TABLE public.order_files TO service_role;


--
-- Name: TABLE order_items_search; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items_search TO anon;
GRANT ALL ON TABLE public.order_items_search TO authenticated;
GRANT ALL ON TABLE public.order_items_search TO service_role;


--
-- Name: TABLE order_payment; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_payment TO anon;
GRANT ALL ON TABLE public.order_payment TO authenticated;
GRANT ALL ON TABLE public.order_payment TO service_role;


--
-- Name: TABLE order_payment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_payment_methods TO anon;
GRANT ALL ON TABLE public.order_payment_methods TO authenticated;
GRANT ALL ON TABLE public.order_payment_methods TO service_role;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO anon;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: TABLE v_admin_b2c_order_list; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_admin_b2c_order_list TO anon;
GRANT ALL ON TABLE public.v_admin_b2c_order_list TO authenticated;
GRANT ALL ON TABLE public.v_admin_b2c_order_list TO service_role;


--
-- Name: TABLE v_admin_clients_list; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_admin_clients_list TO anon;
GRANT ALL ON TABLE public.v_admin_clients_list TO authenticated;
GRANT ALL ON TABLE public.v_admin_clients_list TO service_role;


--
-- Name: TABLE v_admin_stats_b2c_orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_admin_stats_b2c_orders TO anon;
GRANT ALL ON TABLE public.v_admin_stats_b2c_orders TO authenticated;
GRANT ALL ON TABLE public.v_admin_stats_b2c_orders TO service_role;


--
-- Name: TABLE v_users_orders_list; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_users_orders_list TO anon;
GRANT ALL ON TABLE public.v_users_orders_list TO authenticated;
GRANT ALL ON TABLE public.v_users_orders_list TO service_role;


--
-- Name: TABLE hooks; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON TABLE supabase_functions.hooks TO postgres;
GRANT ALL ON TABLE supabase_functions.hooks TO anon;
GRANT ALL ON TABLE supabase_functions.hooks TO authenticated;
GRANT ALL ON TABLE supabase_functions.hooks TO service_role;


--
-- Name: SEQUENCE hooks_id_seq; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO postgres;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO anon;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO authenticated;
GRANT ALL ON SEQUENCE supabase_functions.hooks_id_seq TO service_role;


--
-- Name: TABLE migrations; Type: ACL; Schema: supabase_functions; Owner: supabase_functions_admin
--

GRANT ALL ON TABLE supabase_functions.migrations TO postgres;
GRANT ALL ON TABLE supabase_functions.migrations TO anon;
GRANT ALL ON TABLE supabase_functions.migrations TO authenticated;
GRANT ALL ON TABLE supabase_functions.migrations TO service_role;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: supabase_functions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA supabase_functions GRANT ALL ON TABLES TO service_role;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

