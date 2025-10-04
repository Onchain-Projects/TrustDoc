import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Mail, Lock, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OwnerService } from '@/lib/owner-service'
import { useNavigate } from 'react-router-dom'

export const OwnerLoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('Login failed')
      }

      // Get owner details using auth user ID
      let { data: owner, error: ownerError } = await supabase
        .from('owners')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single()

      if (ownerError || !owner) {
        // Fallback: try to find owner by email if auth_user_id link is missing
        console.log('Auth user ID link not found, trying email lookup...')
        const { data: ownerByEmail, error: emailError } = await supabase
          .from('owners')
          .select('*')
          .eq('email', email)
          .single()

        if (emailError || !ownerByEmail) {
          await supabase.auth.signOut()
          throw new Error('Owner account not found. Please contact system administrator.')
        }

        // Link the owner to the auth user
        console.log('Linking owner to auth user...')
        const { error: linkError } = await supabase
          .from('owners')
          .update({ auth_user_id: authData.user.id })
          .eq('id', ownerByEmail.id)

        if (linkError) {
          console.error('Failed to link owner to auth user:', linkError)
        } else {
          console.log('Owner successfully linked to auth user')
        }

        // Update auth user metadata
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            user_type: 'owner',
            name: ownerByEmail.name
          }
        })

        if (metadataError) {
          console.error('Failed to update auth user metadata:', metadataError)
        }

        // Use the owner found by email
        owner = ownerByEmail
      }

      // Final check: ensure this is actually an owner
      if (!owner) {
        await supabase.auth.signOut()
        throw new Error('Access denied. This account is not authorized as an owner.')
      }

      console.log('Owner login successful:', owner)
      
      // Navigate to owner dashboard
      navigate('/owner/dashboard', { 
        state: { owner },
        replace: true 
      })

    } catch (error) {
      console.error('Login error:', error)
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Owner Portal</h1>
          <p className="text-gray-600">Sign in to manage the TrustDoc system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the owner dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@trustdoc.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={goBack}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help? Contact system administrator or check the documentation.
          </p>
        </div>
      </div>
    </div>
  )
}
