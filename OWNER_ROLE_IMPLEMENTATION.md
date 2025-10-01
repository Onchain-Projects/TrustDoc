# Owner Role Implementation Documentation

## Overview

This document outlines the implementation of a separate login system for the "owner" role in the TrustDoc application. The owner role is designed for document recipients who need to verify documents but do not issue them.

## Key Features

### 1. Separate Authentication Flow
- **Owner Registration**: Owners can register with email, password, name, and address
- **Owner Login**: Separate login flow for owners vs issuers
- **Role-Based Access**: Different UI and functionality based on user role

### 2. Owner-Specific Functionality
- **Document Verification**: Owners can verify documents using Merkle roots or QR codes
- **Document History**: View verification history and status
- **Profile Management**: Manage owner profile information
- **No Issuance Rights**: Owners cannot issue documents

### 3. Database Schema

#### Owners Table
```sql
CREATE TABLE public.owners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Should be hashed in production
    address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Owner Verification History
```sql
CREATE TABLE public.owner_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.owners(id),
    document_hash VARCHAR(255) NOT NULL,
    merkle_root VARCHAR(255) NOT NULL,
    verification_result BOOLEAN NOT NULL,
    verification_date TIMESTAMPTZ DEFAULT NOW(),
    issuer_id VARCHAR(255),
    document_name VARCHAR(255),
    verification_method VARCHAR(50) -- 'qr_code', 'manual', 'file_upload'
);
```

## Implementation Details

### 1. Authentication Service Updates

The authentication service already supports both issuer and owner roles:

```typescript
// In src/lib/auth.ts
export interface SignUpData {
  email: string
  password: string
  name: string
  address: string
  userType: 'issuer' | 'owner'  // Role selection
  // ... other fields
}
```

### 2. Role-Based Routing

The application uses role-based routing to show different interfaces:

```typescript
// In src/contexts/AuthContext.tsx
const userType = user?.user_metadata?.user_type // 'issuer' or 'owner'

// Different routes based on role
if (userType === 'issuer') {
  // Show issuer dashboard with document issuance
} else if (userType === 'owner') {
  // Show owner dashboard with verification tools
}
```

### 3. Owner Dashboard Features

#### Document Verification
- **QR Code Scanning**: Scan QR codes from issued documents
- **Manual Input**: Enter Merkle root manually
- **File Upload**: Upload document for verification
- **Batch Verification**: Verify multiple documents at once

#### Verification History
- **Past Verifications**: View all previous verification attempts
- **Verification Status**: See which documents were valid/invalid
- **Document Details**: View issuer information and issue dates

#### Profile Management
- **Personal Information**: Update name, address, email
- **Verification Preferences**: Set default verification methods
- **Security Settings**: Change password, enable 2FA (future)

### 4. UI Components for Owners

#### OwnerDashboard Component
```typescript
// src/pages/OwnerDashboardPage.tsx
export const OwnerDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <DocumentVerification />
      <VerificationHistory />
      <QuickActions />
    </div>
  )
}
```

#### DocumentVerification Component
```typescript
// src/components/owner/DocumentVerification.tsx
export const DocumentVerification: React.FC = () => {
  return (
    <div className="space-y-4">
      <QRCodeScanner />
      <ManualVerification />
      <FileUploadVerification />
      <BatchVerification />
    </div>
  )
}
```

#### VerificationHistory Component
```typescript
// src/components/owner/VerificationHistory.tsx
export const VerificationHistory: React.FC = () => {
  return (
    <div>
      <VerificationList />
      <VerificationStats />
      <ExportHistory />
    </div>
  )
}
```

### 5. Database Operations

#### Owner Service
```typescript
// src/lib/owner-service.ts
export class OwnerService {
  // Get verification history
  static async getVerificationHistory(ownerId: string) {
    // Implementation
  }
  
  // Record verification attempt
  static async recordVerification(verificationData: VerificationData) {
    // Implementation
  }
  
