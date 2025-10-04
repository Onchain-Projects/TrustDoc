-- Manual Owner Creation Script for Supabase
-- This script creates an owner account directly in the database

-- Step 1: First, create the auth user manually in Supabase Dashboard
-- Go to Authentication > Users > Add User
-- Email: admin@yourcompany.com
-- Password: YourSecurePassword123!
-- User Metadata: {"name": "System Administrator", "user_type": "owner"}

-- Step 2: Get the auth user ID from the auth.users table
-- You can find this in the Supabase Dashboard under Authentication > Users

-- Step 3: Insert the owner record with the auth user ID
-- Replace 'AUTH_USER_ID_HERE' with the actual auth user ID from step 2

INSERT INTO owners (
    id,
    email,
    password,
    address,
    name,
    auth_user_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(), -- Generate a new UUID for owners table
    'admin@yourcompany.com', -- Change this to your admin email
    'YourSecurePassword123!', -- Change this to your secure password
    '0xYourMetaMaskAddress', -- Change this to your MetaMask address
    'System Administrator', -- Change this to your name
    'AUTH_USER_ID_HERE', -- Replace with actual auth user ID
    NOW(),
    NOW()
);

-- Step 4: Verify the owner was created
SELECT 
    o.id,
    o.email,
    o.name,
    o.address,
    o.created_at,
    au.id as auth_user_id,
    au.email as auth_email,
    au.user_metadata
FROM owners o
LEFT JOIN auth.users au ON o.auth_user_id = au.id
WHERE o.email = 'admin@yourcompany.com';

-- Step 5: Check if owner can login
-- Test the login at /owner/login with the credentials you set
