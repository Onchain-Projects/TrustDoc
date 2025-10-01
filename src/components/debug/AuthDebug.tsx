import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const AuthDebug: React.FC = () => {
  const [authState, setAuthState] = useState<any>(null)
  const [issuerData, setIssuerData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      
      setAuthState(user)
      
      if (user?.email) {
        // Try to fetch issuer data
        const { data, error: issuerError } = await supabase
          .from('issuers')
          .select('*')
          .eq('email', user.email)
          .single()
        
        if (issuerError) {
          console.error('Issuer fetch error:', issuerError)
          setError(`Issuer fetch error: ${issuerError.message}`)
        } else {
          setIssuerData(data)
          setError(null)
        }
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Auth check error:', err)
    }
  }

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('issuers')
        .select('count')
        .limit(1)
      
      if (error) throw error
      console.log('Supabase connection test successful:', data)
      setError(null)
    } catch (err: any) {
      setError(`Connection test failed: ${err.message}`)
      console.error('Connection test error:', err)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={checkAuth}>Check Auth</Button>
            <Button onClick={testSupabaseConnection} variant="outline">Test Connection</Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <h4 className="font-medium">Auth State:</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(authState, null, 2)}
            </pre>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Issuer Data:</h4>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify(issuerData, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
