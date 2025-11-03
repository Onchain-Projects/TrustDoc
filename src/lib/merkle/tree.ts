import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import crypto from 'crypto'

// Merkle Tree Configuration
export const MERKLE_CONFIG = {
  hashFunction: 'sha256',  // Changed to SHA-256 to match Original TrustDoc
  sortPairs: true
}

// SHA-256 hash function for Merkle tree (matches Original TrustDoc)
function sha256Hash(data: any): Buffer {
  return crypto.createHash('sha256').update(data).digest()
}

// Document hash interface
export interface DocumentHash {
  fileName: string
  hash: string
  size: number
  type: string
}

// Merkle proof interface
export interface MerkleProof {
  merkleRoot: string
  leaves: string[]
  files: string[]
  proofs: string[]
  leafIndex: number
}

// Merkle Tree Utility Functions
export class MerkleTreeUtils {
  private tree: MerkleTree
  private leaves: string[]
  private files: string[]

  constructor(hashes: string[], fileNames: string[]) {
    this.leaves = hashes
    this.files = fileNames
    this.tree = new MerkleTree(hashes, sha256Hash, { sortPairs: MERKLE_CONFIG.sortPairs })
  }

  // Get Merkle root
  getRoot(): string {
    return this.tree.getHexRoot()
  }

  // Get Merkle proof for a specific leaf
  getProof(leafIndex: number): MerkleProof {
    const proof = this.tree.getHexProof(this.leaves[leafIndex], leafIndex)
    
    return {
      merkleRoot: this.getRoot(),
      leaves: this.leaves,
      files: this.files,
      proofs: proof,
      leafIndex
    }
  }

  // Get all proofs
  getAllProofs(): MerkleProof[] {
    return this.leaves.map((_, index) => this.getProof(index))
  }

  // Verify a proof
  verifyProof(proof: MerkleProof): boolean {
    const leaf = this.leaves[proof.leafIndex]
    return this.tree.verify(proof.proofs, leaf, proof.merkleRoot)
  }

  // Get tree data for storage
  getTreeData(): {
    merkleRoot: string
    leaves: string[]
    files: string[]
    totalDocuments: number
  } {
    return {
      merkleRoot: this.getRoot(),
      leaves: this.leaves,
      files: this.files,
      totalDocuments: this.leaves.length
    }
  }
}

// Document hashing utilities
export const documentUtils = {
  // Hash a file buffer
  hashFile(buffer: Buffer): string {
    return ethers.keccak256(buffer)
  },

  // Hash a string
  hashString(text: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(text))
  },

  // Create document hash object
  createDocumentHash(fileName: string, buffer: Buffer): DocumentHash {
    return {
      fileName,
      hash: this.hashFile(buffer),
      size: buffer.length,
      type: 'application/octet-stream'
    }
  },

  // Process multiple files
  processFiles(files: { name: string; buffer: Buffer }[]): DocumentHash[] {
    return files.map(file => this.createDocumentHash(file.name, file.buffer))
  }
}

// Proof verification utilities
export const proofUtils = {
  // Verify a Merkle proof
  verifyMerkleProof(proof: MerkleProof, leaf: string, root: string): boolean {
    const tree = new MerkleTree([leaf], sha256Hash, { sortPairs: MERKLE_CONFIG.sortPairs })
    return tree.verify(proof.proofs, leaf, root)
  },

  // Verify document against stored proof
  verifyDocument(
    documentHash: string,
    storedProof: MerkleProof,
    merkleRoot: string
  ): {
    isValid: boolean
    leafIndex: number
    proof: string[]
  } {
    // Find the document in the stored leaves
    const leafIndex = storedProof.leaves.findIndex(leaf => leaf === documentHash)
    
    if (leafIndex === -1) {
      return {
        isValid: false,
        leafIndex: -1,
        proof: []
      }
    }

    // Get the proof for this specific leaf
    const proof = storedProof.proofs
    const isValid = this.verifyMerkleProof(storedProof, documentHash, merkleRoot)

    return {
      isValid,
      leafIndex,
      proof
    }
  },

  // Create proof JSON for download
  createProofJSON(
    merkleRoot: string,
    leaves: string[],
    files: string[],
    proofs: string[],
    signature: string,
    issuerPublicKey: string,
    network: string,
    explorerUrl: string
  ): any {
    return {
      proofs: [{
        merkleRoot,
        leaves,
        files,
        proofs,
        signature,
        timestamp: new Date().toISOString()
      }],
      network,
      explorerUrl,
      issuerPublicKey,
      version: '1.0.0'
    }
  }
}

// Batch processing utilities
export const batchUtils = {
  // Create batch name
  createBatchName(issuerId: string, description?: string): string {
    const timestamp = new Date().toISOString().split('T')[0]
    const randomSuffix = Math.random().toString(36).substr(2, 6)
    
    if (description) {
      return `${description}_${timestamp}_${randomSuffix}`
    }
    
    return `batch_${timestamp}_${randomSuffix}`
  },

  // Validate batch size
  validateBatchSize(files: any[], maxFiles: number = 20): boolean {
    return files.length <= maxFiles
  },

  // Calculate batch hash
  calculateBatchHash(merkleRoot: string, issuerId: string, timestamp: string): string {
    const combined = `${merkleRoot}${issuerId}${timestamp}`
    return ethers.keccak256(ethers.toUtf8Bytes(combined))
  }
}
