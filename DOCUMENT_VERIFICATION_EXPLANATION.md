# Document Verification Process in TrustDoc

## Overview
TrustDoc uses a **Merkle Tree + Blockchain** approach for document verification. Here's how it works:

## 1. Document Issuance Process

### Step 1: File Upload
- User uploads document(s) (PDF, DOC, JPG, etc.)
- Each file is hashed using SHA-256
- File hash: `0xe45def1ceb5c42ddbca506308922fa84ed96cb923e68028e4680b2cd66e6034a`

### Step 2: Merkle Tree Generation
- All file hashes are combined into a Merkle Tree
- Merkle Root: `0xe45def1ceb5c42ddbca506308922fa84ed96cb923e68028e4680b2cd66e6034a`
- This root represents the entire batch of documents

### Step 3: Blockchain Anchoring
- Merkle Root is stored on Polygon Amoy blockchain
- Transaction Hash: `0x0fadf9ee7257391693883d4d4986582034f2c67f07c5d64016c3aead037f0f15`
- This creates an immutable timestamp and proof

### Step 4: Database Storage
- Proof data stored in Supabase `proofs` table:
  ```json
  {
    "id": "uuid",
    "issuer_id": "issuer_1758885129891_e8y0gja8a",
    "batch": "batch_1759142872371_issuer_1758885129891_e8y0gja8a",
    "merkle_root": "0xe45def1ceb5c42ddbca506308922fa84ed96cb923e68028e4680b2cd66e6034a",
    "proof_json": {
      "documentName": "Nursery DB Relations.docx",
      "description": "...",
      "txHash": "0x0fadf9ee7257391693883d4d4986582034f2c67f07c5d64016c3aead037f0f15",
      "fileHashes": ["0xe45def1ceb5c42ddbca506308922fa84ed96cb923e68028e4680b2cd66e6034a"],
      "issuedAt": "2025-01-29T..."
    },
    "file_paths": ["uploads/batch_.../0_Nursery DB Relations.docx"],
    "expiry_date": null,
    "description": null,
    "created_at": "2025-01-29T..."
  }
  ```

## 2. Document Verification Process

### Method 1: File Upload Verification
1. **User uploads document** to verify
2. **Generate file hash** using SHA-256
3. **Search database** for matching Merkle Root
4. **Check blockchain** to confirm the root exists
5. **Verify timestamp** and issuer details

### Method 2: Merkle Root Verification
1. **User provides Merkle Root** (from QR code, etc.)
2. **Check database** for proof record
3. **Verify on blockchain** that root exists
4. **Return verification result** with document details

## 3. Technical Implementation

### File Hash Generation
```typescript
const generateFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `0x${hashHex}`
}
```

### Merkle Tree Creation
```typescript
class SimpleMerkleTree {
  constructor(leaves: string[]) {
    this.leaves = leaves
    this.tree = [leaves]
    this.buildTree()
  }
  
  private buildTree() {
    // Combine pairs of hashes using keccak256
    // Continue until single root hash remains
  }
}
```

### Blockchain Verification
```typescript
// Check if Merkle Root exists on blockchain
const rootExists = await contract.getRootTimestamp(merkleRoot)
if (rootExists > 0) {
  // Document is verified on blockchain
}
```

## 4. Security Features

### Immutability
- **Blockchain**: Merkle Root cannot be changed once stored
- **Timestamp**: Exact time of issuance is recorded
- **Hash Integrity**: Any change to document changes the hash

### Verification Chain
1. **File Hash** → **Merkle Root** → **Blockchain Transaction** → **Database Record**
2. Each step can be independently verified
3. Tampering at any level breaks the chain

### Access Control
- **Workers Only**: Only registered workers can store Merkle Roots
- **Issuer Authentication**: Only authenticated issuers can issue documents
- **Public Verification**: Anyone can verify documents using the public interface

## 5. Current Issues & Solutions

### Dashboard Not Showing Documents
**Problem**: Documents stored in database but not appearing in dashboard
**Cause**: Likely issuer_id mismatch or data fetching issue
**Solution**: Added debugging logs to identify the issue

### Verification Not Working
**Problem**: Verification page uses mock data instead of real verification
**Solution**: Need to implement real verification logic using the document service

## 6. Next Steps

1. **Fix Dashboard**: Debug why documents aren't loading
2. **Implement Real Verification**: Replace mock verification with actual logic
3. **Add QR Code Support**: Generate QR codes with Merkle Roots
4. **Enhance UI**: Better error handling and user feedback
5. **Add Batch Verification**: Support for verifying multiple documents

## 7. Database Schema

### Proofs Table
```sql
CREATE TABLE proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id TEXT NOT NULL,
  batch TEXT NOT NULL,
  merkle_root TEXT NOT NULL UNIQUE,
  proof_json JSONB NOT NULL,
  file_paths TEXT[] NOT NULL,
  expiry_date TIMESTAMP,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Issuers Table
```sql
CREATE TABLE issuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  issuer_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  public_key TEXT,
  meta_mask_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

This system provides **cryptographic proof** of document authenticity and **blockchain immutability** for tamper-proof verification.
