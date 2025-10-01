# Supabase Integration Setup

This document explains how to set up and configure Supabase integration for the TrustDoc application.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
VITE_APP_NAME=TrustDoc
VITE_APP_VERSION=1.0.0

# Blockchain Configuration (optional)
VITE_POLYGON_RPC_URL=your_polygon_rpc_url
VITE_CONTRACT_ADDRESS=your_contract_address
```

## Database Setup

### 1. Run the SQL Scripts

Execute the following SQL scripts in your Supabase SQL editor:

#### Core Tables
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Issuers Table
CREATE TABLE IF NOT EXISTS issuers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    issuer_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    meta_mask_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Owners Table
CREATE TABLE IF NOT EXISTS owners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proofs Table
CREATE TABLE IF NOT EXISTS proofs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    issuer_id VARCHAR(255) NOT NULL,
    batch VARCHAR(255) NOT NULL,
    merkle_root VARCHAR(255) NOT NULL,
    proof_json JSONB NOT NULL,
    signature TEXT,
    file_paths TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    description TEXT
);
```

#### Indexes
```sql
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_issuers_email ON issuers(email);
CREATE INDEX IF NOT EXISTS idx_issuers_issuer_id ON issuers(issuer_id);
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
CREATE INDEX IF NOT EXISTS idx_proofs_issuer_id ON proofs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_proofs_batch ON proofs(batch);
CREATE INDEX IF NOT EXISTS idx_proofs_merkle_root ON proofs(merkle_root);
CREATE INDEX IF NOT EXISTS idx_proofs_file_paths ON proofs USING GIN(file_paths);
```

#### Triggers
```sql
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_issuers_updated_at BEFORE UPDATE ON issuers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Row Level Security (RLS)

```sql
-- Enable Row Level Security
ALTER TABLE issuers ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all operations for authenticated users" ON issuers
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON owners
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON proofs
    FOR ALL USING (true);
```

### 3. Storage Configuration

```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10MB file size limit
  ARRAY[
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'text/plain', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
);

-- Storage RLS Policies
CREATE POLICY "Service role can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Service role can view files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Service role can delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Public read access for verification" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents'
);
```

## Features Implemented

### Authentication
- ✅ User registration (issuers and owners)
- ✅ User login/logout
- ✅ Session management
- ✅ Profile management

### Document Management
- ✅ File upload to Supabase Storage
- ✅ Document proof creation
- ✅ Document verification
- ✅ Document search and filtering
- ✅ Document deletion

### Database Integration
- ✅ Supabase client configuration
- ✅ TypeScript types for database schema
- ✅ Custom hooks for data management
- ✅ Error handling and loading states

## Usage

1. Set up your Supabase project and run the SQL scripts
2. Configure your environment variables
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`

## Security Notes

- Passwords are stored in plain text in this implementation. In production, implement proper password hashing.
- Private keys are stored in the database. Consider using more secure key management solutions.
- The service role key should be kept secure and only used server-side.

## Next Steps

- Implement proper password hashing
- Add email verification
- Implement proper cryptographic key generation
- Add blockchain integration for document anchoring
- Add document expiration handling
- Implement proper file validation and security
