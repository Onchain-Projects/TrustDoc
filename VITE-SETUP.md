# TrustDoc Vite Setup Guide

## 🚀 **Vite Project Configuration**

This project has been configured to work with Vite instead of Next.js, keeping the same functionality while maintaining simplicity.

---

## 📁 **Project Structure**

```
trustdoc-vite/
├── src/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── lib/                # Utilities and configurations
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── server.js               # Express API server
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
└── tailwind.config.ts      # Tailwind configuration
```

---

## 🔧 **Environment Variables**

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL="your_supabase_project_url"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"
VITE_SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# Blockchain Configuration
CONTRACT_ADDRESS="0x1253369dab29F77692bF84DB759583ac47F66532"
ALCHEMY_RPC_URL="your_alchemy_rpc_url"
PRIVATE_KEY="your_contract_owner_private_key"

# Server Configuration
PORT=4000
```

---

## 🚀 **Running the Application**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Start Development Server**
```bash
# Start both frontend and backend
npm run dev:full

# Or start them separately:
# Terminal 1 - Backend API server
npm run server

# Terminal 2 - Frontend Vite server
npm run dev
```

### **3. Access the Application**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/api/health

---

## 📋 **Available Scripts**

```bash
# Development
npm run dev          # Start Vite dev server only
npm run server       # Start Express API server only
npm run dev:full     # Start both frontend and backend

# Production
npm run build        # Build for production
npm run preview      # Preview production build

# Utilities
npm run lint         # Run ESLint
```

---

## 🔄 **API Endpoints**

The Express server provides the following endpoints:

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### **Document Management**
- `POST /api/upload` - Upload documents and generate Merkle tree
- `POST /api/upload/confirm` - Confirm blockchain storage and store proof
- `POST /api/verify` - Verify document authenticity

### **Health Check**
- `GET /api/health` - Server health status

---

## 🎯 **Key Features**

### **Frontend (Vite + React)**
- ✅ **Document Issuance**: Single and batch document upload
- ✅ **Document Verification**: Complete verification system
- ✅ **MetaMask Integration**: Real wallet connection
- ✅ **File Upload**: Drag & drop with validation
- ✅ **Real-time Progress**: Upload and transaction status
- ✅ **Responsive Design**: Modern UI with Tailwind CSS

### **Backend (Express + Node.js)**
- ✅ **File Upload**: Multer for file handling
- ✅ **Supabase Integration**: Database and storage
- ✅ **Blockchain Integration**: Real smart contract calls
- ✅ **Merkle Trees**: Cryptographic proof generation
- ✅ **Authentication**: User management system
- ✅ **CORS Support**: Cross-origin requests

---

## 🔐 **Security Features**

- **File Validation**: Size and type checking
- **Private Storage**: Supabase private buckets
- **Blockchain Verification**: Real contract interactions
- **Digital Signatures**: ECDSA signature verification
- **Access Control**: RLS policies for data security

---

## 📊 **Supported File Formats**

- **Documents**: PDF, DOC, DOCX, TXT, XLS, XLSX
- **Images**: JPG, JPEG, PNG
- **Size Limits**: 10MB per file, 20 files maximum

---

## 🚀 **Deployment**

### **Development**
```bash
npm run dev:full
```

### **Production Build**
```bash
npm run build
npm run preview
```

### **Server Deployment**
The Express server can be deployed to any Node.js hosting service:
- **Vercel**: Serverless functions
- **Railway**: Full-stack deployment
- **Heroku**: Traditional hosting
- **DigitalOcean**: VPS deployment

---

## 🎉 **Ready to Use**

The TrustDoc application is now configured as a Vite project with:

✅ **Simple Setup**: No complex Next.js configuration
✅ **Fast Development**: Vite's lightning-fast HMR
✅ **Full Functionality**: All features working
✅ **Real Blockchain**: Actual smart contract integration
✅ **File Upload**: Complete document management
✅ **Production Ready**: Optimized for deployment

**Start developing with: `npm run dev:full`** 🚀
