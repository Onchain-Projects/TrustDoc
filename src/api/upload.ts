// API handler for file uploads - works with Vite dev server
import { ethers } from 'ethers'

export interface UploadResult {
  success: boolean
  merkleRoot?: string
  batch?: string
  filePaths?: string[]
  txHash?: string
  error?: string
  isNewBatch?: boolean
  existingBatchId?: string
  totalDocuments?: number
}

export interface FileData {
  name: string
  size: number
  type: string
  content: string // base64 encoded
  hash: string
}

// Simple Merkle tree implementation for browser
class SimpleMerkleTree {
  private leaves: string[]
  private tree: string[][]

  constructor(leaves: string[]) {
    this.leaves = leaves
    this.tree = [leaves]
    this.buildTree()
  }

  private buildTree() {
    let currentLevel = this.leaves
    while (currentLevel.length > 1) {
      const nextLevel: string[] = []
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || left // If odd number, duplicate last element
        const combined = left + right
        const hash = ethers.keccak256('0x' + combined)
        nextLevel.push(hash.slice(2)) // Remove 0x prefix
      }
      this.tree.push(nextLevel)
      currentLevel = nextLevel
    }
  }

  getHexRoot(): string {
    if (this.tree.length === 0 || this.tree[this.tree.length - 1].length === 0) {
      return '0x0000000000000000000000000000000000000000000000000000000000000000'
    }
    return '0x' + this.tree[this.tree.length - 1][0]
  }
}

// Function to check for existing batch with the same name
async function findExistingBatch(batchName: string, issuerId: string): Promise<string | null> {
  try {
    // Import Supabase client
    const { supabase } = await import('@/lib/supabase')
    
    // Search for existing batch with the same name
    const { data, error } = await supabase
      .from('proofs')
      .select('batch, proof_json')
      .eq('issuer_id', issuerId)
      .like('batch', `%${batchName.replace(/[^a-zA-Z0-9]/g, '_')}%`)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error finding existing batch:', error)
      return null
    }
    
    if (data && data.length > 0) {
      const existingBatch = data[0]
      console.log('Found existing batch:', existingBatch.batch)
      return existingBatch.batch
    }
    
    return null
  } catch (error) {
    console.error('Error in findExistingBatch:', error)
    return null
  }
}

// Function to get existing file hashes from a batch
async function getExistingFileHashes(batchId: string): Promise<string[]> {
  try {
    const { supabase } = await import('@/lib/supabase')
    
    const { data, error } = await supabase
      .from('proofs')
      .select('proof_json')
      .eq('batch', batchId)
      .single()
    
    if (error || !data) {
      console.error('Error getting existing file hashes:', error)
      return []
    }
    
    const fileHashes = data.proof_json?.fileHashes || []
    console.log('Existing file hashes:', fileHashes.length)
    return fileHashes
  } catch (error) {
    console.error('Error in getExistingFileHashes:', error)
    return []
  }
}

// Mock file upload handler - in production this would integrate with Supabase Storage
export async function handleFileUpload(files: FileData[], issuerId: string, customBatchName?: string): Promise<UploadResult> {
  try {
    console.log('Processing file upload for issuer:', issuerId)
    console.log('Files received:', files.length)

    // Generate file hashes for new files
    const newFileHashes = files.map(file => {
      console.log('File hash:', file.hash)
      // Remove 0x prefix if present for MerkleTree
      return file.hash.startsWith('0x') ? file.hash.slice(2) : file.hash
    })
    
    console.log('New file hashes for Merkle tree:', newFileHashes)
    
    let batch: string
    let allFileHashes: string[]
    let isNewBatch = true
    let existingBatchId: string | null = null
    
    // Check if we should extend an existing batch
    if (customBatchName) {
      existingBatchId = await findExistingBatch(customBatchName, issuerId)
      
      if (existingBatchId) {
        // Extend existing batch
        console.log('Extending existing batch:', existingBatchId)
        const existingHashes = await getExistingFileHashes(existingBatchId)
        allFileHashes = [...existingHashes, ...newFileHashes]
        batch = existingBatchId
        isNewBatch = false
        console.log('Combined file hashes:', allFileHashes.length)
      } else {
        // Create new batch with custom name
        console.log('Creating new batch with custom name:', customBatchName)
        allFileHashes = newFileHashes
        batch = `batch_${customBatchName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${issuerId}`
        isNewBatch = true
      }
    } else {
      // Create new batch with auto-generated name
      allFileHashes = newFileHashes
      batch = `batch_${Date.now()}_${issuerId}`
      isNewBatch = true
    }
    
    // Create Merkle tree using all file hashes (existing + new)
    const merkleTree = new SimpleMerkleTree(allFileHashes)
    const merkleRoot = merkleTree.getHexRoot()
    
    // Generate file paths for new files only
    const filePaths = files.map((file, index) => {
      const fileIndex = isNewBatch ? index : allFileHashes.length - newFileHashes.length + index
      return `uploads/${batch}/${fileIndex}_${file.name}`
    })
    
    console.log('Generated Merkle root:', merkleRoot)
    console.log('Batch ID:', batch)
    console.log('Is new batch:', isNewBatch)
    console.log('Total documents in batch:', allFileHashes.length)
    
    return {
      success: true,
      merkleRoot,
      batch,
      filePaths,
      isNewBatch,
      existingBatchId: existingBatchId || undefined,
      totalDocuments: allFileHashes.length
    }
  } catch (error) {
    console.error('File upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Note: Real blockchain interaction is now handled by useBlockchainOperations hook
// This function is no longer needed as we use the real blockchain service
