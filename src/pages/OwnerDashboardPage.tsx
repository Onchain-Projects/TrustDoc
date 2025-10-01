import React, { useState, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileCheck, 
  History, 
  QrCode, 
  Upload, 
  Shield, 
  CheckCircle, 
  XCircle,
  Clock,
  User
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QRCodeScanner } from '@/components/ui/qr-code'
import { BatchVerification } from '@/components/ui/batch-verification'

interface VerificationRecord {
  id: string
  documentHash: string
  merkleRoot: string
  verificationResult: boolean
  verificationDate: Date
  issuerId: string
  documentName: string
  verificationMethod: string
}

export const OwnerDashboardPage: React.FC = () => {
  const { user, profile, userType } = useAuthContext()
  const navigate = useNavigate()
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([])
  const [stats, setStats] = useState({
    totalVerifications: 0,
    validVerifications: 0,
    invalidVerifications: 0,
    lastVerification: null as Date | null
  })

  // Redirect if not authenticated or not an owner
  if (!user || userType !== 'owner') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              Only authenticated owners can access this page.
            </p>
            <Button onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    loadVerificationHistory()
  }, [])

  const loadVerificationHistory = async () => {
    try {
      // Mock data for now - replace with real API call
      const mockHistory: VerificationRecord[] = [
        {
          id: '1',
          documentHash: '0x123...abc',
          merkleRoot: '0x456...def',
          verificationResult: true,
          verificationDate: new Date('2024-01-15'),
          issuerId: 'issuer_123',
          documentName: 'Certificate of Completion',
          verificationMethod: 'qr_code'
        },
        {
          id: '2',
          documentHash: '0x789...ghi',
          merkleRoot: '0x012...jkl',
          verificationResult: false,
          verificationDate: new Date('2024-01-14'),
          issuerId: 'issuer_456',
          documentName: 'Training Certificate',
          verificationMethod: 'manual'
        }
      ]
      
      setVerificationHistory(mockHistory)
      
      // Calculate stats
      const total = mockHistory.length
      const valid = mockHistory.filter(v => v.verificationResult).length
      const invalid = total - valid
      const lastVerification = mockHistory.length > 0 
        ? new Date(Math.max(...mockHistory.map(v => v.verificationDate.getTime())))
        : null
      
      setStats({
        totalVerifications: total,
        validVerifications: valid,
        invalidVerifications: invalid,
        lastVerification
      })
    } catch (error) {
      console.error('Error loading verification history:', error)
    }
  }

  const handleQRScan = (data: string) => {
    try {
      const qrData = JSON.parse(data)
      if (qrData.merkleRoot) {
        // Navigate to verification page with pre-filled data
        navigate(`/verify?root=${qrData.merkleRoot}`)
      }
    } catch (error) {
      // If not JSON, treat as direct Merkle root
      navigate(`/verify?root=${data}`)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Owner Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Welcome back, {profile?.name || 'Owner'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => navigate('/verify')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <QrCode className="w-6 h-6" />
                    <span>Verify Document</span>
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/verify')}
                    className="h-20 flex flex-col items-center justify-center space-y-2"
                  >
                    <Upload className="w-6 h-6" />
                    <span>Upload & Verify</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  <span>QR Code Scanner</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QRCodeScanner
                  onScan={handleQRScan}
                  onError={(error) => console.error('QR Scan error:', error)}
                />
              </CardContent>
            </Card>

            {/* Batch Verification */}
            <BatchVerification />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Verification Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.totalVerifications}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.validVerifications}</div>
                    <div className="text-sm text-muted-foreground">Valid</div>
                  </div>
                </div>
                
                {stats.lastVerification && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Last verification: {stats.lastVerification.toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Verifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-primary" />
                  <span>Recent Verifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verificationHistory.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{record.documentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.verificationDate.toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {record.verificationResult ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <Badge variant={record.verificationResult ? "default" : "destructive"}>
                          {record.verificationResult ? 'Valid' : 'Invalid'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {verificationHistory.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No verifications yet</p>
                    </div>
                  )}
                </div>
                
                {verificationHistory.length > 5 && (
                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate('/owner/history')}
                    >
                      View All History
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
