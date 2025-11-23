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


