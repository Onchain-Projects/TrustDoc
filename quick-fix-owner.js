/**
 * Quick fix for owner login issue
 * This script creates the missing auth user and links it to the existing owner
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read environment variables from .env file
const envContent = readFileSync('.env', 'utf8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function quickFixOwner() {
  try {
    const ownerEmail = 'owner@gmail.com'
    const ownerPassword = 'owner'
    const ownerName = 'owner'
    const ownerAddress = '0x28337b6A5396c7326F7cAAdf87ad758c'

    console.log('🔧 Quick fix for owner login...')

    // Step 1: Check if auth user exists
    console.log('📧 Checking existing auth user...')
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()
    
    if (authListError) {
      throw new Error(`Failed to list auth users: ${authListError.message}`)
    }

    const existingAuthUser = authUsers.users.find(user => user.email === ownerEmail)
    
    if (!existingAuthUser) {
      console.log('❌ Auth user not found. Creating new auth user...')
      
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        user_metadata: {
          name: ownerName,
          user_type: 'owner',
        }
      })

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`)
      }

      console.log('✅ Auth user created:', authData.user.id)

      // Step 2: Update existing owner record
      console.log('👤 Linking owner to auth user...')
      const { error: updateError } = await supabase
        .from('owners')
        .update({ 
          auth_user_id: authData.user.id,
          password: ownerPassword // Update password to match
        })
        .eq('email', ownerEmail)

      if (updateError) {
        throw new Error(`Failed to update owner: ${updateError.message}`)
      }

      console.log('✅ Owner linked to auth user')
    } else {
      console.log('✅ Auth user found:', existingAuthUser.id)

      // Step 2: Update existing owner record
      console.log('👤 Linking owner to existing auth user...')
      const { error: updateError } = await supabase
        .from('owners')
        .update({ 
          auth_user_id: existingAuthUser.id,
          password: ownerPassword // Update password to match
        })
        .eq('email', ownerEmail)

      if (updateError) {
        throw new Error(`Failed to update owner: ${updateError.message}`)
      }

      console.log('✅ Owner linked to existing auth user')

      // Step 3: Update auth user metadata
      console.log('📝 Updating auth user metadata...')
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        {
          user_metadata: {
            name: ownerName,
            user_type: 'owner',
          }
        }
      )

      if (metadataError) {
        console.log('⚠️  Warning: Failed to update auth user metadata:', metadataError.message)
      } else {
        console.log('✅ Auth user metadata updated')
      }
    }

    // Step 3: Verify
    console.log('🔍 Verifying setup...')
    const { data: owner, error: verifyError } = await supabase
      .from('owners')
      .select('id, email, name, auth_user_id')
      .eq('email', ownerEmail)
      .single()

    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`)
    }

    console.log('🎉 Success! Owner login fixed:')
    console.log('   Email:', owner.email)
    console.log('   Name:', owner.name)
    console.log('   Auth User ID:', owner.auth_user_id)

    console.log('\n✅ You can now login at: http://localhost:8080/owner/login')
    console.log(`   Email: ${ownerEmail}`)
    console.log(`   Password: ${ownerPassword}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

quickFixOwner()
