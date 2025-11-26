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


  create policy "Users can update their own profile"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



