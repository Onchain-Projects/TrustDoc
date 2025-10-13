import React, { useState, useRef } from 'react'
import { verifyDocument } from '@/lib/verification'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Shield
} from 'lucide-react'

interface DocumentVerifierProps {
  onVerificationComplete?: (result: any) => void
  onVerificationStart?: () => void
  disabled?: boolean
}

export const DocumentVerifier: React.FC<DocumentVerifierProps> = ({
  onVerificationComplete,
  onVerificationStart,
  disabled = false
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [verificationStage, setVerificationStage] = useState<'idle' | 'uploading' | 'verifying' | 'complete'>('idle')
  const [verificationProgress, setVerificationProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError('')
    }
  }

  // Remove file
  const removeFile = () => {
    setFile(null)
    setError('')
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle verification
  const handleVerification = async () => {
    if (!file) {
      setError('Please select a file to verify')
      return
    }

    setVerificationStage('verifying')
    setVerificationProgress(0)
    setError('')
    onVerificationStart?.()

    try {
      // Verify document directly using Supabase - no backend API needed!
      console.log('🔍 Starting document verification...')
      setVerificationProgress(20)

      // Call the verification service directly
      const result = await verifyDocument(file)
      
      console.log('✅ Verification complete:', result)
      setVerificationProgress(100)
      setVerificationStage('complete')

      onVerificationComplete?.(result)

    } catch (error: any) {
      console.error('❌ Verification error:', error)
      setError(error.message)
      setVerificationStage('idle')
      setVerificationProgress(0)
    }
  }

  const getStageMessage = () => {
    switch (verificationStage) {
      case 'uploading':
        return 'Uploading document for verification...'
      case 'verifying':
        return 'Verifying document authenticity...'
      case 'complete':
        return 'Verification complete!'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div>
        <div
          ref={dropRef}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            {dragActive ? 'Drop your document here' : 'Upload Document to Verify'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Click to upload or drag and drop your document
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* Selected File */}
      {file && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)} • {file.type}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={disabled}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Verification Progress */}
      {verificationStage !== 'idle' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{getStageMessage()}</span>
            <span className="text-sm text-muted-foreground">{verificationProgress}%</span>
          </div>
          <Progress value={verificationProgress} className="w-full" />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleVerification}
          disabled={!file || verificationStage !== 'idle' || disabled}
          size="lg"
          className="min-w-[200px]"
        >
          {verificationStage === 'idle' ? (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Verify Document
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {getStageMessage()}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
