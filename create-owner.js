/**
 * Script to create the first owner account
 * Run this with: node create-owner.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createOwner() {
  try {
    console.log('🚀 Creating owner account...')
    
    // Owner details - UPDATE THESE VALUES
    const ownerData = {
      email: 'admin@trustdoc.com', // Change this to your admin email
      password: 'SecurePassword123!', // Change this to a secure password
      name: 'TrustDoc Administrator',
      address: '0x0000000000000000000000000000000000000000', // Change this to your MetaMask address
    }

    // Check if owner already exists
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

    // Create Supabase auth user
    console.log('📧 Creating Supabase auth user...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: ownerData.email,
      password: ownerData.password,
      options: {
        data: {
          name: ownerData.name,
          user_type: 'owner',
        }
      }
    })

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user')
    }

    console.log('✅ Auth user created successfully')

    // Create owner record
    console.log('👤 Creating owner record...')
    const { data: ownerRecord, error: ownerError } = await supabase
      .from('owners')
      .insert({
        email: ownerData.email,
        password: ownerData.password, // In production, this should be hashed
        address: ownerData.address,
        name: ownerData.name,
      })
      .select()
      .single()

    if (ownerError) {
      throw new Error(`Failed to create owner: ${ownerError.message}`)
    }

    console.log('✅ Owner created successfully!')
    console.log('📋 Owner Details:')
    console.log(`   ID: ${ownerRecord.id}`)
    console.log(`   Name: ${ownerRecord.name}`)
    console.log(`   Email: ${ownerRecord.email}`)
    console.log(`   Address: ${ownerRecord.address}`)
    console.log(`   Created: ${ownerRecord.created_at}`)
    
    console.log('\n🎉 Setup Complete!')
    console.log('You can now:')
    console.log('1. Login to the owner dashboard')
    console.log('2. Approve/reject new issuer registrations')
    console.log('3. Manage the system')

  } catch (error) {
    console.error('❌ Error creating owner:', error.message)
    process.exit(1)
  }
}

// Run the script
createOwner()
