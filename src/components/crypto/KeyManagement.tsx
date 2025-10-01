import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Key, 
  RotateCcw, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle,
  AlertTriangle,
  Shield,
  Clock,
  Fingerprint
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { KeyManagementService } from '@/lib/crypto/key-management'
import { CryptographicKeyService } from '@/lib/crypto/keys'

interface KeyManagementProps {
  issuerId: string
  onKeyRotated?: () => void
}

export const KeyManagement: React.FC<KeyManagementProps> = ({
  issuerId,
  onKeyRotated
}) => {
  const [keyInfo, setKeyInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [password, setPassword] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const { toast } = useToast()

  // Load key information
  useEffect(() => {
    loadKeyInfo()
  }, [issuerId])

  const loadKeyInfo = async () => {
    try {
      setLoading(true)
      const validation = await KeyManagementService.validateIssuerKeys(issuerId, password)
      setKeyInfo(validation)
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRotateKeys = async () => {
    try {
      setLoading(true)
      const result = await KeyManagementService.rotateKeys(issuerId, 'ec', password)
      
      if (result.success) {
        toast({
          title: "Keys Rotated Successfully",
          description: "Your cryptographic keys have been rotated successfully.",
        })
        await loadKeyInfo()
        onKeyRotated?.()
      } else {
        throw new Error(result.error || 'Key rotation failed')
      }
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Key Rotation Failed",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBackup = async () => {
    try {
      if (!password) {
        toast({
          title: "Password Required",
          description: "Please enter your password to download the key backup.",
          variant: "destructive"
        })
        return
      }

      setLoading(true)
      const backup = await KeyManagementService.backupKeyPair(issuerId, password)
      
      // Create and download file
      const blob = new Blob([backup], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `key-backup-${issuerId}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Backup Downloaded",
        description: "Your key backup has been downloaded successfully.",
      })
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Backup Failed",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      if (!password) {
        toast({
          title: "Password Required",
          description: "Please enter your password to restore the key backup.",
          variant: "destructive"
        })
        return
      }

      setLoading(true)
      const backupData = await file.text()
      await KeyManagementService.restoreKeyPair(issuerId, backupData, password)
      
      toast({
        title: "Backup Restored",
        description: "Your key backup has been restored successfully.",
      })
      await loadKeyInfo()
      onKeyRotated?.()
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Restore Failed",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast({
        description: `${fieldName} copied to clipboard`,
      })
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const getKeyStatusBadge = () => {
    if (!keyInfo) return null
    
    if (!keyInfo.isValid) {
      return <Badge variant="destructive">Invalid</Badge>
    }
    
    if (keyInfo.keyInfo?.isExpired) {
      return <Badge variant="secondary">Expired</Badge>
    }
    
    return <Badge variant="default" className="bg-green-600">Valid</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Password Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Key Access</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password for Key Operations</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to access key operations"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your password is used to encrypt/decrypt your private keys
              </p>
            </div>
            <Button onClick={loadKeyInfo} disabled={loading}>
              {loading ? 'Loading...' : 'Load Key Information'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Information */}
      {keyInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-primary" />
                <span>Key Information</span>
              </div>
              {getKeyStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyInfo.keyInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Key ID</Label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-mono">{keyInfo.keyInfo.keyId}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToClipboard(keyInfo.keyInfo.keyId, "Key ID")}
                    >
                      {copiedField === "Key ID" ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Algorithm</Label>
                  <p className="text-sm">{keyInfo.keyInfo.algorithm.toUpperCase()}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Key Size</Label>
                  <p className="text-sm">{keyInfo.keyInfo.keySize} bits</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Fingerprint</Label>
                  <div className="flex items-center space-x-2">
                    <Fingerprint className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-mono">{keyInfo.keyInfo.fingerprint}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{new Date(keyInfo.keyInfo.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm">
                    {keyInfo.keyInfo.isExpired ? 'Expired' : 'Active'}
                  </p>
                </div>
              </div>
            )}

            {/* Validation Results */}
            {keyInfo.errors.length > 0 && (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-1">
                    <p className="font-medium">Validation Errors:</p>
                    {keyInfo.errors.map((error: string, index: number) => (
                      <p key={index} className="text-sm">• {error}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {keyInfo.warnings.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <div className="space-y-1">
                    <p className="font-medium">Warnings:</p>
                    {keyInfo.warnings.map((warning: string, index: number) => (
                      <p key={index} className="text-sm">• {warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Key Management Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={handleRotateKeys}
              disabled={loading || !password}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rotate Keys</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleDownloadBackup}
              disabled={loading || !password}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup</span>
            </Button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading || !password}
              />
              <Button
                variant="outline"
                disabled={loading || !password}
                className="flex items-center space-x-2 w-full"
              >
                <Upload className="w-4 h-4" />
                <span>Restore Backup</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
