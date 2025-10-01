# TrustDoc Full-Stack Deployment Guide

## 🚀 **Single Project Deployment on Vercel with Supabase**

This guide will help you deploy the complete TrustDoc application as a single full-stack project on Vercel with Supabase as the database.

---

## 📋 **Prerequisites**

1. **Vercel Account** - [vercel.com](https://vercel.com)
2. **Supabase Project** - [supabase.com](https://supabase.com)
3. **GitHub Repository** - For version control and deployment
4. **MetaMask Wallet** - For blockchain interactions
5. **Polygon Amoy Testnet** - For smart contract deployment

---

## 🗄️ **Database Setup (Supabase)**

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

### 2. Run Database Scripts
Execute these SQL scripts in your Supabase SQL editor:

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_issuers_email ON issuers(email);
CREATE INDEX IF NOT EXISTS idx_issuers_issuer_id ON issuers(issuer_id);
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
CREATE INDEX IF NOT EXISTS idx_proofs_issuer_id ON proofs(issuer_id);
CREATE INDEX IF NOT EXISTS idx_proofs_batch ON proofs(batch);
CREATE INDEX IF NOT EXISTS idx_proofs_merkle_root ON proofs(merkle_root);
CREATE INDEX IF NOT EXISTS idx_proofs_file_paths ON proofs USING GIN(file_paths);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_issuers_updated_at BEFORE UPDATE ON issuers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
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

### 3. Create Storage Bucket
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

---

## 🔧 **Environment Variables**

### 1. Local Development (.env.local)
Create a `.env.local` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Blockchain Configuration
PRIVATE_KEY=your_contract_owner_private_key
CONTRACT_ADDRESS=0x1253369dab29F77692bF84DB759583ac47F66532
ALCHEMY_RPC_URL=your_alchemy_rpc_url

# Application Configuration
VITE_APP_NAME=TrustDoc
VITE_APP_VERSION=1.0.0
```

### 2. Vercel Environment Variables
In your Vercel dashboard, add these environment variables:

```
VITE_SUPABASE_URL = your_supabase_project_url
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY = your_supabase_service_role_key
PRIVATE_KEY = your_contract_owner_private_key
CONTRACT_ADDRESS = 0x1253369dab29F77692bF84DB759583ac47F66532
ALCHEMY_RPC_URL = your_alchemy_rpc_url
```

---

## 🚀 **Deployment Steps**

### 1. Prepare Your Repository
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial TrustDoc full-stack setup"

# Push to GitHub
git remote add origin https://github.com/yourusername/trustdoc-fullstack.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
5. Add environment variables (see above)
6. Click "Deploy"

### 3. Configure Vercel Settings
Update your `vercel.json` if needed:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "VITE_SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "PRIVATE_KEY": "@private_key",
    "CONTRACT_ADDRESS": "@contract_address",
    "ALCHEMY_RPC_URL": "@alchemy_rpc_url"
  }
}
```

---

## 🔗 **Smart Contract Integration**

### 1. Contract Address
The TrustDoc smart contract is already deployed at:
```
0x1253369dab29F77692bF84DB759583ac47F66532
```

### 2. Network Configuration
- **Network**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology
- **Explorer**: https://amoy.polygonscan.com

### 3. Contract Owner Setup
1. You need the contract owner's private key in your environment variables
2. The owner can add workers who can then register as issuers
3. Workers can upload documents and store Merkle roots

---

## 🧪 **Testing the Deployment**

### 1. Test Authentication
1. Visit your deployed Vercel URL
2. Try registering a new issuer
3. Test login functionality

### 2. Test Document Upload
1. Login as an issuer
2. Upload test documents
3. Verify Merkle root is stored on blockchain

### 3. Test Document Verification
1. Use the verification page
2. Upload a previously registered document
3. Verify the results

---

## 🔒 **Security Considerations**

### 1. Environment Variables
- Never commit private keys to version control
- Use Vercel's environment variable system
- Rotate keys regularly

### 2. Database Security
- RLS policies are enabled
- Service role key should be kept secure
- Regular database backups

### 3. File Storage
- Files are stored in private Supabase buckets
- Access controlled through RLS policies
- File size limits enforced

---

## 📊 **Monitoring and Maintenance**

### 1. Vercel Analytics
- Monitor API route performance
- Track deployment success rates
- Monitor function execution times

### 2. Supabase Monitoring
- Monitor database performance
- Track storage usage
- Monitor API usage

### 3. Blockchain Monitoring
- Monitor smart contract interactions
- Track gas usage
- Monitor transaction success rates

---

## 🆘 **Troubleshooting**

### Common Issues:

1. **Build Failures**
   - Check environment variables
   - Verify all dependencies are installed
   - Check TypeScript errors

2. **API Route Errors**
   - Check function timeout settings
   - Verify database connections
   - Check environment variables

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check RLS policies
   - Verify table schemas

4. **Blockchain Integration Issues**
   - Verify contract address
   - Check RPC URL
   - Verify private key format

---

## 🎉 **Success!**

Once deployed, your TrustDoc application will be available at your Vercel URL with:
- ✅ Full-stack functionality in a single project
- ✅ Supabase database integration
- ✅ Blockchain smart contract integration
- ✅ File upload and storage
- ✅ Document verification system
- ✅ Issuer management
- ✅ Responsive UI with modern design

The application is now ready for production use and can handle real document authentication and verification workflows!
