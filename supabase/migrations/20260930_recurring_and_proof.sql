ALTER TABLE recurring_donations ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE';
ALTER TABLE pickup_proof ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
