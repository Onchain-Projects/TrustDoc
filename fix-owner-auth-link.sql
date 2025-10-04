-- Fix owner authentication link
-- This script links the existing owner to an auth user

-- Step 1: Check current owner record
SELECT 
    id,
    email,
    name,
    auth_user_id,
    created_at
FROM owners 
WHERE email = 'owner@gmail.com';

-- Step 2: Check if auth user exists
SELECT 
    id,
    email,
    user_metadata,
    created_at
FROM auth.users 
WHERE email = 'owner@gmail.com';

-- Step 3: If auth user exists, link them
-- Replace 'AUTH_USER_ID_HERE' with the actual auth user ID from step 2
UPDATE owners 
SET auth_user_id = 'AUTH_USER_ID_HERE'  -- Replace with actual auth user ID
WHERE email = 'owner@gmail.com';

-- Step 4: Verify the link
SELECT 
    o.id,
    o.email,
    o.name,
    o.auth_user_id,
    au.id as auth_user_id_verify,
    au.email as auth_email,
    au.user_metadata
FROM owners o
LEFT JOIN auth.users au ON o.auth_user_id = au.id
WHERE o.email = 'owner@gmail.com';

-- Step 5: Update auth user metadata if needed
-- Replace 'AUTH_USER_ID_HERE' with the actual auth user ID
UPDATE auth.users 
SET user_metadata = jsonb_set(
    COALESCE(user_metadata, '{}'::jsonb),
    '{user_type}',
    '"owner"'::jsonb
)
WHERE id = 'AUTH_USER_ID_HERE';  -- Replace with actual auth user ID

-- Step 6: Final verification
SELECT 
    o.email,
    o.name,
    o.auth_user_id,
    au.user_metadata,
    au.email_confirmed_at
FROM owners o
LEFT JOIN auth.users au ON o.auth_user_id = au.id
WHERE o.email = 'owner@gmail.com';
