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
