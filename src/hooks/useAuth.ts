import { useState, useEffect } from 'react'
import { authService, type SignUpData, type SignInData } from '@/lib/auth'
import type { AuthUser, Issuer, Owner } from '@/lib/supabase'

export interface AuthState {
  user: AuthUser | null
  profile: Issuer | Owner | null
  userType: 'issuer' | 'owner' | null
  loading: boolean
  error: string | null
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    userType: null,
    loading: true,
    error: null
  })

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          const { profile, userType } = await authService.getUserProfile(user.id)
          
          setAuthState({
            user: user as AuthUser,
            profile,
            userType,
            loading: false,
            error: null
          })
        } else {
          setAuthState({
            user: null,
            profile: null,
            userType: null,
            loading: false,
            error: null
          })
        }
      } catch (error) {
        setAuthState({
          user: null,
          profile: null,
          userType: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication error'
        })
      }
    }

    initializeAuth()

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      if (user) {
        try {
          const { profile, userType } = await authService.getUserProfile(user.id)
          
          setAuthState({
            user,
            profile,
            userType,
            loading: false,
            error: null
          })
        } catch (error) {
          setAuthState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Profile loading error',
            loading: false
          }))
        }
      } else {
        setAuthState({
          user: null,
          profile: null,
          userType: null,
          loading: false,
          error: null
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sign up function
  const signUp = async (data: SignUpData) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await authService.signUp(data)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }))
      throw error
    }
  }

  // Sign in function
  const signIn = async (data: SignInData) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const result = await authService.signIn(data)
      
      // After successful sign in, fetch user profile to get userType
      if (result.user) {
        try {
          const { profile, userType } = await authService.getUserProfile(result.user.id)
          
          setAuthState(prev => ({
            ...prev,
            user: result.user as AuthUser,
            profile,
            userType,
            loading: false,
            error: null
          }))
          
          return { ...result, userType, profile }
        } catch (profileError) {
          console.error('Error fetching profile after sign in:', profileError)
          // Still return the auth result even if profile fetch fails
          return result
        }
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }))
      throw error
    }
  }

  // Sign out function
  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await authService.signOut()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }))
      throw error
    }
  }

  // Update profile function
  const updateProfile = async (updates: Partial<Issuer | Owner>) => {
    if (!authState.user || !authState.userType) {
      throw new Error('User not authenticated')
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const updatedProfile = await authService.updateProfile(
        authState.user.id,
        authState.userType,
        updates
      )
      
      setAuthState(prev => ({
        ...prev,
        profile: updatedProfile,
        loading: false,
        error: null
      }))
      
      return updatedProfile
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed'
      setAuthState(prev => ({ ...prev, error: errorMessage, loading: false }))
      throw error
    }
  }

  // Clear error function
  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }))
  }

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    updateProfile,
    clearError
  }
}
