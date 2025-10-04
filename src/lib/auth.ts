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
            issuer_id: issuerId,
            name: data.name,
            public_key: keyPair.publicKey,
            private_key: keyPair.privateKey, // This will be replaced by encrypted storage
            meta_mask_address: data.metaMaskAddress || '',
            key_type: keyPair.algorithm,
            key_size: keyPair.keySize,
            key_created_at: keyPair.createdAt.toISOString(),
            is_key_active: true,
            is_approved: false, // New issuers require owner approval
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
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      console.error('Sign in error:', error)
      throw new Error(error.message || 'Sign in failed')
    }
    
    console.log('Sign in successful:', authData)
    return authData
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
