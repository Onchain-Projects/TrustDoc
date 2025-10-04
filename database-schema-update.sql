-- Update issuers table to include approval system
ALTER TABLE issuers 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES owners(id),
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Create owner verification history table
CREATE TABLE IF NOT EXISTS owner_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES owners(id),
    document_hash VARCHAR(255) NOT NULL,
    merkle_root VARCHAR(255) NOT NULL,
    verification_result BOOLEAN NOT NULL,
    verification_date TIMESTAMPTZ DEFAULT NOW(),
    issuer_id VARCHAR(255),
    document_name VARCHAR(255),
    verification_method VARCHAR(50) DEFAULT 'manual' CHECK (verification_method IN ('qr_code', 'manual', 'file_upload'))
);

-- Create issuer approval history table for audit trail
CREATE TABLE IF NOT EXISTS issuer_approval_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issuer_id VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES owners(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject')),
    approval_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issuers_approval_status ON issuers(is_approved);
CREATE INDEX IF NOT EXISTS idx_issuers_approved_by ON issuers(approved_by);
CREATE INDEX IF NOT EXISTS idx_owner_verifications_owner_id ON owner_verifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_verifications_document_hash ON owner_verifications(document_hash);
CREATE INDEX IF NOT EXISTS idx_issuer_approval_history_issuer_id ON issuer_approval_history(issuer_id);
CREATE INDEX IF NOT EXISTS idx_issuer_approval_history_owner_id ON issuer_approval_history(owner_id);

-- Add blockchain_address to link with smart contract
ALTER TABLE issuers 
ADD COLUMN IF NOT EXISTS blockchain_address VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS blockchain_registration_tx VARCHAR(255),
ADD COLUMN IF NOT EXISTS worker_addition_tx VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issuers_blockchain_address ON issuers(blockchain_address);
CREATE INDEX IF NOT EXISTS idx_issuers_blockchain_registration_tx ON issuers(blockchain_registration_tx);
CREATE INDEX IF NOT EXISTS idx_issuers_worker_addition_tx ON issuers(worker_addition_tx);

-- Update existing issuers to be pending approval
UPDATE issuers SET is_approved = FALSE WHERE is_approved IS NULL;
