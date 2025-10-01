# TrustDoc - Blockchain Document Management Platform

TrustDoc is a comprehensive blockchain-based document management platform that provides secure document issuance, verification, and management using advanced cryptographic techniques and blockchain technology.

## 🚀 Features

### Core Functionality
- **Document Issuance**: Issue single documents or batch process multiple documents
- **Batch Extension**: Add more documents to existing batches with the same name
- **Document Verification**: Multiple verification methods including QR codes, file upload, and manual input
- **Blockchain Integration**: Real transactions on Polygon Amoy testnet
- **Cryptographic Security**: ECDSA/RSA key generation and document signing

### Advanced Features
- **Multi-Role System**: Separate interfaces for Issuers and Owners
- **Key Management**: Cryptographic key generation, rotation, backup, and recovery
- **File Support**: PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX formats
- **Merkle Tree Processing**: Efficient batch verification using Merkle trees
- **Real-time Blockchain**: MetaMask integration with gas estimation

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, Radix UI, Shadcn/ui
- **Blockchain**: Ethereum (Polygon Amoy testnet), ethers.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Cryptography**: Node.js crypto module (ECDSA/RSA)
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask wallet
- Supabase account
- Polygon Amoy testnet access

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/seenu1852/trustdoc.git
cd trustdoc
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Blockchain Configuration
VITE_CONTRACT_ADDRESS=0x1253369dab29F77692bF84DB759583ac47F66532
VITE_ALCHEMY_RPC_URL=https://rpc-amoy.polygon.technology
VITE_PRIVATE_KEY=your_private_key_here
```

### 4. Database Setup
Run the database migration scripts in your Supabase dashboard:
- `database-migration-safe.sql` - Basic schema setup
- `database-key-management-migration.sql` - Cryptographic key management

### 5. Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🏗️ Build for Production

```bash
npm run build
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
# Upload dist/ folder to your hosting provider
```

## 📖 Usage Guide

### For Issuers
1. **Register**: Create an issuer account
2. **Connect Wallet**: Connect MetaMask to Polygon Amoy
3. **Issue Documents**: Upload single or batch documents
4. **Manage Keys**: Rotate, backup, and manage cryptographic keys
5. **Track Documents**: Monitor issued documents in dashboard

### For Owners
1. **Register**: Create an owner account
2. **Verify Documents**: Use QR codes, file upload, or manual input
3. **View History**: Track verification history
4. **Export Data**: Download verification records

## 🔐 Security Features

- **Real Cryptographic Keys**: ECDSA/RSA key generation
- **Document Signing**: Cryptographic document signatures
- **Key Management**: Secure key storage and rotation
- **Blockchain Security**: Immutable document records
- **Role-Based Access**: Secure multi-role architecture

## 📊 Database Schema

### Core Tables
- `issuers` - Issuer information and keys
- `owners` - Owner information
- `proofs` - Document proofs and metadata
- `issuer_keys` - Cryptographic key storage
- `document_signatures` - Document signing records
- `owner_verifications` - Verification history

## 🔧 API Endpoints

### Document Management
- `POST /api/upload` - Upload and process documents
- `GET /api/verify` - Verify document authenticity
- `GET /api/proofs` - Retrieve document proofs

### Key Management
- `POST /api/keys/generate` - Generate new key pairs
- `POST /api/keys/rotate` - Rotate cryptographic keys
- `GET /api/keys/backup` - Backup key data

## 🧪 Testing

### Cryptographic Tests
Open `test-crypto.html` in your browser to test cryptographic functionality.

### Blockchain Tests
1. Connect MetaMask to Polygon Amoy testnet
2. Ensure you have testnet MATIC tokens
3. Test document issuance and verification

## 📈 Performance

- **Batch Processing**: Efficient Merkle tree implementation
- **File Upload**: Support for files up to 10MB
- **Batch Limits**: Up to 20 files per batch (extensible)
- **Verification**: Sub-second document verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the FAQ section

## 🔗 Links

- **Live Demo**: [Deployed on Vercel]
- **Documentation**: [GitHub Wiki]
- **Issues**: [GitHub Issues]

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-chain support
- [ ] API rate limiting
- [ ] Advanced key management
- [ ] Document templates
- [ ] Bulk verification tools

---

**TrustDoc** - Secure, Transparent, Blockchain-Powered Document Management