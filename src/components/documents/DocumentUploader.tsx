import React, { useState, useRef, useCallback } from 'react'
import { useBlockchainOperations } from '@/hooks/useBlockchain'
import { hashFileWithKeccak256 } from '@/lib/verification'
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Trash2,
  File,
  Image,
  FileImage,
  FileType,
  Eye,
  Download,
  Layers
} from 'lucide-react'

interface DocumentUploaderProps {
  issuerId: string
  mode: 'single' | 'batch'
  onModeChange?: (mode: 'single' | 'batch') => void
  onUploadComplete?: (result: any) => void
  onError?: (error: string) => void
  disabled?: boolean
}

interface UploadedFile {
  file: File
  hash: string
  id: string
  preview?: string
  size: number
  type: string
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': { icon: FileText, color: 'text-red-600', label: 'PDF' },
  'image/jpeg': { icon: Image, color: 'text-blue-600', label: 'JPEG' },
  'image/jpg': { icon: Image, color: 'text-blue-600', label: 'JPG' },
  'image/png': { icon: Image, color: 'text-green-600', label: 'PNG' },
  'application/msword': { icon: FileType, color: 'text-blue-600', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileType, color: 'text-blue-600', label: 'DOCX' },
  'text/plain': { icon: FileText, color: 'text-gray-600', label: 'TXT' },
  'application/vnd.ms-excel': { icon: FileType, color: 'text-green-600', label: 'XLS' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileType, color: 'text-green-600', label: 'XLSX' }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 1000

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  issuerId,
  mode,
  onModeChange,
  onUploadComplete,
  onError,
  disabled = false
}) => {
  const { putRoot, transactionState } = useBlockchainOperations()

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  // Helper function to generate file hash using keccak256 (matches Real TrustDoc)
  const generateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    return hashFileWithKeccak256(arrayBuffer)
  }
  
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [documentName, setDocumentName] = useState('')
  const [batchName, setBatchName] = useState('')
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'blockchain' | 'confirming' | 'complete'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [merkleRoot, setMerkleRoot] = useState('')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} is too large. Maximum size is 10MB.`
    }
    
    if (!ACCEPTED_FILE_TYPES[file.type as keyof typeof ACCEPTED_FILE_TYPES]) {
      return `File type ${file.type} is not supported.`
    }
    
    return null
  }


  // Generate file preview
  const generatePreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return undefined
  }

  // Process files
  const processFiles = async (fileList: FileList) => {
    const newFiles: UploadedFile[] = []
    
    for (const file of Array.from(fileList)) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      
      const hash = await generateFileHash(file)
      const preview = generatePreview(file)
      
      newFiles.push({
        file,
        hash,
        id: Math.random().toString(36).substr(2, 9),
        preview,
        size: file.size,
        type: file.type
      })
    }
    
    setFiles(prev => [...prev, ...newFiles])
    setError('')
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      if (files.length + selectedFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`)
        return
      }
      processFiles(selectedFiles)
    }
  }

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled) return
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      if (files.length + droppedFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`)
        return
      }
      processFiles(droppedFiles)
    }
  }, [files.length, disabled])

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  // Get file icon
  const getFileIcon = (type: string) => {
    const fileType = ACCEPTED_FILE_TYPES[type as keyof typeof ACCEPTED_FILE_TYPES]
    if (fileType) {
      const IconComponent = fileType.icon
      return <IconComponent className={`w-4 h-4 ${fileType.color}`} />
    }
    return <File className="w-4 h-4 text-gray-600" />
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle upload (matches Real TrustDoc structure)
  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    if (mode === 'single' && files.length > 1) {
      setError('Single mode only allows one file')
      return
    }

    if (!documentName.trim()) {
      setError('Please enter a document name')
      return
    }

    if (mode === 'batch' && !batchName.trim()) {
      setError('Please enter a batch name for batch processing')
      return
    }

    setUploadStage('uploading')
    setUploadProgress(0)
    setError('')

    try {
      // Step 1: Generate file hashes using keccak256
      setUploadProgress(10)
      
      const fileData = await Promise.all(
        files.map(async (fileObj) => {
          const hash = await generateFileHash(fileObj.file)
          return {
            name: fileObj.file.name,
            size: fileObj.file.size,
            type: fileObj.file.type,
            hash
          }
        })
      )

      console.log('📄 File hashes generated (keccak256):', fileData.map(f => f.hash))
      setUploadProgress(25)

      // Step 2: Build Merkle tree from hashes
      const leaves = fileData.map(f => f.hash)
      const leavesBuf = leaves.map(x => Buffer.from(x.replace(/^0x/, ''), 'hex'))
      
      const tree = new MerkleTree(
        leavesBuf,
        (data) => {
          const hash = ethers.keccak256(data)
          return Buffer.from(hash.slice(2), 'hex')
        },
        { sortPairs: true }
      )
      
      const merkleRoot = '0x' + tree.getRoot().toString('hex')
      console.log('🌳 Merkle root generated:', merkleRoot)
      
      // Generate Merkle proofs for each document
      const merkleProofs = leaves.map((_, index) => {
        const proof = tree.getHexProof(leavesBuf[index])
        return proof
      })
      
      setMerkleRoot(merkleRoot)
      setUploadProgress(40)

      // Step 3: Store Merkle root on blockchain
      setUploadStage('blockchain')
      console.log('⛓️ Storing Merkle root on blockchain...')
      
      const blockchainResult = await putRoot(merkleRoot)
      
      if (!blockchainResult.success) {
        throw new Error(blockchainResult.error || 'Blockchain interaction failed')
      }
      
      setTxHash(blockchainResult.txHash)
      console.log('✅ Blockchain transaction:', blockchainResult.txHash)
      setUploadProgress(70)

      // Step 4: Sign Merkle root with issuer's private key
      setUploadStage('confirming')
      console.log('🔐 Signing Merkle root...')
      
      // Get issuer's private key
      const { supabase } = await import('@/lib/supabase')
      const { data: issuerData } = await supabase
        .from('issuers')
        .select('private_key, public_key')
        .eq('issuer_id', issuerId)
        .single()
      
      if (!issuerData) {
        throw new Error('Issuer not found')
      }

      // Sign Merkle root
      const wallet = new ethers.Wallet(issuerData.private_key)
      const merkleRootBytes = ethers.getBytes(merkleRoot)
      const signature = await wallet.signMessage(merkleRootBytes)
      console.log('✅ Signature generated:', signature)
      
      setUploadProgress(85)

      // Step 5: Store proof in Supabase (matches Real TrustDoc MongoDB structure)
      const batchId = mode === 'batch' && batchName ? 
        `batch_${batchName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}` : 
        `single_${Date.now()}`
      
      const explorerUrl = `https://amoy.polygonscan.com/tx/${blockchainResult.txHash}`
      
      // Create proof_json structure matching MongoDB format
      const proofJson = {
        proofs: [{
          merkleRoot: merkleRoot,
          leaves: leaves,
          files: fileData.map(f => f.name),
          proofs: merkleProofs,
          signature: signature,
          timestamp: new Date().toISOString()
        }],
        network: 'Polygon Amoy',
        explorerUrl: explorerUrl,
        issuerPublicKey: issuerData.public_key
      }
      
      const proofData = {
        issuer_id: issuerId,
        batch: batchId,
        merkle_root: merkleRoot,
        proof_json: proofJson,
        signature: signature,
        file_paths: fileData.map((f, i) => `uploads/${batchId}/${i}_${f.name}`),
        expiry_date: expiryDate || null,
        description: description || null
      }

      console.log('💾 Storing proof in database:', proofData)
      
      const { documentService } = await import('@/lib/documents')
      const proof = await documentService.createProof(proofData)
      console.log('✅ Proof stored successfully')

      setUploadProgress(100)
      setUploadStage('complete')

      onUploadComplete?.({
        merkleRoot: merkleRoot,
        batch: batchId,
        txHash: blockchainResult.txHash,
        fileCount: files.length,
        documentName,
        mode,
        proof,
        isNewBatch: true,
        totalDocuments: files.length
      })

    } catch (error: any) {
      console.error('❌ Upload error:', error)
      setError(error.message || 'Upload failed')
      setUploadStage('idle')
      setUploadProgress(0)
      onError?.(error.message || 'Upload failed')
    }
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
    <div className="space-y-6">
      {/* Issuance Mode */}
      <div className="flex space-x-2">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => {
            onModeChange?.('single')
            // Clean up file previews to prevent memory leaks
            files.forEach(f => {
              if (f.preview) URL.revokeObjectURL(f.preview)
            })
            // Clear all state when switching to single mode
            setFiles([])
            setDocumentName('')
            setBatchName('')
            setDescription('')
            setExpiryDate('')
            setError('')
          }}
          disabled={disabled}
          className="flex items-center space-x-2"
        >
          <FileText className="w-4 h-4" />
          <span>Single</span>
        </Button>
        <Button
          variant={mode === 'batch' ? 'default' : 'outline'}
          onClick={() => {
            onModeChange?.('batch')
            // Clean up file previews to prevent memory leaks
            files.forEach(f => {
              if (f.preview) URL.revokeObjectURL(f.preview)
            })
            // Clear all state when switching to batch mode
            setFiles([])
            setDocumentName('')
            setBatchName('')
            setDescription('')
            setExpiryDate('')
            setError('')
          }}
          disabled={disabled}
          className="flex items-center space-x-2"
        >
          <Layers className="w-4 h-4" />
          <span>Batch</span>
        </Button>
      </div>

      {/* Document Name */}
      <div>
        <Label htmlFor="documentName">Document Name</Label>
        <Input
          id="documentName"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Enter document name or title"
          disabled={disabled}
        />
      </div>

      {/* Batch Name - Only show for batch mode */}
      {mode === 'batch' && (
        <div>
          <Label htmlFor="batchName">Batch Name</Label>
          <Input
            id="batchName"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Enter a name for this batch (e.g., 'Q1 2024 Certificates')"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            This name will help you identify and organize your document batches.
          </p>
        </div>
      )}

      {/* File Upload Area */}
      <div>
        <Label>Select Files</Label>
        <div
          ref={dropRef}
          className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === 'single' ? 'Single file' : 'Multiple files'}, max 10MB each
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOC, DOCX, TXT, JPG, PNG, XLS, XLSX
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple={mode === 'batch'}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx"
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Selected Files ({files.length})</Label>
            {files.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clean up file previews
                  files.forEach(f => {
                    if (f.preview) URL.revokeObjectURL(f.preview)
                  })
                  setFiles([])
                }}
                className="text-red-600 hover:text-red-700 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {files.length <= 10 ? (
              // Show all files if 10 or fewer
              files.map(fileObj => (
                <div
                  key={fileObj.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {fileObj.preview ? (
                      <img
                        src={fileObj.preview}
                        alt={fileObj.file.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-muted-foreground/10 rounded flex items-center justify-center">
                        {getFileIcon(fileObj.type)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium truncate max-w-48">{fileObj.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileObj.size)} • {ACCEPTED_FILE_TYPES[fileObj.type as keyof typeof ACCEPTED_FILE_TYPES]?.label || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {fileObj.hash.slice(0, 6)}...
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileObj.id)}
                      disabled={disabled}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              // Show first 5 files + summary for many files
              <>
                {files.slice(0, 5).map(fileObj => (
                  <div
                    key={fileObj.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {fileObj.preview ? (
                        <img
                          src={fileObj.preview}
                          alt={fileObj.file.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted-foreground/10 rounded flex items-center justify-center">
                          {getFileIcon(fileObj.type)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium truncate max-w-48">{fileObj.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileObj.size)} • {ACCEPTED_FILE_TYPES[fileObj.type as keyof typeof ACCEPTED_FILE_TYPES]?.label || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {fileObj.hash.slice(0, 6)}...
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileObj.id)}
                        disabled={disabled}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <div className="flex items-center justify-between">
                    <span>
                      <strong>+{files.length - 5} more files</strong>
                      <br />
                      <span className="text-xs">
                        Total size: {formatFileSize(files.reduce((sum, file) => sum + file.size, 0))}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Show All
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description of this document"
            disabled={disabled}
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
          <Input
            id="expiryDate"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            After this date, the document will be marked as expired.
          </p>
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

      {/* Error Display */}
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
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploadStage !== 'idle' || disabled}
          className="flex-1"
        >
          {uploadStage === 'idle' ? (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Issue Document{files.length > 1 ? 's' : ''}
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