  // Get verification statistics
  static async getVerificationStats(ownerId: string) {
    // Implementation
  }
}
```

### 6. Security Considerations

#### Access Control
- **Row Level Security (RLS)**: Owners can only see their own verification history
- **API Endpoints**: Separate endpoints for owner operations
- **Role Validation**: Server-side validation of user roles

#### Data Privacy
- **Minimal Data Collection**: Owners only provide necessary information
- **Verification Logs**: Optional logging of verification attempts
- **Data Retention**: Configurable retention policies for verification history

### 7. Registration Flow

#### Owner Registration Process
1. **Email Verification**: Verify email address during registration
2. **Profile Setup**: Collect name and address information
3. **Terms Acceptance**: Accept terms of service and privacy policy
4. **Account Activation**: Activate account and redirect to owner dashboard

#### Registration Form
```typescript
// src/components/auth/OwnerRegistrationForm.tsx
export const OwnerRegistrationForm: React.FC = () => {
  return (
    <form>
      <EmailInput />
      <PasswordInput />
      <ConfirmPasswordInput />
      <NameInput />
      <AddressInput />
      <TermsCheckbox />
      <SubmitButton />
    </form>
  )
}
```

### 8. Navigation and UI

#### Owner Navigation Menu
```typescript
// src/components/layout/OwnerNavigation.tsx
export const OwnerNavigation: React.FC = () => {
  return (
    <nav>
      <Link to="/owner/dashboard">Dashboard</Link>
      <Link to="/owner/verify">Verify Document</Link>
      <Link to="/owner/history">Verification History</Link>
      <Link to="/owner/profile">Profile</Link>
    </nav>
  )
}
```

#### Role-Based Header
```typescript
// src/components/layout/Header.tsx
export const Header: React.FC = () => {
  const { userType } = useAuthContext()
  
  return (
    <header>
      {userType === 'issuer' && <IssuerNavigation />}
      {userType === 'owner' && <OwnerNavigation />}
    </header>
  )
}
```

### 9. API Endpoints

#### Owner-Specific Endpoints
```typescript
// src/api/owner/
- GET /api/owner/verification-history
- POST /api/owner/verify-document
- GET /api/owner/verification-stats
- PUT /api/owner/profile
- POST /api/owner/verify-batch
```

### 10. Testing Strategy

#### Unit Tests
- **Authentication**: Test owner login/logout
- **Verification**: Test document verification logic
- **Database**: Test owner data operations

#### Integration Tests
- **End-to-End**: Test complete owner workflow
- **API Tests**: Test owner-specific endpoints
- **UI Tests**: Test owner interface components

#### Security Tests
- **Access Control**: Verify role-based access
- **Data Privacy**: Test data isolation
- **Input Validation**: Test malicious input handling

## Deployment Considerations

### 1. Database Migration
```sql
-- Run the database migration to create owner tables
-- This is included in the main migration script
```

### 2. Environment Variables
```env
# No additional environment variables needed
# Uses existing Supabase configuration
```

### 3. Feature Flags
```typescript
// Optional: Use feature flags to enable/disable owner functionality
const ENABLE_OWNER_ROLE = process.env.VITE_ENABLE_OWNER_ROLE === 'true'
```

## Future Enhancements

### 1. Advanced Features
- **Document Notifications**: Notify owners of new document issuances
- **Verification Alerts**: Alert owners of document status changes
- **Mobile App**: Native mobile app for document verification
- **Offline Verification**: Cache verification data for offline use

### 2. Integration Features
- **Email Integration**: Send verification results via email
- **SMS Notifications**: SMS alerts for important verifications
- **API Access**: REST API for third-party integrations
- **Webhook Support**: Real-time notifications via webhooks

### 3. Analytics and Reporting
- **Verification Analytics**: Track verification patterns
- **Usage Reports**: Generate usage reports for owners
- **Performance Metrics**: Monitor verification performance
- **Audit Logs**: Comprehensive audit trail

## Conclusion

The owner role implementation provides a complete document verification system for recipients while maintaining security and data privacy. The system is designed to be scalable and extensible for future enhancements.

Key benefits:
- **Separation of Concerns**: Clear distinction between issuers and owners
- **Security**: Role-based access control and data isolation
- **User Experience**: Intuitive interface for document verification
- **Scalability**: Designed to handle large numbers of verifications
- **Extensibility**: Easy to add new features and integrations
