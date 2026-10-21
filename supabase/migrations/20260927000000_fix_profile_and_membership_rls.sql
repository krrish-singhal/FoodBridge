-- Avoid evaluating a table's own RLS policies recursively.
create or replace function public.is_foodbridge_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'); $$;

create or replace function public.foodbridge_memberships()
returns setof uuid language sql stable security definer set search_path = ''
as $$ select organization_id from public.organization_members where user_id = auth.uid(); $$;

revoke all on function public.is_foodbridge_admin() from public;
revoke all on function public.foodbridge_memberships() from public;
grant execute on function public.is_foodbridge_admin() to authenticated;
grant execute on function public.foodbridge_memberships() to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles for select to authenticated
using (public.is_foodbridge_admin());
drop policy if exists "Members can read own org members" on public.organization_members;
create policy "Members can read own org members" on public.organization_members for select to authenticated
using (organization_id in (select public.foodbridge_memberships()));

-- Users may edit their contact details, but cannot promote themselves.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
