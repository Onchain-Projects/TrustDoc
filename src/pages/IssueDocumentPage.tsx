import React, { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useBlockchainOperations } from '@/hooks/useBlockchain'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { BlockchainIntegration } from '@/components/blockchain/BlockchainIntegration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Info, 
  Shield, 
  CheckCircle, 
  ArrowLeft,
  Clock,
  Upload,
  Layers,
  AlertTriangle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Worker Status Check Component
const WorkerStatusCard: React.FC<{
  checkWorkerStatus: (address: string) => Promise<boolean>
  addWorker: (address: string) => Promise<any>
  getContractOwner: () => Promise<string>
}> = ({ checkWorkerStatus, addWorker, getContractOwner }) => {
  const [workerStatus, setWorkerStatus] = useState<boolean | null>(null)
  const [contractOwner, setContractOwner] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userAddress, setUserAddress] = useState<string | null>(null)

  const checkStatus = async () => {
    if (!window.ethereum) return
    
    setLoading(true)
    setError('')
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) {
        setError('No wallet connected')
        setLoading(false)
        return
      }
      
      const address = accounts[0]
      setUserAddress(address)
      
      const isWorker = await checkWorkerStatus(address)
      setWorkerStatus(isWorker)
      
      const owner = await getContractOwner()
      setContractOwner(owner)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddWorker = async () => {
    if (!userAddress) return
    
    setLoading(true)
    setError('')
    
    try {
      await addWorker(userAddress)
      setWorkerStatus(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span>Worker Status Check</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Check if your wallet address is registered as a worker on the smart contract.
        </p>
        
        <Button onClick={checkStatus} disabled={loading} className="w-full">
          {loading ? 'Checking...' : 'Check Worker Status'}
        </Button>
        
        {userAddress && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <strong>Your Address:</strong> {userAddress}
            </p>
            {contractOwner && (
              <p className="text-sm">
                <strong>Contract Owner:</strong> {contractOwner}
              </p>
            )}
            {workerStatus !== null && (
              <p className="text-sm">
                <strong>Worker Status:</strong> 
                <span className={`ml-2 ${workerStatus ? 'text-green-600' : 'text-red-600'}`}>
                  {workerStatus ? '✅ Registered Worker' : '❌ Not a Worker'}
                </span>
              </p>
            )}
          </div>
        )}
        
        {workerStatus === false && userAddress && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Action Required:</strong> Your address is not registered as a worker. 
              You need to be added as a worker to issue documents.
            </p>
            <Button 
              onClick={handleAddWorker} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? 'Adding...' : 'Add Myself as Worker'}
            </Button>
            <p className="text-xs text-yellow-700 mt-2">
              Note: This will only work if you are the contract owner.
            </p>
          </div>
        )}
        
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export const IssueDocumentPage: React.FC = () => {
  const { user, profile, userType } = useAuthContext()
  const { isConnected, isCorrectNetwork, checkWorkerStatus, addWorker, getContractOwner } = useBlockchainOperations()
  const navigate = useNavigate()
  
  const [issuanceMode, setIssuanceMode] = useState<'single' | 'batch'>('single')
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [error, setError] = useState('')

  // Redirect if not authenticated or not an issuer
  if (!user || userType !== 'issuer') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              Only authenticated issuers can access this page.
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if issuer is approved
  if (profile && 'is_approved' in profile && !profile.is_approved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Approval Pending</h2>
            <p className="text-muted-foreground mb-4">
              Your issuer account is pending owner approval. You will be notified once approved.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if blockchain integration failed
  if (profile && 'blockchain_registration_tx' in profile && 
      profile.blockchain_registration_tx === 'blockchain_integration_failed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Blockchain Integration Failed</h2>
            <p className="text-muted-foreground mb-4">
              Your account is approved but blockchain integration failed. Please contact the owner to resolve this issue.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if ready for integration (legacy state)
  if (profile && 'blockchain_registration_tx' in profile && 
      profile.blockchain_registration_tx === 'pending_blockchain_integration') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Blockchain Integration Pending</h2>
            <p className="text-muted-foreground mb-4">
              Your account is approved but blockchain integration is pending. Please contact the owner to complete the integration.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleUploadComplete = (result: any) => {
    setUploadComplete(true)
    setUploadResult(result)
    setError('')
    
    // Automatically navigate to dashboard after a short delay to show success message
    setTimeout(() => {
      navigate('/dashboard')
    }, 2000) // 2 second delay to show success message
  }

  const handleUploadError = (error: string) => {
    setError(error)
    setUploadComplete(false)
  }

  const handleNewUpload = () => {
    setUploadComplete(false)
    setUploadResult(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-foreground">Issue Documents</h1>
            <p className="text-muted-foreground">
              Issuer: <span className="font-medium">{profile?.name}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Blockchain Connection Status */}
            {(!isConnected || !isCorrectNetwork) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>Blockchain Connection Required</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BlockchainIntegration
                    onTransactionComplete={() => {}}
                    onError={setError}
                  />
                  
                  {/* Additional help text */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Need help?</strong> Make sure you have MetaMask installed and your wallet is connected. 
                      If you're already on Polygon Amoy, try refreshing the page.
                    </p>
                  </div>
                </CardContent>
              </Card>

            ) : (
              <>
                {/* Document Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>Document Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentUploader
                      issuerId={profile?.issuerId || ''}
                      mode={issuanceMode}
                      onModeChange={setIssuanceMode}
                      onUploadComplete={handleUploadComplete}
                      onError={handleUploadError}
                      disabled={uploadComplete}
                    />
                  </CardContent>
                </Card>

                {/* Upload Complete */}
                {uploadComplete && uploadResult && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <span>Documents Issued Successfully</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-green-800">
                        {uploadResult.isNewBatch 
                          ? `Your ${uploadResult.mode === 'single' ? 'document has' : 'documents have'} been successfully processed and anchored to the blockchain.`
                          : `Your documents have been successfully added to the existing batch "${uploadResult.existingBatchId}". The batch now contains ${uploadResult.totalDocuments} documents total.`
                        }
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-green-700">Merkle Root</p>
                          <p className="font-mono text-sm bg-green-100 p-2 rounded">
                            {uploadResult.merkleRoot}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700">Transaction Hash</p>
                          <p className="font-mono text-sm bg-green-100 p-2 rounded">
                            {uploadResult.txHash}
                          </p>
                        </div>
                        {uploadResult.mode === 'batch' && (
                          <>
                            <div>
                              <p className="text-sm font-medium text-green-700">Batch Status</p>
                              <p className="text-sm bg-green-100 p-2 rounded">
                                {uploadResult.isNewBatch ? 'New Batch Created' : 'Existing Batch Extended'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-700">Total Documents</p>
                              <p className="text-sm bg-green-100 p-2 rounded">
                                {uploadResult.totalDocuments || uploadResult.fileCount}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleNewUpload} variant="outline">
                          Issue More Documents
                        </Button>
                        <Button onClick={() => navigate('/dashboard')}>
                          Go to Dashboard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Error Display */}
                {error && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>

          {/* Worker Status Check - Always visible */}
          <WorkerStatusCard 
            checkWorkerStatus={checkWorkerStatus}
            addWorker={addWorker}
            getContractOwner={getContractOwner}
          />

          {/* Information Panel */}
          <div className="space-y-6">
            {/* Issuance Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5 text-primary" />
                  <span>Issuance Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Single Document</h4>
                  <p className="text-sm text-muted-foreground">
                    Issue individual documents one at a time. Each document gets its own blockchain transaction.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Batch Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Issue multiple documents together using Merkle trees for cost-efficient blockchain anchoring.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Blockchain Network</h4>
                  <p className="text-sm text-muted-foreground">
                    Documents are anchored on the Polygon Amoy testnet for fast, low-cost transactions.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Security</h4>
                  <p className="text-sm text-muted-foreground">
                    All documents are cryptographically signed and hashed before blockchain anchoring.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Process Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Process Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">1</span>
                    <span className="text-muted-foreground">Document details are hashed using SHA-256</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">2</span>
                    <span className="text-muted-foreground">Hash is signed with your private key</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">3</span>
                    <span className="text-muted-foreground">Signature is anchored on blockchain</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">4</span>
                    <span className="text-muted-foreground">Verification metadata is generated</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Document Authenticity */}
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Document Authenticity</strong><br />
                This document will be signed with your private key and anchored to the blockchain, ensuring it cannot be tampered with.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </div>
  )
}
