-- Migration: Add user_profiles table for BYOK (Bring Your Own Key) support
-- Run this in the Supabase SQL Editor after unpausing your project

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "anthropicApiKey"       TEXT,
  "freeGenerationsUsed"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to auto-update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON "user_profiles"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
