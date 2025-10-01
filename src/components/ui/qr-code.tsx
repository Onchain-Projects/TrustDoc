import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QrCode, Download, Copy, Check, Camera, CameraOff } from 'lucide-react'

interface QRCodeProps {
  merkleRoot: string
  documentName?: string
  issuerName?: string
  issueDate?: string
  className?: string
}

export const QRCodeGenerator: React.FC<QRCodeProps> = ({
  merkleRoot,
  documentName = "Document",
  issuerName = "Issuer",
  issueDate,
  className = ""
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  // Generate QR code data
  const qrData = {
    merkleRoot,
    documentName,
    issuerName,
    issueDate: issueDate || new Date().toISOString(),
    verificationUrl: `${window.location.origin}/verify?root=${merkleRoot}`,
    timestamp: Date.now()
  }

  useEffect(() => {
    generateQRCode()
  }, [merkleRoot])

  const generateQRCode = async () => {
    try {
      // Generate QR code using online service as fallback
      const qrText = JSON.stringify(qrData, null, 2)
      
      // Use QR Server API to generate QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrText)}`
      
      // Convert to data URL by fetching the image
      const response = await fetch(qrCodeUrl)
      if (!response.ok) {
        throw new Error('Failed to generate QR code from service')
      }
      
      const blob = await response.blob()
      const reader = new FileReader()
      
      reader.onload = () => {
        setQrCodeDataUrl(reader.result as string)
        setError('')
      }
      
      reader.onerror = () => {
        setError('Failed to process QR code image')
      }
      
      reader.readAsDataURL(blob)
    } catch (err: any) {
      setError(`Failed to generate QR code: ${err.message}`)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(merkleRoot)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return
    
    const link = document.createElement('a')
    link.href = qrCodeDataUrl
    link.download = `qr-code-${documentName.replace(/[^a-zA-Z0-9]/g, '-')}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>Document QR Code</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* QR Code Display */}
        <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
          {qrCodeDataUrl ? (
            <div className="text-center">
              <div className="w-48 h-48 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center mb-4 p-2">
                <img 
                  src={qrCodeDataUrl} 
                  alt="Document QR Code" 
                  className="max-w-full max-h-full"
                />
              </div>
              <p className="text-xs text-gray-600">
                Scan this QR code to verify the document
              </p>
            </div>
          ) : (
            <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-gray-500">Generating QR Code...</div>
            </div>
          )}
        </div>

        {/* Document Info */}
        <div className="space-y-2">
          <div>
            <Label className="text-sm font-medium">Document Name</Label>
            <div className="text-sm text-muted-foreground">{documentName}</div>
          </div>
          <div>
            <Label className="text-sm font-medium">Issuer</Label>
            <div className="text-sm text-muted-foreground">{issuerName}</div>
          </div>
          <div>
            <Label className="text-sm font-medium">Merkle Root</Label>
            <div className="flex items-center space-x-2">
              <Input
                value={merkleRoot}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copy Merkle Root"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={downloadQRCode}
            className="flex-1"
            disabled={!qrCodeDataUrl}
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>

        {/* Verification URL */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Label className="text-sm font-medium text-blue-800">Verification URL</Label>
          <div className="text-xs text-blue-600 mt-1 break-all">
            {qrData.verificationUrl}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// QR Code Scanner Component (for verification)
export const QRCodeScanner: React.FC<{
  onScan: (data: string) => void
  onError?: (error: string) => void
}> = ({ onScan, onError }) => {
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // For now, we'll use a simple approach - ask user to paste the QR code content
    // In a real implementation, you'd use a QR code decoding library
    setError('')
    
    // Show a prompt for manual QR code content entry
    const qrContent = prompt(
      'Please paste the QR code content or Merkle root here:',
      ''
    )
    
    if (qrContent && qrContent.trim()) {
      try {
        // Try to parse as JSON first (full QR data)
        const parsedData = JSON.parse(qrContent)
        if (parsedData.merkleRoot) {
          onScan(parsedData.merkleRoot)
        } else {
          onScan(qrContent)
        }
      } catch {
        // If not JSON, treat as direct Merkle root
        onScan(qrContent.trim())
      }
    }
  }

  const handleManualInput = () => {
    const qrContent = prompt(
      'Please enter the QR code content or Merkle root:',
      ''
    )
    
    if (qrContent && qrContent.trim()) {
      try {
        // Try to parse as JSON first (full QR data)
        const parsedData = JSON.parse(qrContent)
        if (parsedData.merkleRoot) {
          onScan(parsedData.merkleRoot)
        } else {
          onScan(qrContent)
        }
      } catch {
        // If not JSON, treat as direct Merkle root
        onScan(qrContent.trim())
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span>QR Code Verification</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* QR Code Input Methods */}
        <div className="space-y-4">
          {/* Manual Input */}
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              Enter QR code content manually
            </p>
            <Button
              onClick={handleManualInput}
              variant="outline"
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Enter QR Code Content
            </Button>
          </div>

          {/* File Upload (for future QR image processing) */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-2">
              Upload QR Code Image (Coming Soon)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled
            >
              <Camera className="w-4 h-4 mr-2" />
              Upload QR Image
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 text-center space-y-1">
          <p><strong>Option 1:</strong> Copy the QR code content and paste it manually</p>
          <p><strong>Option 2:</strong> Use the manual verification method below</p>
        </div>
      </CardContent>
    </Card>
  )
}
