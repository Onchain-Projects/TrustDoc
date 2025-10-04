# 🔧 Manual Owner Creation Guide

This guide shows you how to create an owner account manually in the Supabase database, properly linking it with the authentication system.

## 🚨 **Problem**
The current system has no proper link between the `auth.users` table and the `owners` table. This causes authentication issues where users can't properly log in as owners.

## ✅ **Solution**
We need to add an `auth_user_id` field to the `owners` table that references the `auth.users` table.

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Update Database Schema**

Run this SQL script in your Supabase SQL editor:

```sql
-- Add auth_user_id column to link with auth.users
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_owners_auth_user_id ON owners(auth_user_id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'owners'
ORDER BY ordinal_position;
```

### **Step 2: Create Owner Account**

#### **Option A: Using the Backend Script (Recommended)**

1. **Update the owner details** in `create-owner-backend.js`:
```javascript
const ownerData = {
  email: 'admin@yourcompany.com', // Change this
  password: 'YourSecurePassword123!', // Change this
  name: 'System Administrator', // Change this
  address: '0xYourMetaMaskAddress', // Change this
}
```

2. **Run the script**:
```bash
node create-owner-backend.js
```

#### **Option B: Manual SQL Creation**

1. **Create auth user** in Supabase Dashboard:
   - Go to **Authentication > Users**
   - Click **Add User**
   - Email: `admin@yourcompany.com`
   - Password: `YourSecurePassword123!`
   - User Metadata: `{"name": "System Administrator", "user_type": "owner"}`

2. **Get the auth user ID** from the Users table

3. **Insert owner record**:
```sql
INSERT INTO owners (
    email,
    password,
    address,
    name,
    auth_user_id,
    created_at,
    updated_at
) VALUES (
    'admin@yourcompany.com',
    'YourSecurePassword123!',
    '0xYourMetaMaskAddress',
    'System Administrator',
    'AUTH_USER_ID_HERE', -- Replace with actual auth user ID
    NOW(),
    NOW()
);
```

### **Step 3: Verify the Setup**

Run this query to verify the owner is properly linked:

```sql
SELECT 
    o.id,
    o.email,
    o.name,
    o.address,
    o.auth_user_id,
    o.created_at,
    au.id as auth_user_id_verify,
    au.email as auth_email,
    au.user_metadata
FROM owners o
LEFT JOIN auth.users au ON o.auth_user_id = au.id
WHERE o.email = 'admin@yourcompany.com';
```

### **Step 4: Test Login**

1. Go to `http://localhost:8080/owner/login`
2. Use the credentials you set
3. Should successfully log in and redirect to owner dashboard

---

## 🔍 **Troubleshooting**

### **Issue 1: "Owner account not found or not properly linked"**

**Cause**: The `auth_user_id` field is not properly set or the auth user doesn't exist.

**Solution**:
1. Check if the auth user exists in the dashboard
2. Verify the `auth_user_id` in the owners table
3. Ensure the UUIDs match exactly

### **Issue 2: "Access denied. This account is not authorized as an owner."**

**Cause**: The user metadata doesn't specify `user_type: 'owner'`.

**Solution**:
1. Go to Authentication > Users in Supabase Dashboard
2. Edit the user
3. Set User Metadata to: `{"name": "Your Name", "user_type": "owner"}`

### **Issue 3: "Failed to create auth user"**

**Cause**: Email already exists or insufficient permissions.

**Solution**:
1. Check if the email already exists in auth users
2. Use a different email
3. Ensure you're using the service role key

### **Issue 4: Foreign key constraint error**

**Cause**: The `auth_user_id` references a non-existent user.

**Solution**:
1. Create the auth user first
2. Get the correct auth user ID
3. Use that ID when creating the owner record

---

## 📊 **Database Schema After Update**

```sql
-- Updated owners table structure
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_owners_auth_user_id ON owners(auth_user_id);
```

---

## 🔐 **Security Notes**

1. **Service Role Key**: Only use the service role key for administrative operations
2. **Password Security**: In production, passwords should be hashed
3. **Single Owner**: The system is designed to have only one owner account
4. **Auth Linking**: Always link owners with auth users for proper authentication

---

## ✅ **Verification Checklist**

- [ ] `auth_user_id` column added to owners table
- [ ] Index created on `auth_user_id`
- [ ] Auth user created with `user_type: 'owner'` in metadata
- [ ] Owner record created with correct `auth_user_id`
- [ ] Login test successful
- [ ] Owner dashboard accessible

---

## 🚀 **Next Steps**

After creating the owner:

1. **Login** at `/owner/login`
2. **Approve issuers** in the dashboard
3. **Manage system** settings
4. **Monitor** issuer activity

The owner system is now properly linked with Supabase authentication!
