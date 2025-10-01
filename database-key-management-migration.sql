-- Database Migration for Cryptographic Key Management
-- This script creates the necessary tables for proper key management

-- Step 1: Create issuer_keys table for storing cryptographic key pairs
CREATE TABLE IF NOT EXISTS public.issuer_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issuer_id VARCHAR(255) NOT NULL,
    key_id VARCHAR(255) UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    algorithm VARCHAR(20) NOT NULL DEFAULT 'ec',
    key_size INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    fingerprint VARCHAR(64) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create key_rotations table for tracking key rotation history
CREATE TABLE IF NOT EXISTS public.key_rotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issuer_id VARCHAR(255) NOT NULL,
    old_key_id VARCHAR(255),
    new_key_id VARCHAR(255) NOT NULL,
    rotation_reason VARCHAR(100),
    rotated_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_by UUID REFERENCES auth.users(id)
);

-- Step 3: Create key_backups table for storing encrypted key backups
CREATE TABLE IF NOT EXISTS public.key_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issuer_id VARCHAR(255) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    backup_data TEXT NOT NULL, -- Encrypted backup data
    backup_type VARCHAR(20) DEFAULT 'full', -- full, partial, recovery
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

-- Step 4: Create document_signatures table for storing document signatures
CREATE TABLE IF NOT EXISTS public.document_signatures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_hash VARCHAR(255) NOT NULL,
    issuer_id VARCHAR(255) NOT NULL,
    key_id VARCHAR(255) NOT NULL,
    signature TEXT NOT NULL,
    algorithm VARCHAR(20) NOT NULL,
    signed_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    is_valid BOOLEAN,
    verification_attempts INTEGER DEFAULT 0
);

-- Step 5: Add new columns to existing issuers table
ALTER TABLE public.issuers 
ADD COLUMN IF NOT EXISTS key_type VARCHAR(20) DEFAULT 'ec',
ADD COLUMN IF NOT EXISTS key_size INTEGER DEFAULT 256,
ADD COLUMN IF NOT EXISTS key_algorithm VARCHAR(20) DEFAULT 'SHA256',
ADD COLUMN IF NOT EXISTS key_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS key_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_key_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS key_fingerprint VARCHAR(64),
ADD COLUMN IF NOT EXISTS last_key_rotation TIMESTAMPTZ;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issuer_keys_issuer_id ON public.issuer_keys(issuer_id);
CREATE INDEX IF NOT EXISTS idx_issuer_keys_key_id ON public.issuer_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_issuer_keys_is_active ON public.issuer_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_issuer_keys_created_at ON public.issuer_keys(created_at);
CREATE INDEX IF NOT EXISTS idx_issuer_keys_fingerprint ON public.issuer_keys(fingerprint);

CREATE INDEX IF NOT EXISTS idx_key_rotations_issuer_id ON public.key_rotations(issuer_id);
CREATE INDEX IF NOT EXISTS idx_key_rotations_rotated_at ON public.key_rotations(rotated_at);

CREATE INDEX IF NOT EXISTS idx_key_backups_issuer_id ON public.key_backups(issuer_id);
CREATE INDEX IF NOT EXISTS idx_key_backups_created_at ON public.key_backups(created_at);

CREATE INDEX IF NOT EXISTS idx_document_signatures_document_hash ON public.document_signatures(document_hash);
CREATE INDEX IF NOT EXISTS idx_document_signatures_issuer_id ON public.document_signatures(issuer_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signed_at ON public.document_signatures(signed_at);

-- Step 7: Create Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.issuer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- issuer_keys policies
CREATE POLICY "Users can view their own keys" ON public.issuer_keys
    FOR SELECT USING (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert their own keys" ON public.issuer_keys
    FOR INSERT WITH CHECK (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can update their own keys" ON public.issuer_keys
    FOR UPDATE USING (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- key_rotations policies
CREATE POLICY "Users can view their own key rotations" ON public.key_rotations
    FOR SELECT USING (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert their own key rotations" ON public.key_rotations
    FOR INSERT WITH CHECK (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- key_backups policies
CREATE POLICY "Users can view their own key backups" ON public.key_backups
    FOR SELECT USING (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert their own key backups" ON public.key_backups
    FOR INSERT WITH CHECK (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can delete their own key backups" ON public.key_backups
    FOR DELETE USING (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- document_signatures policies
CREATE POLICY "Users can view their own document signatures" ON public.document_signatures
    FOR SELECT USING (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Users can insert their own document signatures" ON public.document_signatures
    FOR INSERT WITH CHECK (
        issuer_id IN (
            SELECT issuer_id FROM public.issuers 
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Step 8: Grant necessary permissions
GRANT ALL ON public.issuer_keys TO authenticated;
GRANT ALL ON public.issuer_keys TO service_role;

GRANT ALL ON public.key_rotations TO authenticated;
GRANT ALL ON public.key_rotations TO service_role;

GRANT ALL ON public.key_backups TO authenticated;
GRANT ALL ON public.key_backups TO service_role;

GRANT ALL ON public.document_signatures TO authenticated;
GRANT ALL ON public.document_signatures TO service_role;

-- Step 9: Create functions for key management

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_issuer_keys_updated_at 
    BEFORE UPDATE ON public.issuer_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log key rotations
CREATE OR REPLACE FUNCTION log_key_rotation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if is_active changed from true to false
    IF OLD.is_active = true AND NEW.is_active = false THEN
        INSERT INTO public.key_rotations (issuer_id, old_key_id, new_key_id, rotation_reason)
        VALUES (NEW.issuer_id, OLD.key_id, NULL, 'Key deactivated');
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for key rotation logging
CREATE TRIGGER log_key_rotation_trigger
    AFTER UPDATE ON public.issuer_keys
    FOR EACH ROW EXECUTE FUNCTION log_key_rotation();

-- Step 10: Create views for easier querying

-- View for active keys with issuer information
CREATE OR REPLACE VIEW public.active_issuer_keys AS
SELECT 
    ik.*,
    i.name as issuer_name,
    i.email as issuer_email
FROM public.issuer_keys ik
JOIN public.issuers i ON ik.issuer_id = i.issuer_id
WHERE ik.is_active = true;

-- View for key statistics
CREATE OR REPLACE VIEW public.key_statistics AS
SELECT 
    issuer_id,
    COUNT(*) as total_keys,
    COUNT(*) FILTER (WHERE is_active = true) as active_keys,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_keys,
    MIN(created_at) as first_key_created,
    MAX(created_at) as last_key_created,
    MAX(last_used_at) as last_used
FROM public.issuer_keys
GROUP BY issuer_id;

-- Step 11: Insert sample data for testing (optional)
-- This can be removed in production

-- Step 12: Verification queries
SELECT 
    'issuer_keys' as table_name,
    COUNT(*) as record_count
FROM public.issuer_keys
UNION ALL
SELECT 
    'key_rotations' as table_name,
    COUNT(*) as record_count
FROM public.key_rotations
UNION ALL
SELECT 
    'key_backups' as table_name,
    COUNT(*) as record_count
FROM public.key_backups
UNION ALL
SELECT 
    'document_signatures' as table_name,
    COUNT(*) as record_count
FROM public.document_signatures;

-- Check if indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN ('issuer_keys', 'key_rotations', 'key_backups', 'document_signatures')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('issuer_keys', 'key_rotations', 'key_backups', 'document_signatures')
ORDER BY tablename, policyname;
