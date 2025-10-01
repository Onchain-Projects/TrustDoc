// Migration script to create Supabase Auth users from existing issuers table
// Run this in your browser console while on your Supabase dashboard

// First, get your Supabase admin client
const { createClient } = supabase

// Replace with your actual Supabase URL and service role key
const supabaseUrl = 'YOUR_SUPABASE_URL'
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

// Function to create auth user from issuer data
async function createAuthUser(issuer) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: issuer.email,
      password: issuer.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: issuer.name,
        user_type: 'issuer',
        issuer_id: issuer.issuer_id
      }
    })
    
    if (error) {
      console.error(`Error creating user ${issuer.email}:`, error)
    } else {
      console.log(`Successfully created auth user for ${issuer.email}`)
    }
    
    return { data, error }
  } catch (err) {
    console.error(`Exception creating user ${issuer.email}:`, err)
    return { data: null, error: err }
  }
}

// Get all issuers and create auth users
async function migrateIssuers() {
  const { data: issuers, error } = await supabaseAdmin
    .from('issuers')
    .select('*')
  
  if (error) {
    console.error('Error fetching issuers:', error)
    return
  }
  
  console.log(`Found ${issuers.length} issuers to migrate`)
  
  for (const issuer of issuers) {
    await createAuthUser(issuer)
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('Migration completed!')
}

// Run the migration
migrateIssuers()
