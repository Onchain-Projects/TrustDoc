# TrustDoc Deployment Guide

This guide will help you deploy TrustDoc to Vercel and set up the GitHub repository.

## 🚀 Step-by-Step Deployment Process

### 1. Prepare the Project

The project is already configured for Vercel deployment with:
- ✅ `vercel.json` configuration file
- ✅ Updated `package.json` with proper build scripts
- ✅ Environment variables configuration
- ✅ `.gitignore` file for clean repository

### 2. Create GitHub Repository

#### Option A: Using GitHub CLI (Recommended)
```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Create new repository
gh repo create seenu1852/trustdoc --public --description "TrustDoc - Blockchain Document Management Platform"

# Initialize git and push
git init
git add .
git commit -m "Initial commit: TrustDoc blockchain document management platform"
git branch -M main
git remote add origin https://github.com/seenu1852/trustdoc.git
git push -u origin main
```

#### Option B: Using GitHub Web Interface
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Repository name: `trustdoc`
4. Description: `TrustDoc - Blockchain Document Management Platform`
5. Set to Public
6. Click "Create repository"
7. Follow the instructions to push your code

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: trustdoc
# - Directory: ./
# - Override settings? No
```

#### Option B: Using Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub: `seenu1852/trustdoc`
4. Configure project:
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 4. Configure Environment Variables

In Vercel Dashboard, go to your project settings and add these environment variables:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
VITE_CONTRACT_ADDRESS=0x1253369dab29F77692bF84DB759583ac47F66532
VITE_ALCHEMY_RPC_URL=https://rpc-amoy.polygon.technology
VITE_PRIVATE_KEY=your_private_key_here
```

### 5. Database Setup

1. **Create Supabase Project**:
   - Go to [Supabase](https://supabase.com)
   - Create new project
   - Note down your project URL and API keys

2. **Run Database Migrations**:
   - Go to Supabase SQL Editor
   - Run `database-migration-safe.sql` first
   - Then run `database-key-management-migration.sql`

3. **Configure Row Level Security (RLS)**:
   - Enable RLS on all tables
   - Set up proper policies for your use case

### 6. Blockchain Configuration

1. **Smart Contract**:
   - Deploy your smart contract to Polygon Amoy testnet
   - Update `VITE_CONTRACT_ADDRESS` with your contract address

2. **MetaMask Setup**:
   - Add Polygon Amoy testnet to MetaMask
   - Get testnet MATIC tokens from faucet

### 7. Final Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy: Add Vercel configuration and deployment files"
   git push origin main
   ```

2. **Vercel Auto-Deploy**:
   - Vercel will automatically deploy when you push to main
   - Check deployment status in Vercel dashboard

3. **Test Deployment**:
   - Visit your Vercel URL
   - Test all functionality
   - Verify blockchain integration

## 🔧 Post-Deployment Configuration

### 1. Domain Setup (Optional)
- Add custom domain in Vercel dashboard
- Configure DNS settings
- Enable SSL certificate

### 2. Performance Optimization
- Enable Vercel Analytics
- Configure caching headers
- Optimize images and assets

### 3. Monitoring
- Set up error tracking
- Monitor performance metrics
- Configure alerts

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version (18+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify Supabase credentials

3. **Database Connection**:
   - Verify Supabase URL and keys
   - Check RLS policies
   - Test database queries

4. **Blockchain Integration**:
   - Verify contract address
   - Check network configuration
   - Ensure MetaMask is connected

### Debug Commands

```bash
# Check build locally
npm run build

# Test production build
npm run preview

# Check for linting errors
npm run lint

# Verify environment variables
echo $VITE_SUPABASE_URL
```

## 📊 Deployment Checklist

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Smart contract deployed
- [ ] Domain configured (optional)
- [ ] SSL certificate enabled
- [ ] Analytics enabled
- [ ] Error tracking configured
- [ ] Performance monitoring set up
- [ ] Documentation updated

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Polygon Amoy Testnet](https://docs.polygon.technology/docs/develop/network-details/amoy/)
- [MetaMask Configuration](https://docs.metamask.io/guide/ethereum-provider.html)

## 📞 Support

If you encounter any issues during deployment:
1. Check the troubleshooting section
2. Review Vercel deployment logs
3. Verify all environment variables
4. Test locally first
5. Create an issue in the GitHub repository

---

**Happy Deploying! 🚀**
