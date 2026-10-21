-- Migration to add idempotency key to notifications table

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency ON notifications(idempotency_key);
