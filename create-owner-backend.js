/**
 * Manual Owner Creation Script
 * This script creates an owner account and properly links it with Supabase auth
 * 
 * Instructions:
 * 1. Update the ownerData object below with your details
 * 2. Run: node create-owner-backend.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createOwnerManually() {
  try {
    console.log('🚀 Creating owner account manually...')
    
    // UPDATE THESE VALUES WITH YOUR DETAILS
    const ownerData = {
      email: 'admin@yourcompany.com', // Change this
      password: 'YourSecurePassword123!', // Change this
      name: 'System Administrator', // Change this
      address: '0xYourMetaMaskAddress', // Change this
    }

    console.log('📋 Owner Details:')
    console.log(`   Email: ${ownerData.email}`)
    console.log(`   Name: ${ownerData.name}`)
    console.log(`   Address: ${ownerData.address}`)

    // Step 1: Check if owner already exists
    console.log('\n🔍 Checking for existing owners...')
    const { data: existingOwners, error: checkError } = await supabase
      .from('owners')
      .select('id, email')
      .limit(1)

    if (checkError) {
      throw new Error(`Failed to check existing owners: ${checkError.message}`)
    }

    if (existingOwners && existingOwners.length > 0) {
      console.log('❌ Owner account already exists:')
      console.log(`   Email: ${existingOwners[0].email}`)
      console.log('   Only one owner is allowed per system.')
      return
    }

    // Step 2: Check if auth user already exists
    console.log('\n🔍 Checking for existing auth user...')
    const { data: existingAuthUsers, error: authCheckError } = await supabase.auth.admin.listUsers()
    
    if (authCheckError) {
      throw new Error(`Failed to check existing auth users: ${authCheckError.message}`)
    }

    const existingAuthUser = existingAuthUsers.users.find(user => user.email === ownerData.email)
    if (existingAuthUser) {
      console.log('❌ Auth user already exists with this email')
      console.log(`   Auth User ID: ${existingAuthUser.id}`)
      console.log('   You can either use a different email or delete the existing user first.')
      return
    }

    // Step 3: Create Supabase auth user using admin API
    console.log('\n📧 Creating Supabase auth user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ownerData.email,
      password: ownerData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: ownerData.name,
        user_type: 'owner',
      }
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user - no user data returned')
    }

    console.log('✅ Auth user created successfully')
    console.log(`   Auth User ID: ${authData.user.id}`)

    // Step 4: Create owner record linked to auth user
    console.log('\n👤 Creating owner record...')
    const { data: ownerRecord, error: ownerError } = await supabase
      .from('owners')
      .insert({
        email: ownerData.email,
        password: ownerData.password, // In production, this should be hashed
        address: ownerData.address,
        name: ownerData.name,
        auth_user_id: authData.user.id, // Link to auth user
      })
      .select()
      .single()

    if (ownerError) {
      // If owner creation fails, clean up the auth user
      console.log('❌ Failed to create owner record, cleaning up auth user...')
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw new Error(`Failed to create owner: ${ownerError.message}`)
    }

    console.log('✅ Owner created successfully!')
    console.log('\n📋 Owner Details:')
    console.log(`   Owner ID: ${ownerRecord.id}`)
    console.log(`   Auth User ID: ${authData.user.id}`)
    console.log(`   Email: ${ownerRecord.email}`)
    console.log(`   Name: ${ownerRecord.name}`)
    console.log(`   Address: ${ownerRecord.address}`)
    console.log(`   Created: ${ownerRecord.created_at}`)
    
    console.log('\n🎉 Setup Complete!')
    console.log('You can now:')
    console.log('1. Login at http://localhost:8080/owner/login')
    console.log(`2. Use email: ${ownerData.email}`)
    console.log(`3. Use password: ${ownerData.password}`)
    console.log('4. Manage issuer approvals in the owner dashboard')

    // Step 5: Verify the link between auth and owners
    console.log('\n🔗 Verifying auth-owner link...')
    const { data: verification, error: verifyError } = await supabase
      .from('owners')
      .select(`
        id,
        email,
        name,
        auth_user_id,
        auth_users:auth_user_id (
          id,
          email,
          user_metadata
        )
      `)
      .eq('id', ownerRecord.id)
      .single()

    if (verifyError) {
      console.log('⚠️  Warning: Could not verify auth-owner link:', verifyError.message)
    } else {
      console.log('✅ Auth-owner link verified successfully')
      console.log(`   Owner email: ${verification.email}`)
      console.log(`   Auth email: ${verification.auth_users?.email}`)
      console.log(`   User type: ${verification.auth_users?.user_metadata?.user_type}`)
    }

  } catch (error) {
    console.error('❌ Error creating owner:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('1. Check your Supabase credentials in .env file')
    console.error('2. Ensure you have admin privileges')
    console.error('3. Make sure the owners table exists')
    console.error('4. Check if auth_user_id column exists in owners table')
    process.exit(1)
  }
}

// Run the script
createOwnerManually()
