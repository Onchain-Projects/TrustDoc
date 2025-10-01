 -- Database Migration Script for TrustDoc
-- This script updates the proofs table to match the application's expected schema

-- First, let's see what columns currently exist
-- The current table has: id, uuid, proof_json, signature, created_at, expiry_date
-- We need: id, issuer_id, batch, merkle_root, proof_json, signature, file_paths, created_at, expiry_date, description

-- Step 1: Add missing columns
ALTER TABLE public.proofs 
ADD COLUMN IF NOT EXISTS issuer_id TEXT,
ADD COLUMN IF NOT EXISTS batch TEXT,
ADD COLUMN IF NOT EXISTS merkle_root TEXT,
ADD COLUMN IF NOT EXISTS file_paths TEXT[],
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Remove the unnecessary uuid column (if it exists and is not being used)
-- ALTER TABLE public.proofs DROP COLUMN IF EXISTS uuid;

-- Step 3: Update existing records to populate the new columns
-- For existing records, we'll try to extract data from proof_json
UPDATE public.proofs 
SET 
  issuer_id = COALESCE(issuer_id, 'legacy_issuer'),
  batch = COALESCE(batch, 'legacy_batch_' || id),
  merkle_root = COALESCE(merkle_root, signature), -- Use signature as merkle_root for legacy records
  file_paths = COALESCE(file_paths, ARRAY['legacy_file']),
  description = COALESCE(description, 'Legacy document')
WHERE issuer_id IS NULL OR batch IS NULL OR merkle_root IS NULL;

-- Step 4: Add constraints and indexes (only for non-null columns)
ALTER TABLE public.proofs 
ADD CONSTRAINT proofs_issuer_id_not_null CHECK (issuer_id IS NOT NULL),
ADD CONSTRAINT proofs_batch_not_null CHECK (batch IS NOT NULL),
ADD CONSTRAINT proofs_merkle_root_not_null CHECK (merkle_root IS NOT NULL);

-- Note: Not adding NOT NULL constraint for file_paths as some legacy records may have NULL values
-- You can add this constraint later after ensuring all records have proper file_paths

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_proofs_issuer_id ON public.proofs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_proofs_merkle_root ON public.proofs(merkle_root);
CREATE INDEX IF NOT EXISTS idx_proofs_batch ON public.proofs(batch);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON public.proofs(created_at);

-- Step 6: Update Row Level Security (RLS) policies if needed
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own proofs" ON public.proofs;
DROP POLICY IF EXISTS "Users can insert their own proofs" ON public.proofs;
DROP POLICY IF EXISTS "Users can update their own proofs" ON public.proofs;
DROP POLICY IF EXISTS "Users can delete their own proofs" ON public.proofs;

-- Create new RLS policies
CREATE POLICY "Users can view their own proofs" ON public.proofs
  FOR SELECT USING (
    issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can insert their own proofs" ON public.proofs
  FOR INSERT WITH CHECK (
    issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can update their own proofs" ON public.proofs
  FOR UPDATE USING (
    issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Users can delete their own proofs" ON public.proofs
  FOR DELETE USING (
    issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Step 7: Enable RLS on the table
ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;

-- Step 8: Grant necessary permissions
GRANT ALL ON public.proofs TO authenticated;
GRANT ALL ON public.proofs TO service_role;

-- Verification queries to check the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'proofs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the migration was successful
SELECT COUNT(*) as total_proofs FROM public.proofs;
SELECT COUNT(*) as proofs_with_issuer_id FROM public.proofs WHERE issuer_id IS NOT NULL;
SELECT COUNT(*) as proofs_with_merkle_root FROM public.proofs WHERE merkle_root IS NOT NULL;
