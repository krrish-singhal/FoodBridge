-- Enable necessary extensions
create extension if not exists "postgis";
create extension if not exists "uuid-ossp";

-- ENUMS
create type user_role as enum ('PROVIDER', 'NGO', 'ADMIN', 'CSR');
create type verification_status as enum ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');
create type organization_type as enum ('RESTAURANT', 'HOTEL', 'EVENT_ORGANIZER', 'CATERER', 'NGO', 'SUPERMARKET', 'OTHER');
create type donation_status as enum ('AVAILABLE', 'MATCHED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'DELIVERED', 'DISTRIBUTED', 'EXPIRED', 'CANCELLED', 'FAILED');
create type match_status as enum ('PENDING', 'NOTIFIED', 'ACCEPTED', 'REJECTED', 'QUANTITY_CHANGE_REQUESTED', 'TIME_CHANGE_REQUESTED', 'EXPIRED', 'FAILED');
create type pickup_status as enum ('SCHEDULED', 'CONFIRMED', 'ON_THE_WAY', 'OTP_VERIFIED', 'PICKED_UP', 'DELIVERED', 'FAILED');
create type urgency_level as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type notification_type as enum ('NEW_DONATION', 'MATCH_FOUND', 'MATCH_ACCEPTED', 'PICKUP_SCHEDULED', 'PICKUP_APPROACHING', 'EXPIRING_SOON', 'DELIVERY_COMPLETED', 'VERIFICATION_UPDATE', 'SYSTEM_ALERT');

-- PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  role user_role default 'PROVIDER'::user_role not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ORGANIZATIONS
create table organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type organization_type not null,
  address text not null,
  city text not null,
  state text,
  country text not null,
  postal_code text,
  location geography(point) not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  website text,
  description text,
  capacity_meals integer,
  verification_status verification_status default 'PENDING'::verification_status not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_org_location on organizations using gist (location);
create index idx_org_status on organizations (verification_status);

-- ORGANIZATION MEMBERS
create table organization_members (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text default 'MEMBER' not null,
  created_at timestamptz default now(),
  unique(organization_id, user_id)
);

-- ORGANIZATION VERIFICATION
create table organization_verification (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  status verification_status default 'PENDING'::verification_status not null,
  reviewer_id uuid references profiles(id),
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- VERIFICATION DOCUMENTS
create table verification_documents (
  id uuid default uuid_generate_v4() primary key,
  verification_id uuid references organization_verification(id) on delete cascade not null,
  document_type text not null,
  file_url text not null,
  uploaded_at timestamptz default now()
);

-- ORGANIZATION PREFERENCES
create table organization_preferences (
  organization_id uuid references organizations(id) on delete cascade primary key,
  accepted_food_types text[],
  pickup_radius_km numeric default 10,
  operating_hours jsonb,
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- DONATION CATEGORIES (Configurable)
create table donation_categories (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- DONATIONS
create table donations (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid references organizations(id) on delete cascade not null,
  category_id uuid references donation_categories(id) not null,
  food_name text not null,
  quantity numeric not null,
  quantity_unit text not null,
  meals_estimate integer not null,
  food_type text not null,
  prepared_at timestamptz not null,
  consume_before timestamptz not null,
  pickup_location geography(point) not null,
  pickup_address text not null,
  description text,
  status donation_status default 'AVAILABLE'::donation_status not null,
  urgency urgency_level default 'LOW'::urgency_level not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_donations_status on donations (status);
create index idx_donations_consume_before on donations (consume_before);

-- DONATION IMAGES
create table donation_images (
  id uuid default uuid_generate_v4() primary key,
  donation_id uuid references donations(id) on delete cascade not null,
  image_url text not null,
  created_at timestamptz default now()
);

-- DONATION ALLERGENS
create table donation_allergens (
  donation_id uuid references donations(id) on delete cascade,
  allergen text not null,
  primary key (donation_id, allergen)
);

-- DONATION SAFETY CHECKLIST
create table donation_safety_checklists (
  donation_id uuid references donations(id) on delete cascade primary key,
  proper_storage boolean not null,
  safe_packaging boolean not null,
  temp_controlled boolean not null,
  completed_at timestamptz default now()
);

-- RECURRING DONATIONS
create table recurring_donations (
  id uuid default uuid_generate_v4() primary key,
  provider_id uuid references organizations(id) on delete cascade not null,
  category_id uuid references donation_categories(id) not null,
  schedule_cron text not null,
  food_name text not null,
  approx_quantity numeric not null,
  quantity_unit text not null,
  approx_meals integer not null,
  pickup_address text not null,
  pickup_location geography(point) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- MATCHES
create table matches (
  id uuid default uuid_generate_v4() primary key,
  donation_id uuid references donations(id) on delete cascade not null,
  ngo_id uuid references organizations(id) on delete cascade not null,
  status match_status default 'PENDING'::match_status not null,
  score numeric not null,
  score_breakdown jsonb,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_matches_donation on matches(donation_id);
create index idx_matches_ngo on matches(ngo_id);

-- MATCH EVENTS
create table match_events (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  event_type match_status not null,
  actor_id uuid references profiles(id),
  notes text,
  created_at timestamptz default now()
);

-- PICKUPS
create table pickups (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  scheduled_time timestamptz not null,
  status pickup_status default 'SCHEDULED'::pickup_status not null,
  coordinator_name text not null,
  coordinator_phone text not null,
  vehicle_details text,
  failure_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PICKUP OTP
create table pickup_otp (
  pickup_id uuid references pickups(id) on delete cascade primary key,
  otp_hash text not null,
  expires_at timestamptz not null,
  is_used boolean default false,
  attempts integer default 0,
  created_at timestamptz default now()
);

-- PICKUP PROOF
create table pickup_proof (
  id uuid default uuid_generate_v4() primary key,
  pickup_id uuid references pickups(id) on delete cascade not null,
  proof_url text,
  notes text,
  verified_at timestamptz default now()
);

-- PICKUP EVENTS
create table pickup_events (
  id uuid default uuid_generate_v4() primary key,
  pickup_id uuid references pickups(id) on delete cascade not null,
  status pickup_status not null,
  location geography(point),
  created_at timestamptz default now()
);

-- CONVERSATIONS
create table conversations (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONVERSATION MEMBERS
create table conversation_members (
  conversation_id uuid references conversations(id) on delete cascade not null,
  organization_id uuid references organizations(id) on delete cascade not null,
  joined_at timestamptz default now(),
  primary key (conversation_id, organization_id)
);

-- MESSAGES
create table messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_org_id uuid references organizations(id) on delete set null,
  sender_user_id uuid references profiles(id) on delete set null,
  content text,
  attachment_url text,
  created_at timestamptz default now()
);
create index idx_messages_conversation on messages(conversation_id);

-- MESSAGE READ STATUS
create table message_read_status (
  message_id uuid references messages(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  read_at timestamptz default now(),
  primary key (message_id, user_id)
);

-- NOTIFICATIONS
create table notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type notification_type not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index idx_notifications_user on notifications(user_id, is_read);

-- NOTIFICATION PREFERENCES
create table notification_preferences (
  user_id uuid references profiles(id) on delete cascade primary key,
  in_app boolean default true,
  email boolean default true,
  sms boolean default false,
  push boolean default false
);

-- RATINGS
create table ratings (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references matches(id) on delete set null,
  reviewer_org_id uuid references organizations(id) on delete cascade not null,
  target_org_id uuid references organizations(id) on delete cascade not null,
  score integer check (score >= 1 and score <= 5) not null,
  review text,
  created_at timestamptz default now(),
  unique(match_id, reviewer_org_id)
);

-- RELIABILITY SCORES
create table reliability_scores (
  organization_id uuid references organizations(id) on delete cascade primary key,
  score numeric not null check (score >= 0 and score <= 100),
  total_completed integer default 0,
  total_failed integer default 0,
  last_calculated_at timestamptz default now()
);

-- AUDIT LOGS
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- REPORTS
create table reports (
  id uuid default uuid_generate_v4() primary key,
  generated_by uuid references profiles(id) on delete set null,
  report_type text not null,
  parameters jsonb,
  file_url text not null,
  created_at timestamptz default now()
);

-- SYSTEM SETTINGS
create table system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id) on delete set null
);
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
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
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
-- Default donation categories
insert into donation_categories (name) values
  ('Cooked Meals'),
  ('Fruits'),
  ('Vegetables'),
  ('Bakery'),
  ('Packaged Food'),
  ('Dairy'),
  ('Beverages')
on conflict (name) do nothing;
-- Migration to add idempotency key to notifications table

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency ON notifications(idempotency_key);

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
-- 1. Create sequences for each entity type
CREATE SEQUENCE IF NOT EXISTS sq_profiles_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_orgs_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_donations_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_matches_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_pickups_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_conversations_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_reports_public_id START 1;
CREATE SEQUENCE IF NOT EXISTS sq_audit_logs_public_id START 1;

-- 2. Add public_id columns to tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE pickups ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS public_id text unique;

-- Audit logs requires more changes based on the new spec
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS public_id text unique;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_public_id text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity text;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- Rename 'action' to 'event_type' to match the spec if not already
ALTER TABLE audit_logs RENAME COLUMN action TO event_type;

-- 3. Create a function to generate public IDs with prefixes
CREATE OR REPLACE FUNCTION generate_public_id(prefix text, seq_name text) RETURNS text AS $$
DECLARE
  next_val bigint;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
  RETURN prefix || lpad(next_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger functions for each table
CREATE OR REPLACE FUNCTION tf_set_profile_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-USR-', 'sq_profiles_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_org_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-ORG-', 'sq_orgs_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_donation_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-DON-', 'sq_donations_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_match_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-MAT-', 'sq_matches_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_pickup_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-PCK-', 'sq_pickups_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_conversation_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-CON-', 'sq_conversations_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_report_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-RPT-', 'sq_reports_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tf_set_audit_log_public_id() RETURNS trigger AS $$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_public_id('FB-ACT-', 'sq_audit_logs_public_id');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach triggers to tables
DROP TRIGGER IF EXISTS tr_set_profile_public_id ON profiles;
CREATE TRIGGER tr_set_profile_public_id BEFORE INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION tf_set_profile_public_id();

DROP TRIGGER IF EXISTS tr_set_org_public_id ON organizations;
CREATE TRIGGER tr_set_org_public_id BEFORE INSERT ON organizations FOR EACH ROW EXECUTE FUNCTION tf_set_org_public_id();

DROP TRIGGER IF EXISTS tr_set_donation_public_id ON donations;
CREATE TRIGGER tr_set_donation_public_id BEFORE INSERT ON donations FOR EACH ROW EXECUTE FUNCTION tf_set_donation_public_id();

DROP TRIGGER IF EXISTS tr_set_match_public_id ON matches;
CREATE TRIGGER tr_set_match_public_id BEFORE INSERT ON matches FOR EACH ROW EXECUTE FUNCTION tf_set_match_public_id();

DROP TRIGGER IF EXISTS tr_set_pickup_public_id ON pickups;
CREATE TRIGGER tr_set_pickup_public_id BEFORE INSERT ON pickups FOR EACH ROW EXECUTE FUNCTION tf_set_pickup_public_id();

DROP TRIGGER IF EXISTS tr_set_conversation_public_id ON conversations;
CREATE TRIGGER tr_set_conversation_public_id BEFORE INSERT ON conversations FOR EACH ROW EXECUTE FUNCTION tf_set_conversation_public_id();

DROP TRIGGER IF EXISTS tr_set_report_public_id ON reports;
CREATE TRIGGER tr_set_report_public_id BEFORE INSERT ON reports FOR EACH ROW EXECUTE FUNCTION tf_set_report_public_id();

DROP TRIGGER IF EXISTS tr_set_audit_log_public_id ON audit_logs;
CREATE TRIGGER tr_set_audit_log_public_id BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION tf_set_audit_log_public_id();

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_organizations_public_id ON organizations(public_id);
CREATE INDEX IF NOT EXISTS idx_donations_public_id ON donations(public_id);
CREATE INDEX IF NOT EXISTS idx_matches_public_id ON matches(public_id);
CREATE INDEX IF NOT EXISTS idx_pickups_public_id ON pickups(public_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_public_id ON audit_logs(public_id);

-- 7. Update existing rows if any
UPDATE profiles SET public_id = generate_public_id('FB-USR-', 'sq_profiles_public_id') WHERE public_id IS NULL;
UPDATE organizations SET public_id = generate_public_id('FB-ORG-', 'sq_orgs_public_id') WHERE public_id IS NULL;
UPDATE donations SET public_id = generate_public_id('FB-DON-', 'sq_donations_public_id') WHERE public_id IS NULL;
UPDATE matches SET public_id = generate_public_id('FB-MAT-', 'sq_matches_public_id') WHERE public_id IS NULL;
UPDATE pickups SET public_id = generate_public_id('FB-PCK-', 'sq_pickups_public_id') WHERE public_id IS NULL;
UPDATE conversations SET public_id = generate_public_id('FB-CON-', 'sq_conversations_public_id') WHERE public_id IS NULL;
UPDATE reports SET public_id = generate_public_id('FB-RPT-', 'sq_reports_public_id') WHERE public_id IS NULL;
UPDATE audit_logs SET public_id = generate_public_id('FB-ACT-', 'sq_audit_logs_public_id') WHERE public_id IS NULL;
