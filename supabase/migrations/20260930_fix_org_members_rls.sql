drop policy if exists "Members can read own org members" on public.organization_members;
create policy "Users can view their own membership" on public.organization_members for select using (user_id = auth.uid());
create policy "Admins can view all memberships" on public.organization_members for select using (public.is_foodbridge_admin());
