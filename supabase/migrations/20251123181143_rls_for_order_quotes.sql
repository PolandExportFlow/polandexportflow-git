alter table "public"."order_files" enable row level security;

alter table "public"."order_items_files" enable row level security;

alter table "public"."order_items_search" enable row level security;

alter table "public"."order_payment" enable row level security;

alter table "public"."order_payment_methods" enable row level security;

alter table "public"."order_payment_transactions" enable row level security;

alter table "public"."order_quotes" enable row level security;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_item_ownership(item_id_to_check uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
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


  create policy "Admins can manage all order files."
  on "public"."order_files"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can delete their own order files."
  on "public"."order_files"
  as permissive
  for delete
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users can insert files for their own orders."
  on "public"."order_files"
  as permissive
  for insert
  to authenticated
with check ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users can select their own order files."
  on "public"."order_files"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Admins can manage all item files."
  on "public"."order_items_files"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can delete their own item files."
  on "public"."order_items_files"
  as permissive
  for delete
  to authenticated
using (public.check_item_ownership(item_id));



  create policy "Users can insert item files for their own orders."
  on "public"."order_items_files"
  as permissive
  for insert
  to authenticated
with check (public.check_item_ownership(item_id));



  create policy "Users can select their own item files."
  on "public"."order_items_files"
  as permissive
  for select
  to authenticated
using (public.check_item_ownership(item_id));



  create policy "Admins can manage all search records."
  on "public"."order_items_search"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select their own search records."
  on "public"."order_items_search"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Admins can manage all payments."
  on "public"."order_payment"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can insert their own payments."
  on "public"."order_payment"
  as permissive
  for insert
  to authenticated
with check ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users can select their own payments."
  on "public"."order_payment"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users can update their own payments."
  on "public"."order_payment"
  as permissive
  for update
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))))
with check ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Admins can manage payment methods."
  on "public"."order_payment_methods"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select payment methods."
  on "public"."order_payment_methods"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Users cannot modify payment methods."
  on "public"."order_payment_methods"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "Admins can manage all transactions."
  on "public"."order_payment_transactions"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select their own transactions."
  on "public"."order_payment_transactions"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users cannot modify transactions."
  on "public"."order_payment_transactions"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



  create policy "Admins can manage all quotes."
  on "public"."order_quotes"
  as permissive
  for all
  to authenticated
using (public.sys_is_admin());



  create policy "Users can select their own quotes."
  on "public"."order_quotes"
  as permissive
  for select
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users can update their own quotes."
  on "public"."order_quotes"
  as permissive
  for update
  to authenticated
using ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))))
with check ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE (orders.user_id = auth.uid()))));



  create policy "Users cannot insert or delete quotes."
  on "public"."order_quotes"
  as permissive
  for all
  to authenticated
using (false)
with check (false);



