import { supabase, type AuthUser, type Issuer, type Owner } from './supabase'
import { KeyManagementService } from './crypto/key-management'

export interface SignUpData {
  email: string
  password: string
  name: string
  address: string
  userType: 'issuer' | 'owner'
  issuerId?: string
  publicKey?: string
  privateKey?: string
  metaMaskAddress?: string
}

export interface SignInData {
  email: string
  password: string
}

// Authentication functions
export const authService = {
  // Sign up new user
  async signUp(data: SignUpData) {
    console.log('Attempting to sign up with:', { email: data.email, userType: data.userType })
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          user_type: data.userType,
          issuer_id: data.issuerId,
        }
      }
    })

    if (authError) {
      console.error('Sign up error:', authError)
      throw new Error(authError.message || 'Sign up failed')
    }
    
    console.log('Sign up successful:', authData)

    // Create user record in appropriate table
    if (authData.user) {
      if (data.userType === 'issuer') {
        const issuerId = data.issuerId || `issuer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Generate real cryptographic key pair
        let keyPair
        try {
          keyPair = await KeyManagementService.generateAndStoreKeyPair(issuerId, 'ec', data.password)
          console.log('Generated cryptographic key pair for issuer:', issuerId)
        } catch (keyError) {
          console.error('Key generation error:', keyError)
          // Fallback to simple keys if cryptographic generation fails
          keyPair = {
            publicKey: `pub_${Math.random().toString(36).substr(2, 12)}`,
            privateKey: `priv_${Math.random().toString(36).substr(2, 12)}`,
            keyId: `key_${Date.now()}`,
            algorithm: 'simple',
            keySize: 0,
            createdAt: new Date()
          }
        }

        const { error: issuerError } = await supabase
          .from('issuers')
          .insert({
            email: data.email,
            password: data.password, // In production, this should be hashed
            address: data.address,
            issuerId: issuerId,
            name: data.name,
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey, // This will be replaced by encrypted storage
            metaMaskAddress: data.metaMaskAddress || '',
          })

        if (issuerError) throw issuerError
      } else {
        const { error: ownerError } = await supabase
          .from('owners')
          .insert({
            email: data.email,
            password: data.password, // In production, this should be hashed
            address: data.address,
            name: data.name,
          })

        if (ownerError) throw ownerError
      }
    }

    return authData
  },

  // Sign in user
  async signIn(data: SignInData) {
    console.log('Attempting to sign in with:', { email: data.email })
    
    // CRITICAL FIX: Try Supabase Auth first, then fallback to custom authentication
    try {
      // First, try Supabase Auth (for users registered through proper flow)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (!authError && authData) {
        console.log('Sign in successful via Supabase Auth:', authData)
        return authData
      }

      // If Supabase Auth fails, check if user exists in custom tables
      console.log('Supabase Auth failed, checking custom tables...', authError?.message)
      
    } catch (authError: any) {
      console.log('Supabase Auth error, checking custom tables...', authError?.message)
    }

    // FALLBACK: Custom authentication from issuers/owners table
    console.log('Attempting custom authentication from database...')
    
    // Check issuers table first
    const { data: issuerData, error: issuerError } = await supabase
      .from('issuers')
      .select('*')
      .eq('email', data.email)
      .single()

    if (!issuerError && issuerData) {
      // Found in issuers table - verify password
      if (issuerData.password === data.password) {
        console.log('✅ Custom authentication successful (issuer)')
        
        // Create a mock auth session for compatibility
        // Note: This is a workaround - ideally, we should create the user in Supabase Auth
        const mockUser = {
          id: issuerData.id || issuerData.issuerId,
          email: issuerData.email,
          user_metadata: {
            name: issuerData.name,
            issuer_id: issuerData.issuerId,
            user_type: 'issuer'
          }
        }

        // Try to create the user in Supabase Auth if it doesn't exist
        // This ensures future logins work with Supabase Auth
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: issuerData.name,
                user_type: 'issuer',
                issuer_id: issuerData.issuerId,
              }
            }
          })

          if (!signUpError && signUpData.user) {
            console.log('✅ Created user in Supabase Auth for future logins')
            // Now sign in with the newly created account
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            })

            if (!signInError && authData) {
              return authData
            }
          }
        } catch (createError) {
          console.warn('Could not create user in Supabase Auth, using custom auth:', createError)
        }

        // Return mock user data (compatible with existing code)
        return {
          user: mockUser as any,
          session: null
        }
      } else {
        throw new Error('Invalid password')
      }
    }

    // Check owners table
    const { data: ownerData, error: ownerError } = await supabase
      .from('owners')
      .select('*')
      .eq('email', data.email)
      .single()

    if (!ownerError && ownerData) {
      // Found in owners table - verify password
      if (ownerData.password === data.password) {
        console.log('✅ Custom authentication successful (owner)')
        
        // Create mock auth session
        const mockUser = {
          id: ownerData.id,
          email: ownerData.email,
          user_metadata: {
            name: ownerData.name,
            user_type: 'owner'
          }
        }

        // Try to create the user in Supabase Auth if it doesn't exist
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: ownerData.name,
                user_type: 'owner',
              }
            }
          })

          if (!signUpError && signUpData.user) {
            console.log('✅ Created user in Supabase Auth for future logins')
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
              email: data.email,
              password: data.password,
            })

            if (!signInError && authData) {
              return authData
            }
          }
        } catch (createError) {
          console.warn('Could not create user in Supabase Auth, using custom auth:', createError)
        }

        return {
          user: mockUser as any,
          session: null
        }
      } else {
        throw new Error('Invalid password')
      }
    }

    // User not found in either table
    throw new Error('Invalid login credentials')
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Get user profile data with auto-detection
  async getUserProfile(userId: string, userType?: 'issuer' | 'owner') {
    // First try to get the user's email from auth
    const { data: authUser } = await supabase.auth.getUser()
    if (!authUser.user?.email) {
      throw new Error('User email not found')
    }

    // If userType is not specified, try to auto-detect
    if (!userType) {
      // First try as owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('*')
        .eq('email', authUser.user.email)
        .single()

      if (!ownerError && ownerData) {
        return { profile: ownerData as Owner, userType: 'owner' as const }
      }

      // If not owner, try as issuer
      const { data: issuerData, error: issuerError } = await supabase
        .from('issuers')
        .select('*')
        .eq('email', authUser.user.email)
        .single()

      if (!issuerError && issuerData) {
        return { profile: issuerData as Issuer, userType: 'issuer' as const }
      }

      throw new Error('User profile not found in either owners or issuers table')
    }

    // If userType is specified, use it
    if (userType === 'issuer') {
      const { data, error } = await supabase
        .from('issuers')
        .select('*')
        .eq('email', authUser.user.email)
        .single()

      if (error) {
        console.error('Error fetching issuer profile:', error)
        throw error
      }
      return { profile: data as Issuer, userType: 'issuer' as const }
    } else {
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('email', authUser.user.email)
        .single()

      if (error) {
        console.error('Error fetching owner profile:', error)
        throw error
      }
      return { profile: data as Owner, userType: 'owner' as const }
    }
  },

  // Update user profile
  async updateProfile(userId: string, userType: 'issuer' | 'owner', updates: Partial<Issuer | Owner>) {
    const table = userType === 'issuer' ? 'issuers' : 'owners'
    
    // Get user email from auth
    const { data: authUser } = await supabase.auth.getUser()
    if (!authUser.user?.email) {
      throw new Error('User email not found')
    }
    
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('email', authUser.user.email)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user as AuthUser || null)
    })
  }
}
