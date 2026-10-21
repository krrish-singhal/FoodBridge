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
