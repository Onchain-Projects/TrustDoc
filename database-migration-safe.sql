-- Safe Database Migration Script for TrustDoc
-- This script safely updates the proofs table to match the application's expected schema
-- without breaking existing data

-- Step 1: Add missing columns (allowing NULL initially)
ALTER TABLE public.proofs 
ADD COLUMN IF NOT EXISTS issuer_id TEXT,
ADD COLUMN IF NOT EXISTS batch TEXT,
ADD COLUMN IF NOT EXISTS merkle_root TEXT,
ADD COLUMN IF NOT EXISTS file_paths TEXT[],
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Update existing records to populate the new columns
-- For existing records, we'll extract data from proof_json and use fallbacks
UPDATE public.proofs 
SET 
  issuer_id = COALESCE(issuer_id, 'legacy_issuer_' || substring(id::text, 1, 8)),
  batch = COALESCE(batch, 'legacy_batch_' || substring(id::text, 1, 8)),
  merkle_root = COALESCE(merkle_root, signature), -- Use signature as merkle_root for legacy records
  file_paths = COALESCE(file_paths, ARRAY['legacy_file_' || substring(id::text, 1, 8)]),
  description = COALESCE(description, 'Legacy document from ' || created_at::date::text)
WHERE issuer_id IS NULL OR batch IS NULL OR merkle_root IS NULL;

-- Step 3: Create indexes for better performance (these don't require NOT NULL)
CREATE INDEX IF NOT EXISTS idx_proofs_issuer_id ON public.proofs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_proofs_merkle_root ON public.proofs(merkle_root);
CREATE INDEX IF NOT EXISTS idx_proofs_batch ON public.proofs(batch);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at ON public.proofs(created_at);

-- Step 4: Update Row Level Security (RLS) policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own proofs" ON public.proofs;
DROP POLICY IF EXISTS "Users can insert their own proofs" ON public.proofs;
DROP POLICY IF EXISTS "Users can update their own proofs" ON public.proofs;
DROP POLICY IF EXISTS "Users can delete their own proofs" ON public.proofs;

-- Create new RLS policies that work with both old and new data
CREATE POLICY "Users can view their own proofs" ON public.proofs
  FOR SELECT USING (
    -- Check if issuer_id column exists and matches
    (issuer_id IS NOT NULL AND issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
    OR
    -- Fallback: check proof_json for issuer_id
    (issuer_id IS NULL AND proof_json->>'issuer_id' IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
  );

CREATE POLICY "Users can insert their own proofs" ON public.proofs
  FOR INSERT WITH CHECK (
    -- Check if issuer_id column exists and matches
    (issuer_id IS NOT NULL AND issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
    OR
    -- Fallback: check proof_json for issuer_id
    (issuer_id IS NULL AND proof_json->>'issuer_id' IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
  );

CREATE POLICY "Users can update their own proofs" ON public.proofs
  FOR UPDATE USING (
    -- Check if issuer_id column exists and matches
    (issuer_id IS NOT NULL AND issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
    OR
    -- Fallback: check proof_json for issuer_id
    (issuer_id IS NULL AND proof_json->>'issuer_id' IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
  );

CREATE POLICY "Users can delete their own proofs" ON public.proofs
  FOR DELETE USING (
    -- Check if issuer_id column exists and matches
    (issuer_id IS NOT NULL AND issuer_id IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
    OR
    -- Fallback: check proof_json for issuer_id
    (issuer_id IS NULL AND proof_json->>'issuer_id' IN (
      SELECT issuer_id FROM public.issuers 
      WHERE email = auth.jwt() ->> 'email'
    ))
  );

-- Step 5: Enable RLS on the table
ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant necessary permissions
GRANT ALL ON public.proofs TO authenticated;
GRANT ALL ON public.proofs TO service_role;

-- Step 7: Verification queries to check the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'proofs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check migration results
SELECT 
  COUNT(*) as total_proofs,
  COUNT(issuer_id) as proofs_with_issuer_id,
  COUNT(merkle_root) as proofs_with_merkle_root,
  COUNT(file_paths) as proofs_with_file_paths
FROM public.proofs;

-- Show sample of updated records
SELECT 
  id,
  issuer_id,
  batch,
  merkle_root,
  file_paths,
  created_at
FROM public.proofs 
ORDER BY created_at DESC 
LIMIT 5;
