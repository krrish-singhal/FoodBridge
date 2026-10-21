-- Create test users in auth.users
-- Note: Passwords must be handled via the API, but for direct DB injection you can insert raw hashes
-- For local testing, it's easiest to create the accounts via the UI, but we can insert Organizations here.

-- Insert test Organizations
INSERT INTO public.organizations (id, name, type, verification_status, email, phone, address, city, country, capacity_meals, operating_radius_km)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Fresh Foods Market', 'PROVIDER', 'VERIFIED', 'contact@freshfoods.test', '555-0101', '123 Market St', 'San Francisco', 'USA', NULL, NULL),
  ('22222222-2222-2222-2222-222222222222', 'City Bakery', 'PROVIDER', 'VERIFIED', 'hello@citybakery.test', '555-0102', '456 Baker Ave', 'San Francisco', 'USA', NULL, NULL),
  ('33333333-3333-3333-3333-333333333333', 'Hope Shelter', 'NGO', 'VERIFIED', 'info@hopeshelter.test', '555-0201', '789 Mission St', 'San Francisco', 'USA', 500, 25),
  ('44444444-4444-4444-4444-444444444444', 'Community Kitchen', 'NGO', 'PENDING', 'help@communitykitchen.test', '555-0202', '321 Aid Blvd', 'San Francisco', 'USA', 200, 10)
ON CONFLICT (id) DO NOTHING;

-- Insert organization_verifications for the ones that need it
INSERT INTO public.organization_verification (id, organization_id, status, documents_url)
VALUES
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'PENDING', '["https://example.com/doc1.pdf"]')
ON CONFLICT DO NOTHING;
