/**
 * Script to fix owner authentication link
 * This script links the existing owner to an auth user
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

async function fixOwnerAuthLink() {
  try {
    console.log('🔧 Fixing owner authentication link...')
    
    const ownerEmail = 'owner@gmail.com' // Change this to your owner email
    
    // Step 1: Check current owner record
    console.log('\n📋 Step 1: Checking owner record...')
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('*')
      .eq('email', ownerEmail)
      .single()

    if (ownerError) {
      throw new Error(`Failed to fetch owner: ${ownerError.message}`)
    }

    if (!owner) {
      throw new Error(`Owner not found with email: ${ownerEmail}`)
    }

    console.log('✅ Owner found:', {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      auth_user_id: owner.auth_user_id
    })

    // Step 2: Check if auth user exists
    console.log('\n📋 Step 2: Checking auth user...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to list auth users: ${authError.message}`)
    }

    const authUser = authUsers.users.find(user => user.email === ownerEmail)
    
    if (!authUser) {
      console.log('❌ Auth user not found. Creating new auth user...')
      
      // Create new auth user
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: ownerEmail,
        password: owner.password, // Use the password from owners table
        email_confirm: true,
        user_metadata: {
          name: owner.name,
          user_type: 'owner',
        }
      })

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`)
      }

      console.log('✅ Auth user created:', newAuthUser.user.id)
      
      // Link owner to new auth user
      const { error: linkError } = await supabase
        .from('owners')
        .update({ auth_user_id: newAuthUser.user.id })
        .eq('id', owner.id)

      if (linkError) {
        throw new Error(`Failed to link owner to auth user: ${linkError.message}`)
      }

      console.log('✅ Owner linked to new auth user')

    } else {
      console.log('✅ Auth user found:', {
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata
      })

      // Step 3: Link owner to existing auth user
      if (!owner.auth_user_id) {
        console.log('\n📋 Step 3: Linking owner to auth user...')
        
        const { error: linkError } = await supabase
          .from('owners')
          .update({ auth_user_id: authUser.id })
          .eq('id', owner.id)

        if (linkError) {
          throw new Error(`Failed to link owner to auth user: ${linkError.message}`)
        }

        console.log('✅ Owner linked to existing auth user')
      } else {
        console.log('✅ Owner already linked to auth user')
      }

      // Step 4: Update auth user metadata
      console.log('\n📋 Step 4: Updating auth user metadata...')
      
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          user_metadata: {
            name: owner.name,
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

    // Step 5: Final verification
    console.log('\n📋 Step 5: Final verification...')
    
    const { data: finalOwner, error: finalError } = await supabase
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
      .eq('email', ownerEmail)
      .single()

    if (finalError) {
      throw new Error(`Failed to verify final state: ${finalError.message}`)
    }

    console.log('🎉 Success! Owner authentication link fixed:')
    console.log('   Owner ID:', finalOwner.id)
    console.log('   Owner Email:', finalOwner.email)
    console.log('   Owner Name:', finalOwner.name)
    console.log('   Auth User ID:', finalOwner.auth_user_id)
    console.log('   Auth Email:', finalOwner.auth_users?.email)
    console.log('   User Type:', finalOwner.auth_users?.user_metadata?.user_type)

    console.log('\n✅ You can now login at: http://localhost:8080/owner/login')
    console.log(`   Email: ${ownerEmail}`)
    console.log(`   Password: ${owner.password}`)

  } catch (error) {
    console.error('❌ Error fixing owner authentication link:', error.message)
    process.exit(1)
  }
}

// Run the script
fixOwnerAuthLink()
