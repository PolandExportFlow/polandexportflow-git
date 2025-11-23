drop policy "acr_admin_write" on "public"."admin_currency_rates";

drop policy "acr_select" on "public"."admin_currency_rates";

drop policy "currency_rates_admin_delete" on "public"."admin_currency_rates";

drop policy "currency_rates_admin_update" on "public"."admin_currency_rates";

drop policy "currency_rates_admin_write" on "public"."admin_currency_rates";

drop policy "currency_rates_select_auth" on "public"."admin_currency_rates";

drop policy "admin_notes_admin_all" on "public"."admin_notes";

drop policy "Admins can delete tasks" on "public"."admin_tasks";

drop policy "Admins can insert tasks" on "public"."admin_tasks";

drop policy "Admins can read all tasks" on "public"."admin_tasks";

drop policy "Admins can update tasks" on "public"."admin_tasks";

drop policy "admin_tasks_admin_all" on "public"."admin_tasks";

drop policy "admin_users_select_self" on "public"."admin_users";

drop policy "admin_users_self_insert" on "public"."admin_users";

drop policy "admin_users_self_select" on "public"."admin_users";

drop policy "admin_users_self_update" on "public"."admin_users";

drop policy "Allow authenticated to insert attachments" on "public"."order_files";

drop policy "user_select_items_if_own_order" on "public"."order_items";

drop policy "opm_delete_admin" on "public"."order_payment_methods";

drop policy "opm_insert_admin" on "public"."order_payment_methods";

drop policy "opm_select_all" on "public"."order_payment_methods";

drop policy "opm_update_admin" on "public"."order_payment_methods";

drop policy "oq_delete_admin" on "public"."order_quotes";

drop policy "oq_insert_admin" on "public"."order_quotes";

drop policy "oq_select_admin" on "public"."order_quotes";

drop policy "oq_update_admin" on "public"."order_quotes";

drop policy "order_quotes_update_own" on "public"."order_quotes";

drop policy "orders_update_own" on "public"."orders";

drop policy "orders_update_owner" on "public"."orders";

drop policy "user_select_own_orders" on "public"."orders";

drop policy "Users can update their own profile" on "public"."users";

drop policy "users: read self" on "public"."users";

drop policy "users_select_self" on "public"."users";

drop policy "users_self_select" on "public"."users";

drop policy "users_self_update" on "public"."users";

drop policy "users_update_self" on "public"."users";

drop function if exists "public"."admin_has_access"(p_section text);

drop function if exists "public"."admin_is_admin"();

alter table "public"."admin_currency_rates" disable row level security;

alter table "public"."admin_notes" disable row level security;

alter table "public"."admin_tasks" disable row level security;

alter table "public"."order_files" disable row level security;

alter table "public"."order_items_files" disable row level security;

alter table "public"."order_items_search" disable row level security;

alter table "public"."order_payment" disable row level security;

alter table "public"."order_payment_methods" disable row level security;

alter table "public"."order_payment_transactions" disable row level security;

alter table "public"."order_quotes" disable row level security;

set check_function_bodies = off;

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


  create policy "Deny all for everyone"
  on "public"."admin_users"
  as permissive
  for all
  to public
using (false)
with check (false);



  create policy "Admins bypass RLS for all items."
  on "public"."order_items"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select items from their own orders."
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Admins bypass RLS for ALL access."
  on "public"."orders"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select their own orders."
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Admins can select all users."
  on "public"."users"
  as permissive
  for select
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select their own profile."
  on "public"."users"
  as permissive
  for select
  to authenticated
using ((id = auth.uid()));



