-- Fix recursive admin policies
drop policy if exists "Admins have full access to orgs" on public.organizations;
create policy "Admins have full access to orgs" on public.organizations for all to authenticated
using (public.is_foodbridge_admin());

drop policy if exists "Admins have full access to org members" on public.organization_members;
create policy "Admins have full access to org members" on public.organization_members for all to authenticated
using (public.is_foodbridge_admin());

drop policy if exists "Admins have full access to donations" on public.donations;
create policy "Admins have full access to donations" on public.donations for all to authenticated
using (public.is_foodbridge_admin());

drop policy if exists "Admins have full access to matches" on public.matches;
create policy "Admins have full access to matches" on public.matches for all to authenticated
using (public.is_foodbridge_admin());
