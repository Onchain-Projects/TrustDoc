import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Clock, Users, FileText, Settings } from 'lucide-react'
import { OwnerService, type IssuerApprovalData } from '@/lib/owner-service'
import { type Issuer, type Owner } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [pendingIssuers, setPendingIssuers] = useState<Issuer[]>([])
  const [approvedIssuers, setApprovedIssuers] = useState<Issuer[]>([])
  const [stats, setStats] = useState({
    totalIssuers: 0,
    approvedIssuers: 0,
    pendingIssuers: 0,
    totalVerifications: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeOwner()
  }, [])

  useEffect(() => {
    if (owner) {
      loadData()
    }
  }, [owner])

  const initializeOwner = async () => {
    try {
      // First, try to get owner from navigation state
      const stateOwner = location.state?.owner
      if (stateOwner) {
        setOwner(stateOwner)
        return
      }

      // Fallback: Get owner from current auth user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/owner/login')
        return
      }

      const { data: ownerData, error } = await supabase
        .from('owners')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error || !ownerData) {
        throw new Error('Owner account not found')
      }

      setOwner(ownerData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize owner')
      navigate('/owner/login')
    }
  }

  const loadData = async () => {
    if (!owner) return

    try {
      setLoading(true)
      setError(null)

      const [pending, approved, ownerStats] = await Promise.all([
        OwnerService.getPendingIssuers(),
        OwnerService.getApprovedIssuers(),
        OwnerService.getOwnerStats(owner.id)
      ])

      setPendingIssuers(pending)
      setApprovedIssuers(approved)
      setStats(ownerStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleIssuerApproval = async (issuerId: string, isApproved: boolean, notes?: string) => {
    try {
      const approvalData: IssuerApprovalData = {
        issuerId,
        metaMaskAddress: '', // Will be updated from issuer data
        isApproved,
        approvedBy: owner.id,
        approvalNotes: notes
      }

      await OwnerService.approveIssuer(approvalData)
      await loadData() // Refresh data
      
      console.log(`Issuer ${issuerId} ${isApproved ? 'approved' : 'rejected'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issuer approval')
    }
  }

  const handleRetryBlockchainIntegration = async (issuerId: string) => {
    try {
      setLoading(true)
      setError('')
      
      await OwnerService.retryBlockchainIntegration(issuerId, owner.id)
      await loadData() // Refresh data
      
      console.log(`Blockchain integration retry completed for issuer ${issuerId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry blockchain integration')
    } finally {
      setLoading(false)
    }
  }

  const PendingIssuerCard: React.FC<{ issuer: Issuer }> = ({ issuer }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{issuer.name}</CardTitle>
            <CardDescription>{issuer.email}</CardDescription>
          </div>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        </div>
              </CardHeader>
              <CardContent>
        <div className="space-y-2 mb-4">
          <p><strong>Issuer ID:</strong> {issuer.issuer_id}</p>
          <p><strong>MetaMask Address:</strong> {issuer.meta_mask_address}</p>
          <p><strong>Registered:</strong> {new Date(issuer.created_at).toLocaleDateString()}</p>
          {issuer.blockchain_address && (
            <p><strong>Blockchain Status:</strong> <span className="text-green-600">✅ Registered</span></p>
          )}
        </div>
        <div className="flex gap-2">
                  <Button 
            size="sm"
            onClick={() => handleIssuerApproval(issuer.issuer_id, true)}
            className="bg-green-600 hover:bg-green-700"
                  >
            <CheckCircle className="w-4 h-4 mr-1" />
            Approve
                  </Button>
                  <Button 
            size="sm"
            variant="destructive"
            onClick={() => handleIssuerApproval(issuer.issuer_id, false)}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
  )

  const ApprovedIssuerCard: React.FC<{ issuer: Issuer }> = ({ issuer }) => (
    <Card className="mb-4">
              <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{issuer.name}</CardTitle>
            <CardDescription>{issuer.email}</CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        </div>
              </CardHeader>
              <CardContent>
        <div className="space-y-2">
          <p><strong>Issuer ID:</strong> {issuer.issuer_id}</p>
          <p><strong>MetaMask Address:</strong> {issuer.meta_mask_address}</p>
          <p><strong>Approved:</strong> {issuer.approval_date ? new Date(issuer.approval_date).toLocaleDateString() : 'N/A'}</p>
          {issuer.blockchain_address && (
            <div>
              {issuer.blockchain_registration_tx === 'blockchain_integration_failed' ? (
                <div>
                  <p><strong>Blockchain Status:</strong> <span className="text-red-600">❌ Integration Failed</span></p>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetryBlockchainIntegration(issuer.issuer_id)}
                    disabled={loading}
                    className="mt-2 text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    🔄 Retry Blockchain Integration
                  </Button>
                </div>
              ) : issuer.blockchain_registration_tx === 'pending_blockchain_integration' ? (
                <p><strong>Blockchain Status:</strong> <span className="text-yellow-600">⏳ Ready for Integration</span></p>
              ) : (
                <>
                  <p><strong>Blockchain Status:</strong> <span className="text-green-600">✅ Fully Integrated</span></p>
                  {issuer.blockchain_registration_tx && 
                   issuer.blockchain_registration_tx !== 'pending_blockchain_integration' && 
                   issuer.blockchain_registration_tx !== 'blockchain_integration_failed' &&
                   issuer.blockchain_registration_tx !== 'already_registered' && (
                    <p><strong>Registration TX:</strong> 
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${issuer.blockchain_registration_tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-2"
                      >
                        View on Explorer
                      </a>
                    </p>
                  )}
                  {issuer.blockchain_registration_tx === 'already_registered' && (
                    <p><strong>Registration:</strong> <span className="text-blue-600">Already Registered</span></p>
                  )}
                  {issuer.worker_addition_tx && 
                   issuer.worker_addition_tx !== 'pending_blockchain_integration' && 
                   issuer.worker_addition_tx !== 'blockchain_integration_failed' &&
                   issuer.worker_addition_tx !== 'already_worker' && (
                    <p><strong>Worker TX:</strong> 
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${issuer.worker_addition_tx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline ml-2"
                      >
                        View on Explorer
                      </a>
                    </p>
                  )}
                  {issuer.worker_addition_tx === 'already_worker' && (
                    <p><strong>Worker:</strong> <span className="text-blue-600">Already Added</span></p>
                  )}
                </>
              )}
            </div>
          )}
          {issuer.approval_notes && (
            <p><strong>Notes:</strong> {issuer.approval_notes}</p>
          )}
        </div>
              </CardContent>
            </Card>
  )

  if (loading || !owner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
                  </div>
                </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Owner Dashboard</h1>
        <p className="text-gray-600">Welcome back, {owner.name}</p>
                    </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issuers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIssuers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Issuers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedIssuers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingIssuers}</div>
              </CardContent>
            </Card>

            <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">{stats.totalVerifications}</div>
          </CardContent>
        </Card>
                        </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals ({pendingIssuers.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved Issuers ({approvedIssuers.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending Issuer Approvals</h2>
            {pendingIssuers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No pending issuer approvals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingIssuers.map((issuer) => (
                  <PendingIssuerCard key={issuer.id} issuer={issuer} />
                ))}
                    </div>
                  )}
                </div>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Approved Issuers</h2>
            {approvedIssuers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No approved issuers yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {approvedIssuers.map((issuer) => (
                  <ApprovedIssuerCard key={issuer.id} issuer={issuer} />
                ))}
                  </div>
                )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Manage system configuration and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Settings panel coming soon...</p>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
