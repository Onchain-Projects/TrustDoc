import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Trash2,
  File,
  FileImage
} from 'lucide-react'

interface BatchVerificationProps {
  onVerifyBatch?: (files: File[]) => void
  className?: string
}

interface VerificationResult {
  file: File
  isValid: boolean
  merkleRoot?: string
  issuerName?: string
  issueDate?: string
  error?: string
}

export const BatchVerification: React.FC<BatchVerificationProps> = ({
  onVerifyBatch,
  className = ""
}) => {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<VerificationResult[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setError('')
    if (event.dataTransfer.files) {
      const newFiles = Array.from(event.dataTransfer.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setResults(prev => prev.filter((_, i) => i !== index))
  }

  const generateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `0x${hashHex}`
  }

  const verifyBatch = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to verify')
      return
    }

    setIsVerifying(true)
    setError('')
    setResults([])

    try {
      const { documentService } = await import('@/lib/documents')
      const verificationResults: VerificationResult[] = []

      for (const file of files) {
        try {
          const fileHash = await generateFileHash(file)
          const verificationResult = await documentService.verifyDocument(fileHash)
          
          verificationResults.push({
            file,
            isValid: verificationResult.isValid,
            merkleRoot: verificationResult.proof?.merkle_root,
            issuerName: verificationResult.proof?.proof_json?.issuerName,
            issueDate: verificationResult.proof?.created_at,
            error: verificationResult.isValid ? undefined : verificationResult.message
          })
        } catch (error: any) {
          verificationResults.push({
            file,
            isValid: false,
            error: error.message
          })
        }
      }

      setResults(verificationResults)
    } catch (error: any) {
      setError(`Batch verification failed: ${error.message}`)
    } finally {
      setIsVerifying(false)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="w-5 h-5 text-muted-foreground" />
    }
    return <File className="w-5 h-5 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validCount = results.filter(r => r.isValid).length
  const invalidCount = results.filter(r => !r.isValid).length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-primary" />
          <span>Batch Document Verification</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload multiple documents to verify them all at once
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById('batch-file-input')?.click()}
        >
          <Input
            id="batch-file-input"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
            disabled={isVerifying}
          />
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500 mt-1">
            Multiple files, max 10MB each
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supported: PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX
          </p>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Selected Files ({files.length})</h3>
              <Button
                onClick={verifyBatch}
                disabled={isVerifying}
                className="flex items-center space-x-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Verify All</span>
                  </>
                )}
              </Button>
            </div>
            
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-secondary/50">
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type.split('/')[1]?.toUpperCase() || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {results[index] && (
                    <Badge 
                      variant={results[index].isValid ? "default" : "destructive"}
                      className={results[index].isValid ? "bg-green-600" : ""}
                    >
                      {results[index].isValid ? "Valid" : "Invalid"}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    disabled={isVerifying}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verification Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold">Verification Results</h3>
              <div className="flex space-x-2">
                <Badge variant="default" className="bg-green-600">
                  Valid: {validCount}
                </Badge>
                <Badge variant="destructive">
                  Invalid: {invalidCount}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {result.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium">{result.file.name}</span>
                    </div>
                    <Badge 
                      variant={result.isValid ? "default" : "destructive"}
                      className={result.isValid ? "bg-green-600" : ""}
                    >
                      {result.isValid ? "Verified" : "Not Found"}
                    </Badge>
                  </div>
                  
                  {result.isValid ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div><strong>Issuer:</strong> {result.issuerName || "Unknown"}</div>
                      <div><strong>Issue Date:</strong> {result.issueDate ? new Date(result.issueDate).toLocaleDateString() : "Unknown"}</div>
                      <div><strong>Merkle Root:</strong> <code className="text-xs">{result.merkleRoot}</code></div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      <strong>Error:</strong> {result.error || "Document not found in database"}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
      </CardContent>
    </Card>
  )
}
