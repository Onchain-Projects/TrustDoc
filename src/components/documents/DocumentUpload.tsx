import React, { useState, useRef } from 'react'
import { useBlockchainOperations } from '@/hooks/useBlockchain'
import { uploadFilesAndGenerateMerkleRoot, confirmAndStoreProof } from '@/lib/upload-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Trash2
} from 'lucide-react'

interface DocumentUploadProps {
  issuerId: string
  onUploadComplete?: (result: any) => void
  onError?: (error: string) => void
}

interface UploadedFile {
  file: File
  hash: string
  id: string
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  issuerId,
  onUploadComplete,
  onError
}) => {
  const {
    isConnected,
    isCorrectNetwork,
    putRoot,
    transactionState,
    clearError
  } = useBlockchainOperations()

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'blockchain' | 'confirming' | 'complete'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [merkleRoot, setMerkleRoot] = useState('')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    
    if (selectedFiles.length === 0) return

    // Validate file count
    if (files.length + selectedFiles.length > 20) {
      setError('Maximum 20 files allowed')
      return
    }

    // Process files and generate hashes
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      hash: '', // Will be generated on upload
      id: Math.random().toString(36).substr(2, 9)
    }))

    setFiles(prev => [...prev, ...newFiles])
    setError('')
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleUpload = async () => {
    if (!isConnected || !isCorrectNetwork) {
      setError('Please connect your wallet and switch to Polygon Amoy network')
      return
    }

    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    setUploadStage('uploading')
    setUploadProgress(0)
    setError('')

    try {
      // Step 1: Upload files to Supabase and generate Merkle tree
      // This calls Supabase DIRECTLY - no backend needed!
      setUploadProgress(10)
      console.log('📤 Uploading files to Supabase Storage...')
      
      const fileObjects = files.map(f => f.file)
      const uploadResult = await uploadFilesAndGenerateMerkleRoot(
        fileObjects,
        issuerId,
        description,
        expiryDate
      )

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      console.log('✅ Files uploaded, Merkle root:', uploadResult.merkleRoot)
      setMerkleRoot(uploadResult.merkleRoot!)
      setUploadProgress(30)

      // Step 2: Store Merkle root on blockchain via MetaMask
      setUploadStage('blockchain')
      setUploadProgress(50)
      console.log('⛓️ Storing Merkle root on blockchain...')

      const blockchainResult = await putRoot(uploadResult.merkleRoot!)
      setTxHash(blockchainResult.txHash)
      console.log('✅ Blockchain transaction complete:', blockchainResult.txHash)
      setUploadProgress(70)

      // Step 3: Sign and store proof in Supabase
      // This also calls Supabase DIRECTLY - no backend!
      setUploadStage('confirming')
      setUploadProgress(85)
      console.log('💾 Storing proof in Supabase...')

      const confirmResult = await confirmAndStoreProof(
        issuerId,
        uploadResult.batch!,
        uploadResult.merkleRoot!,
        uploadResult.filePaths!,
        fileObjects,
        expiryDate,
        description
      )

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Confirmation failed')
      }

      console.log('✅ Proof stored successfully!')
      setUploadProgress(100)
      setUploadStage('complete')

      onUploadComplete?.({
        merkleRoot: uploadResult.merkleRoot,
        batch: uploadResult.batch,
        txHash: blockchainResult.txHash,
        fileCount: files.length
      })

    } catch (error: any) {
      console.error('❌ Upload error:', error)
      setError(error.message)
      setUploadStage('idle')
      setUploadProgress(0)
      onError?.(error.message)
    }
  }

  const resetUpload = () => {
    setFiles([])
    setDescription('')
    setExpiryDate('')
    setUploadStage('idle')
    setUploadProgress(0)
    setMerkleRoot('')
    setTxHash('')
    setError('')
    clearError()
  }

  const getStageMessage = () => {
    switch (uploadStage) {
      case 'uploading':
        return 'Uploading files and generating Merkle tree...'
      case 'blockchain':
        return 'Storing Merkle root on blockchain...'
      case 'confirming':
        return 'Confirming and storing proof...'
      case 'complete':
        return 'Upload complete!'
      default:
        return ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Documents</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="files">Select Files</Label>
            <Input
              ref={fileInputRef}
              id="files"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploadStage !== 'idle'}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Maximum 20 files, 10MB each. Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG
            </p>
          </div>

          {/* Selected Files */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {files.map(fileObj => (
                  <div
                    key={fileObj.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{fileObj.file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(fileObj.file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileObj.id)}
                      disabled={uploadStage !== 'idle'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Batch description"
              disabled={uploadStage !== 'idle'}
            />
          </div>
          <div>
            <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={uploadStage !== 'idle'}
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploadStage !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{getStageMessage()}</span>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Blockchain Transaction Status */}
        {transactionState.isPending && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-2">
                <p>Blockchain transaction pending...</p>
                {transactionState.txHash && (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${transactionState.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <span className="font-mono text-sm mr-1">
                      {transactionState.txHash.slice(0, 10)}...
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {uploadStage === 'complete' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p>Documents uploaded and anchored to blockchain successfully!</p>
                <div className="space-y-1">
                  <p className="text-sm">Merkle Root: <code className="bg-green-100 px-1 rounded">{merkleRoot}</code></p>
                  {txHash && (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-green-600 hover:text-green-800"
                    >
                      <span className="font-mono text-sm mr-1">
                        Transaction: {txHash.slice(0, 10)}...
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {uploadStage === 'complete' ? (
            <Button onClick={resetUpload} className="flex-1">
              Upload More Documents
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploadStage !== 'idle' || !isConnected || !isCorrectNetwork}
              className="flex-1"
            >
              {uploadStage === 'idle' ? (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {getStageMessage()}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
