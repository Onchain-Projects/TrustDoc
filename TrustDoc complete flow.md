# TrustDoc - Complete Project Flow Documentation (A-Z)

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Smart Contract Functions](#smart-contract-functions)
4. [Backend API Flow](#backend-api-flow)
5. [Frontend User Flows](#frontend-user-flows)
6. [Complete A-Z Process Flows](#complete-a-z-process-flows)
7. [Database Schema](#database-schema)
8. [Security & Authentication](#security--authentication)
9. [File Storage & Management](#file-storage--management)
10. [Blockchain Integration](#blockchain-integration)
11. [Error Handling & Validation](#error-handling--validation)
12. [Deployment & Configuration](#deployment--configuration)

---

## Project Overview

TrustDoc is a blockchain-based document authentication and verification system that uses Merkle trees and cryptographic signatures to ensure document integrity and authenticity. The system allows issuers to upload documents, generate cryptographic proofs, and store them on the blockchain for immutable verification.

### Key Features:
- **Document Issuance**: Upload and authenticate documents with cryptographic signatures
- **Merkle Tree Proofs**: Generate efficient proofs for document batches
- **Blockchain Storage**: Store Merkle roots on Polygon Amoy testnet
- **Document Verification**: Verify document authenticity using blockchain and cryptographic proofs
- **Issuer Management**: Register and manage document issuers
- **Owner Controls**: Administrative functions for contract management

---

## System Architecture

### Components:
1. **Frontend (React)**: User interface for document management
2. **Backend (Node.js/Express)**: API server and business logic
3. **Smart Contract (Solidity)**: On-chain document registry
4. **Database (MongoDB)**: Off-chain data storage
5. **File System**: Document storage and management

### Technology Stack:
- **Frontend**: React, Tailwind CSS, Ethers.js
- **Backend**: Node.js, Express, MongoDB, Ethers.js
- **Blockchain**: Polygon Amoy Testnet, Solidity
- **Cryptography**: Merkle Trees, ECDSA Signatures

---

## Smart Contract Functions

### TrustDoc.sol Contract Address: `0x1253369dab29F77692bF84DB759583ac47F66532`

#### Core Functions:

##### 1. Access Control
```solidity
// Worker Management
function addWorker(address addr) public onlyOwner
function isWorker(address addr) public view returns (bool)

// Owner Management
modifier onlyOwner()
modifier onlyWorker()
```

##### 2. Issuer Registration
```solidity
function registerIssuer(string memory issuerId, uint256 pubKey, string memory name) public onlyOwner
```
- **Purpose**: Register new document issuers
- **Parameters**: 
  - `issuerId`: Unique identifier for the issuer
  - `pubKey`: Public key for signature verification
  - `name`: Human-readable issuer name
- **Events**: `IssuerRegistered(string issuerId, string name, address indexed wallet)`

##### 3. Merkle Root Storage
```solidity
function putRoot(bytes32 merkleRoot) public onlyWorker
```
- **Purpose**: Store Merkle roots for document batches
- **Parameters**: `merkleRoot`: 32-byte Merkle root hash
- **Events**: `RootAdded(bytes32 root, uint256 timestamp)`

##### 4. Document Invalidation
```solidity
// Single Document Invalidation
function invalidateDocument(bytes32 docHash, bytes memory signature, string memory issuerId) public onlyOwner

// Batch Invalidation
function invalidateRoot(bytes32 rootHash, bytes memory signature, string memory issuerId) public onlyOwner

// Time Window Invalidation
function invalidateTimeWindow(string memory issuerId, uint256 startTime, uint256 endTime, bytes memory signature) public onlyOwner
```

##### 5. Verification Functions
```solidity
function isInvalidated(bytes32 docHash, bytes32 rootHash, string memory issuerId, uint256 invExpiry, uint256 issuedAt) public view returns (string memory, uint256)
function getIssuerDetails(string memory issuerId) public view returns (string memory, string memory, IssuerPubKey[] memory)
function getRootTimestamp(bytes32 root) public view returns (uint256)
function getWorkers() public view returns (address[] memory)
```

---

## Backend API Flow

### Server Configuration
- **Port**: 4000 (configurable via environment)
- **Framework**: Express.js with ES6 modules
- **Middleware**: CORS, security headers, rate limiting, error handling

### API Endpoints:

#### 1. Authentication Routes (`/login`)
```javascript
POST /login
```
- **Purpose**: Authenticate users (issuers/owners)
- **Request Body**: `{ email, password, wallet? }`
- **Response**: User details and type (issuer/owner)

#### 2. Issuer Registration (`/register`)
```javascript
POST /register
```
- **Purpose**: Register new issuers
- **Request Body**: `{ email, password, issuerWalletAddress, issuerId, name }`
- **Process**:
  1. Validate worker status
  2. Generate signing keypair
  3. Register on-chain
  4. Store in database

#### 3. Document Upload (`/upload`)
```javascript
POST /upload
```
- **Purpose**: Upload documents and generate Merkle proofs
- **Request**: Multipart form data with files
- **Process**:
  1. Hash documents (keccak256)
  2. Build Merkle tree
  3. Return Merkle root for on-chain storage

#### 4. Confirm Root on Chain (`/upload/confirmRootOnChain`)
```javascript
POST /upload/confirmRootOnChain
```
- **Purpose**: Sign and store proof after on-chain confirmation
- **Request Body**: `{ issuerId, batch, merkleRoot, files, expiryDate, description }`
- **Process**:
  1. Verify root exists on-chain
  2. Sign Merkle root with issuer's private key
  3. Store complete proof in database

#### 5. Document Verification (`/verify`)
```javascript
POST /verify
POST /verify/json
```
- **Purpose**: Verify document authenticity
- **Process**:
  1. Hash uploaded document
  2. Find matching proof in database
  3. Verify Merkle proof
  4. Check on-chain root existence
  5. Verify issuer signature

#### 6. Proof Download (`/download-proof/:issuerId/:batch`)
```javascript
GET /download-proof/:issuerId/:batch
```
- **Purpose**: Download proof JSON file
- **Response**: Proof file or database record

#### 7. Issuer Management (`/issuer`)
```javascript
GET /issuer/:issuerId
GET /issuer/:issuerId/documents
POST /issuer/privateKey
```
- **Purpose**: Retrieve issuer information and documents

---

## Frontend User Flows

### 1. Home Page (`HomePage.jsx`)
- **Purpose**: Landing page with navigation options
- **Features**: 
  - Document verification
  - Issuer registration/login
  - Owner dashboard access

### 2. Issuer Registration (`RegisterIssuer.jsx`)
- **Purpose**: Register new issuers or login existing ones
- **Process**:
  1. Fill registration form
  2. Connect MetaMask wallet
  3. Submit to backend
  4. Redirect to dashboard

### 3. Issuer Dashboard (`UploadDocs.js`)
- **Purpose**: Main interface for document management
- **Features**:
  - Document upload (single/batch)
  - Document listing and management
  - Proof download
  - Batch details view

### 4. Document Verification (`VerifyDoc.js`)
- **Purpose**: Verify document authenticity
- **Methods**:
  - File upload verification
  - Manual signature verification
- **Features**:
  - Drag-and-drop file upload
  - Verification results modal
  - Transaction hash display

### 5. Owner Dashboard (`OwnerDashboard.js`)
- **Purpose**: Administrative interface for contract owners
- **Features**:
  - Worker management
  - Document invalidation
  - Contract settings
  - System overview

---

## Complete A-Z Process Flows

### A. Issuer Registration Flow

#### Step 1: User Registration Request
1. User visits registration page
2. Fills form with:
   - Email and password
   - Issuer name
   - MetaMask wallet address
3. Connects MetaMask wallet

#### Step 2: Backend Processing
1. **Validate Worker Status** (`registerIssuer.js:25-28`)
   ```javascript
   const isWorker = await contract.isWorker(issuerWalletAddress);
   if (!isWorker) {
     return res.status(403).json({ error: 'Provided wallet address is not a registered worker.' });
   }
   ```

2. **Generate Signing Keypair** (`registerIssuer.js:30-34`)
   ```javascript
   const signingWallet = ethers.Wallet.createRandom();
   const privateKey = signingWallet.privateKey;
   const publicKey = signingWallet.publicKey;
   const address = signingWallet.address;
   ```

3. **Register On-Chain** (`registerIssuer.js:37-40`)
   ```javascript
   const { contract: ownerContract } = getContractInstance(true);
   const tx = await ownerContract.registerIssuer(issuerId, address, name);
   await tx.wait();
   ```

4. **Store in Database** (`registerIssuer.js:42-52`)
   ```javascript
   await Issuer.create({ 
     email, password, address, issuerId, name,
     publicKey, privateKey, metaMaskAddress: issuerWalletAddress
   });
   ```

#### Step 3: Response and Redirect
1. Return success response with issuer details
2. Frontend stores issuer ID in localStorage
3. Redirect to issuer dashboard

### B. Document Issuance Flow

#### Step 1: Document Upload
1. **Frontend Upload** (`UploadDocs.js:121-170`)
   - User selects files (single or batch)
   - Fills metadata (description, expiry date)
   - Submits form

2. **Backend Processing** (`uploadDocs.js:39-135`)
   - Receives files via multer
   - Hashes each file using keccak256
   - Builds Merkle tree from hashes
   - Returns Merkle root

#### Step 2: On-Chain Storage
1. **Frontend Blockchain Interaction** (`UploadDocs.js:171-243`)
   - Connects to MetaMask
   - Switches to Polygon Amoy network
   - Calls `putRoot(merkleRoot)` on smart contract
   - Waits for transaction confirmation

2. **Smart Contract Execution** (`TrustDoc.sol:81-85`)
   ```solidity
   function putRoot(bytes32 merkleRoot) public onlyWorker {
       require(roots_map[merkleRoot] == 0, "Root already exists");
       roots_map[merkleRoot] = block.timestamp;
       emit RootAdded(merkleRoot, block.timestamp);
   }
   ```

#### Step 3: Proof Generation and Storage
1. **Backend Confirmation** (`uploadDocs.js:144-243`)
   - Verifies root exists on-chain
   - Fetches issuer's private key
   - Signs Merkle root
   - Stores complete proof in database

2. **Database Storage** (`uploadDocs.js:199-234`)
   ```javascript
   const newProofForDb = {
     issuer_id: issuerId,
     batch: batch,
     merkle_root: merkleRoot,
     signature: signature,
     proof_json: {
       proofs: [{
         merkleRoot, leaves, files, proofs, signature, timestamp
       }],
       network, explorerUrl, issuerPublicKey
     }
   };
   ```

### C. Document Verification Flow

#### Step 1: Document Submission
1. **File Upload** (`VerifyDoc.js:59-111`)
   - User uploads document file
   - Frontend sends to `/verify` endpoint

2. **Backend Processing** (`verifyDoc.js:119-414`)
   - Hashes uploaded document
   - Searches for matching proof in database
   - Finds document in Merkle tree

#### Step 2: Proof Verification
1. **Merkle Proof Verification** (`verifyDoc.js:222-261`)
   ```javascript
   const tree = new MerkleTree(leavesBuf, sha256, { sortPairs: true });
   const isValidProof = tree.verify(proofForDoc, leafBuffer, rootBuffer);
   ```

2. **On-Chain Verification** (`verifyDoc.js:263-273`)
   ```javascript
   const exists = await contract.roots_map(rootHex);
   if (!exists || exists.toString() === '0') {
     return res.status(400).json({ success: false, message: 'Merkle root not found on-chain.' });
   }
   ```

3. **Signature Verification** (`verifyDoc.js:275-346`)
   ```javascript
   const merkleRootBytes = ethers.getBytes(docProof.merkleRoot);
   const msgHash = ethers.hashMessage(merkleRootBytes);
   const recovered = ethers.recoverAddress(msgHash, docProof.signature);
   const issuerAddress = ethers.computeAddress(issuerDoc.publicKey);
   ```

#### Step 3: Response Generation
1. **Verification Result** (`verifyDoc.js:393-408`)
   ```javascript
   const responseData = { 
     valid: isValidProof, 
     issuerId, batch, onChainRoot: exists.toString(),
     issuerName, transactionHash, explorerUrl,
     fileName: req.file.originalname,
     issueDate: proofDoc?.created_at
   };
   ```

2. **Frontend Display** (`VerifyDoc.js:328-337`)
   - Shows verification modal
   - Displays issuer information
   - Shows transaction details

### D. Owner Management Flow

#### Step 1: Owner Authentication
1. **Login Process** (`login.js:6-67`)
   - Owner provides email, password, and wallet address
   - Backend validates against Owner collection
   - Verifies wallet address matches

#### Step 2: Worker Management
1. **Add Worker** (`AddWorker.jsx`)
   - Owner connects wallet
   - Calls `addWorker(address)` on smart contract
   - Updates worker list

2. **Smart Contract Execution** (`TrustDoc.sol:56-59`)
   ```solidity
   function addWorker(address addr) public onlyOwner {
       require(!isWorker(addr), "Already a worker");
       workers.push(addr);
   }
   ```

#### Step 3: Document Invalidation
1. **Single Document Invalidation** (`InvalidateDoc.js`)
   - Owner provides document hash
   - Calls `invalidateDocument()` on smart contract

2. **Batch Invalidation** (`InvalidateRoot.js`)
   - Owner provides Merkle root
   - Calls `invalidateRoot()` on smart contract

---

## Database Schema

### MongoDB Collections:

#### 1. Issuers Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String,
  address: String, // Signing wallet address
  issuerId: String (unique),
  name: String,
  publicKey: String, // 65-byte uncompressed public key
  privateKey: String, // Private key for signing
  metaMaskAddress: String, // MetaMask wallet address
  createdAt: Date
}
```

#### 2. Proofs Collection
```javascript
{
  _id: ObjectId,
  issuer_id: String,
  batch: String,
  merkle_root: String,
  signature: String, // Issuer's signature of Merkle root
  proof_json: {
    proofs: [{
      merkleRoot: String,
      leaves: [String], // Document hashes
      files: [String], // File names
      proofs: [String], // Merkle proofs for each document
      signature: String,
      timestamp: String
    }],
    network: String,
    explorerUrl: String,
    issuerPublicKey: String
  },
  created_at: Date,
  expiry_date: Date,
  description: String
}
```

#### 3. Owners Collection
```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String,
  address: String, // Contract owner address
  name: String,
  createdAt: Date
}
```

---

## Security & Authentication

### 1. Access Control
- **Owner-Only Functions**: Contract management, worker addition, invalidation
- **Worker-Only Functions**: Document upload, Merkle root storage
- **Public Functions**: Document verification, issuer lookup

### 2. Key Management
- **Signing Keys**: Generated per issuer, stored in database
- **MetaMask Integration**: For blockchain transactions
- **Private Key Security**: Stored in database, used for signing

### 3. Input Validation
- **File Validation**: Size limits, type checking
- **Data Sanitization**: Input cleaning and validation
- **Rate Limiting**: API request throttling

### 4. Error Handling
- **Middleware Stack**: Comprehensive error handling
- **Validation Errors**: Input validation failures
- **Blockchain Errors**: Transaction failures
- **Security Errors**: Unauthorized access attempts

---

## File Storage & Management

### 1. File Upload Process
- **Multer Configuration**: 10MB limit, 20 files max
- **Temporary Storage**: Files stored in temp directory initially
- **Permanent Storage**: Moved to `uploads/{issuerId}/{batch}/`
- **File Naming**: Original filenames preserved

### 2. File Organization
```
uploads/
├── ISSUER_15a70815/
│   ├── 2025/
│   │   ├── document1.pdf
│   │   └── document2.pdf
│   └── batch_2024/
│       ├── file1.pdf
│       └── file2.pdf
└── ISSUER_33a15992/
    └── 1/
        └── certificate.pdf
```

### 3. Proof Storage
- **Database**: Complete proof objects in MongoDB
- **File System**: Optional proof.json files
- **Backup**: Both database and file system storage

---

## Blockchain Integration

### 1. Network Configuration
- **Network**: Polygon Amoy Testnet
- **Chain ID**: 80002 (0x13882)
- **RPC URL**: https://rpc-amoy.polygon.technology
- **Explorer**: https://amoy.polygonscan.com

### 2. Gas Management
- **Gas Estimation**: Dynamic gas calculation
- **Gas Settings**: Predefined gas configurations
- **Error Handling**: Gas-related error recovery

### 3. Transaction Management
- **Pending Transactions**: Clearing stuck transactions
- **Retry Logic**: Multiple gas setting attempts
- **Confirmation Waiting**: Transaction receipt verification

### 4. Contract Interaction
- **Ethers.js**: Blockchain interaction library
- **ABI Integration**: Contract function calls
- **Event Listening**: Smart contract event monitoring

---

## Error Handling & Validation

### 1. Backend Error Middleware
```javascript
// Error handling stack
app.use(validationErrorHandler);
app.use(mongoErrorHandler);
app.use(fileUploadErrorHandler);
app.use(blockchainErrorHandler);
app.use(rateLimitErrorHandler);
app.use(securityErrorHandler);
app.use(productionErrorHandler);
```

### 2. Validation Functions
- **File Upload Validation**: Size, type, count limits
- **Request Validation**: Required fields, data types
- **Merkle Root Validation**: Format and existence checks
- **Signature Validation**: Cryptographic signature verification

### 3. Error Types
- **Validation Errors**: Input validation failures
- **MongoDB Errors**: Database operation failures
- **Blockchain Errors**: Smart contract interaction failures
- **File Upload Errors**: File processing failures
- **Rate Limit Errors**: API throttling violations
- **Security Errors**: Unauthorized access attempts

---

## Deployment & Configuration

### 1. Environment Variables
```bash
# Required
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=0x1253369dab29F77692bF84DB759583ac47F66532
MONGODB_URI=mongodb://localhost:27017/trustdoc

# Optional
PORT=4000
NODE_ENV=development
ALCHEMY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
RPC_URL=https://rpc-amoy.polygon.technology
```

### 2. Backend Deployment
```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode
NODE_ENV=development npm start
```

### 3. Frontend Deployment
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### 4. Database Setup
```bash
# MongoDB connection
mongodb://localhost:27017/trustdoc

# Collections will be created automatically
# - issuers
# - proofs  
# - owners
```

### 5. Smart Contract Deployment
- **Network**: Polygon Amoy Testnet
- **Contract Address**: 0x1253369dab29F77692bF84DB759583ac47F66532
- **ABI**: Available in `backend/utils/TrustDocABI.json`

---

## Summary

TrustDoc provides a complete blockchain-based document authentication system with the following key flows:

1. **Issuer Registration**: Generate keys, register on-chain, store in database
2. **Document Issuance**: Upload files, create Merkle tree, store root on-chain, sign and store proof
3. **Document Verification**: Hash document, verify Merkle proof, check on-chain root, verify signature
4. **Owner Management**: Manage workers, invalidate documents, control contract settings

The system ensures document integrity through cryptographic proofs, blockchain immutability, and comprehensive verification processes. All components work together to provide a secure, transparent, and efficient document authentication platform.

---

*This documentation covers the complete A-Z flow of the TrustDoc project, including all smart contract functions, backend API endpoints, frontend components, and system processes.*
