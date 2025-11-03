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
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-primary bg-gradient-to-br from-primary/10 to-purple-500/10 scale-[1.02] shadow-lg shadow-primary/20' 
              : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30 hover:shadow-md'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 ${
            dragActive ? 'bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-100' : 'opacity-0'
          }`} />
          <div className="relative z-10">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
              dragActive 
                ? 'bg-gradient-to-br from-primary to-purple-600 shadow-xl shadow-primary/30 scale-110' 
                : 'bg-gradient-to-br from-primary/10 to-purple-500/10 hover:scale-105'
            }`}>
              <Shield className={`w-10 h-10 transition-colors duration-300 ${
                dragActive ? 'text-white' : 'text-primary'
              }`} />
            </div>
            <p className="text-xl font-semibold mb-3">
              {dragActive ? (
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  Drop your document here
                </span>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Upload Document to Verify
                  </span>
                </>
              )}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Click to upload or drag and drop your document
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX
            </p>
          </div>
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
        <div className="border rounded-xl p-5 bg-gradient-to-r from-muted/60 to-muted/40 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatFileSize(file.size)} • {file.type}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              disabled={disabled}
              className="hover:bg-destructive/10 hover:text-destructive"
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
