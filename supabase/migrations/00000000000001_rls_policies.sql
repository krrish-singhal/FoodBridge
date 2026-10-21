-- Enable Row Level Security on all tables
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_verification enable row level security;
alter table verification_documents enable row level security;
alter table organization_preferences enable row level security;
alter table donation_categories enable row level security;
alter table donations enable row level security;
alter table donation_images enable row level security;
alter table donation_allergens enable row level security;
alter table donation_safety_checklists enable row level security;
alter table recurring_donations enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;
alter table pickups enable row level security;
alter table pickup_otp enable row level security;
alter table pickup_proof enable row level security;
alter table pickup_events enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table message_read_status enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table ratings enable row level security;
alter table reliability_scores enable row level security;
alter table audit_logs enable row level security;
alter table reports enable row level security;
alter table system_settings enable row level security;

-- PROFILES
-- Users can read their own profile
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
-- Users can update their own profile
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
-- Admins can read all profiles
create policy "Admins can read all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- ORGANIZATIONS
-- Anyone can read verified organizations
create policy "Anyone can read verified orgs" on organizations for select using (verification_status = 'VERIFIED');
-- Members can read their own organization
create policy "Members can read own org" on organizations for select using (
  id in (select organization_id from organization_members where user_id = auth.uid())
);
-- Members can update their own organization
create policy "Members can update own org" on organizations for update using (
  id in (select organization_id from organization_members where user_id = auth.uid())
);
-- Admins can do anything on organizations
create policy "Admins have full access to orgs" on organizations for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- ORGANIZATION MEMBERS
-- Members can read their own organization's members
create policy "Members can read own org members" on organization_members for select using (
  organization_id in (select organization_id from organization_members where user_id = auth.uid())
);
-- Users can see their own membership
create policy "Users can read own membership" on organization_members for select using (user_id = auth.uid());
-- Admins have full access
create policy "Admins have full access to org members" on organization_members for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- DONATIONS
-- Anyone can read available donations (useful for public stats, but maybe restrict to logged in)
create policy "Logged in users can read donations" on donations for select using (auth.role() = 'authenticated');
-- Providers can create donations for their org
create policy "Providers can insert donations" on donations for insert with check (
  provider_id in (select organization_id from organization_members where user_id = auth.uid())
);
-- Providers can update their own donations
create policy "Providers can update own donations" on donations for update using (
  provider_id in (select organization_id from organization_members where user_id = auth.uid())
);
-- Admins have full access
create policy "Admins have full access to donations" on donations for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- MATCHES
-- NGOs can read matches assigned to them
create policy "NGOs can read own matches" on matches for select using (
  ngo_id in (select organization_id from organization_members where user_id = auth.uid())
);
-- Providers can read matches for their donations
create policy "Providers can read matches for own donations" on matches for select using (
  donation_id in (select id from donations where provider_id in (select organization_id from organization_members where user_id = auth.uid()))
);
-- Admins have full access
create policy "Admins have full access to matches" on matches for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'ADMIN')
);

-- CONVERSATIONS & MESSAGES
-- Users can read conversations their org is part of
create policy "Members can read own conversations" on conversations for select using (
  id in (select conversation_id from conversation_members where organization_id in (select organization_id from organization_members where user_id = auth.uid()))
);
-- Users can read messages in their conversations
create policy "Members can read conversation messages" on messages for select using (
  conversation_id in (select conversation_id from conversation_members where organization_id in (select organization_id from organization_members where user_id = auth.uid()))
);
-- Users can insert messages in their conversations
create policy "Members can insert conversation messages" on messages for insert with check (
  conversation_id in (select conversation_id from conversation_members where organization_id in (select organization_id from organization_members where user_id = auth.uid()))
  and sender_org_id in (select organization_id from organization_members where user_id = auth.uid())
  and sender_user_id = auth.uid()
);

-- NOTIFICATIONS
-- Users can only read and update their own notifications
create policy "Users can read own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users can update own notifications" on notifications for update using (user_id = auth.uid());
