-- SQL script to add missing columns 'city' and 'contact_phone' to the 'clients' table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/rmfiorgvfqucstiiwitg/sql

-- 1. Add columns to 'clients' table if they don't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2. Explicitly enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 3. Setup public RLS policies
DROP POLICY IF EXISTS "Allow select on clients" ON clients;
DROP POLICY IF EXISTS "Allow insert on clients" ON clients;
DROP POLICY IF EXISTS "Allow update on clients" ON clients;
DROP POLICY IF EXISTS "Allow delete on clients" ON clients;

CREATE POLICY "Allow select on clients" ON clients FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert on clients" ON clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow update on clients" ON clients FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on clients" ON clients FOR DELETE TO public USING (true);

-- 4. Setup GRANTS for public Data API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
