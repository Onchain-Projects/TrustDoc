-- Add Foreign Key Relationship between proofs and issuers
-- This allows Supabase to perform JOIN queries

-- Step 1: Add foreign key constraint
ALTER TABLE proofs 
ADD CONSTRAINT fk_proofs_issuer_id 
FOREIGN KEY (issuer_id) 
REFERENCES issuers(issuer_id) 
ON DELETE CASCADE;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_proofs_issuer_id_fk ON proofs(issuer_id);

-- Step 3: Verify the relationship was created
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='proofs';

