import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import { supabase } from './supabase'
import { CONTRACT_CONFIG, TRUSTDOC_ABI } from './blockchain/contract'

/**
 * Generate keccak256 hash from file buffer (matches Real TrustDoc)
 */
export function hashFileWithKeccak256(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer)
  const hash = ethers.keccak256(uint8Array)
  return hash
}

/**
 * Normalize hash to lowercase with single 0x prefix
 */
function normalizeHash(hash: string): string {
  return '0x' + hash.replace(/^0x+/, '').toLowerCase()
}

/**
 * SHA-256 hash function for Merkle tree (not for file hashing!)
 */
function sha256(data: Buffer): Buffer {
  const hash = ethers.keccak256(data)
  return Buffer.from(hash.slice(2), 'hex')
}

export interface VerificationResult {
  valid: boolean
  reason?: string
  issuerId?: string
  issuerName?: string
  batch?: string
  merkleRoot?: string
  transactionHash?: string
  explorerUrl?: string
  fileName?: string
  issueDate?: string
  onChain?: boolean
  signatureValid?: boolean
  merkleProofValid?: boolean
}

/**
 * Complete document verification matching Real TrustDoc logic
 */
export async function verifyDocument(file: File): Promise<VerificationResult> {
  console.log('🔍 Starting document verification...')
  
  try {
    // STEP 1: Hash file with keccak256 (matches Real TrustDoc line 131)
    const fileBuffer = await file.arrayBuffer()
    const docHash = hashFileWithKeccak256(fileBuffer)
    const normalizedDocHash = normalizeHash(docHash)
    console.log('📄 Document hash (keccak256):', normalizedDocHash)

    // STEP 2: Fetch all proofs from database
    const { data: dbProofs, error: proofsError } = await supabase
      .from('proofs')
      .select('*')
    
    if (proofsError) {
      console.error('Database error:', proofsError)
      throw new Error('Failed to fetch proofs from database')
    }

    if (!dbProofs || dbProofs.length === 0) {
      return {
        valid: false,
        reason: 'No proofs found in database'
      }
    }

    console.log(`🔍 Searching through ${dbProofs.length} proofs...`)

    // STEP 3: Search for document in proof leaves (matches Real TrustDoc lines 162-185)
    let found = false
    let proofData: any = null
    let matchedProof: any = null
    let issuerId: string | null = null
    let batch: string | null = null

    for (const p of dbProofs) {
      const meta = p.proof_json
      if (meta && Array.isArray(meta.proofs)) {
        for (const proofObj of meta.proofs) {
          if (Array.isArray(proofObj.leaves)) {
            // Normalize all leaves
            const normalizedLeaves = proofObj.leaves.map((l: string) => normalizeHash(l))
            const idx = normalizedLeaves.findIndex((leaf: string) => leaf === normalizedDocHash)
            
            if (idx !== -1) {
              found = true
              proofData = proofObj
              matchedProof = p
              issuerId = p.issuer_id
              batch = p.batch
              console.log('✅ Found matching proof!')
              console.log('- Issuer ID:', issuerId)
              console.log('- Batch:', batch)
              console.log('- Merkle Root:', proofData.merkleRoot)
              break
            }
          }
        }
        if (found) break
      }
    }

    if (!found) {
      console.log('❌ Document hash not found in any proof')
      return {
        valid: false,
        reason: 'Document not found in any batch',
        fileName: file.name
      }
    }

    // STEP 4: Build Merkle tree from leaves (matches Real TrustDoc lines 223-227)
    const leavesBuf = proofData.leaves.map((x: string) => 
      Buffer.from(x.replace(/^0x/, ''), 'hex')
    )
    const tree = new MerkleTree(
      leavesBuf,
      (data) => {
        const hash = ethers.keccak256(data)
        return Buffer.from(hash.slice(2), 'hex')
      },
      { sortPairs: true }
    )
    const computedRoot = '0x' + tree.getRoot().toString('hex')
    console.log('🌳 Merkle root from proof:', proofData.merkleRoot)
    console.log('🌳 Merkle root computed:', computedRoot)

    // STEP 5: Verify Merkle proof (matches Real TrustDoc lines 230-261)
    const leafIndex = proofData.leaves
      .map((l: string) => normalizeHash(l))
      .indexOf(normalizedDocHash)
    const merkleProof = Array.isArray(proofData.proofs) ? proofData.proofs[leafIndex] : []
    console.log('📊 Merkle proof for document:', merkleProof)

    const rootBuffer = Buffer.from(computedRoot.replace(/^0x/, ''), 'hex')
    const leafBuffer = Buffer.from(normalizedDocHash.replace(/^0x/, ''), 'hex')

    let isValidProof = false
    try {
      isValidProof = tree.verify(merkleProof, leafBuffer, rootBuffer)
      console.log('✅ Merkle proof valid:', isValidProof)
    } catch (e) {
      console.error('❌ Merkle proof verification failed:', e)
      return {
        valid: false,
        reason: 'Merkle proof verification failed',
        fileName: file.name
      }
    }

    // STEP 6: Check on-chain (matches Real TrustDoc lines 264-273)
    let onChain = false
    try {
      const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.network.rpcUrl, {
        name: 'polygon-amoy',
        chainId: CONTRACT_CONFIG.network.chainId,
        ensAddress: null
      })
      const contract = new ethers.Contract(
        CONTRACT_CONFIG.address,
        TRUSTDOC_ABI,
        provider
      )
      
      const rootHex = normalizeHash(proofData.merkleRoot)
      const exists = await contract.roots_map(rootHex)
      onChain = exists && exists.toString() !== '0'
      console.log('⛓️ On-chain verification:', onChain ? 'SUCCESS' : 'FAILED')
      
      if (!onChain) {
        console.log('❌ Merkle root not found on blockchain')
        return {
          valid: false,
          reason: 'Merkle root not found on blockchain',
          merkleProofValid: isValidProof,
          fileName: file.name
        }
      }
    } catch (err) {
      console.error('❌ Blockchain verification error:', err)
      return {
        valid: false,
        reason: 'Blockchain verification failed',
        fileName: file.name
      }
    }

    // STEP 7: Verify signature (matches Real TrustDoc lines 276-346)
    let signatureValid = false
    let signatureReason = ''
    
    try {
      if (!proofData.signature) {
        signatureReason = 'Signature missing in proof'
      } else {
        // Fetch issuer's public key
        const { data: issuerDoc, error: issuerError } = await supabase
          .from('issuers')
          .select('public_key, name, email')
          .eq('issuer_id', issuerId)
          .single()
        
        if (issuerError || !issuerDoc || !issuerDoc.public_key) {
          signatureReason = 'Issuer public key not found'
        } else {
          // Verify signature using ethers
          const merkleRootBytes = ethers.getBytes(proofData.merkleRoot)
          const msgHash = ethers.hashMessage(merkleRootBytes)
          const recovered = ethers.recoverAddress(msgHash, proofData.signature)
          
          console.log('🔐 Signature verification:')
          console.log('- Merkle root:', proofData.merkleRoot)
          console.log('- Signature:', proofData.signature)
          console.log('- Recovered address:', recovered)
          
          // Compute issuer address from public key
          let issuerAddress: string
          try {
            issuerAddress = ethers.computeAddress(issuerDoc.public_key)
            console.log('- Issuer address:', issuerAddress)
          } catch (e) {
            issuerAddress = 'Error computing address'
            console.error('Error computing address:', e)
          }
          
          if (recovered.toLowerCase() === issuerAddress.toLowerCase()) {
            signatureValid = true
            console.log('✅ Signature verification PASSED')
          } else {
            signatureReason = 'Signature mismatch - document may be tampered'
            console.log('❌ Signature verification FAILED')
          }
        }
      }
    } catch (sigErr: any) {
      signatureReason = 'Signature verification error: ' + sigErr.message
      console.error('❌ Signature verification error:', sigErr)
    }

    if (!signatureValid) {
      return {
        valid: false,
        reason: signatureReason || 'Signature verification failed',
        merkleProofValid: isValidProof,
        onChain: onChain,
        fileName: file.name
      }
    }

    // STEP 8: Get issuer details and build response (matches Real TrustDoc lines 350-408)
    let issuerName = 'Unknown Issuer'
    let transactionHash: string | null = null
    let explorerUrl: string | null = null
    let issueDate: string | null = null

    try {
      const { data: issuerDoc } = await supabase
        .from('issuers')
        .select('name, email')
        .eq('issuer_id', issuerId)
        .single()
      
      if (issuerDoc) {
        issuerName = issuerDoc.name || issuerDoc.email || 'Unknown Issuer'
      }

      // Get transaction details from proof_json
      if (matchedProof.proof_json && matchedProof.proof_json.explorerUrl) {
        explorerUrl = matchedProof.proof_json.explorerUrl
        const txHashMatch = explorerUrl.match(/\/tx\/(0x[a-fA-F0-9]+)/)
        if (txHashMatch) {
          transactionHash = txHashMatch[1]
        }
      }

      // Get issue date
      if (matchedProof.created_at) {
        issueDate = new Date(matchedProof.created_at).toLocaleString()
      }
    } catch (err) {
      console.error('Error getting issuer details:', err)
    }

    // STEP 9: Return successful verification result
    console.log('✅✅✅ VERIFICATION SUCCESSFUL ✅✅✅')
    
    return {
      valid: true,
      issuerId: issuerId || undefined,
      issuerName,
      batch: batch || undefined,
      merkleRoot: proofData.merkleRoot,
      transactionHash: transactionHash || undefined,
      explorerUrl: explorerUrl || `https://amoy.polygonscan.com/tx/${transactionHash}`,
      fileName: file.name,
      issueDate: issueDate || undefined,
      onChain: true,
      signatureValid: true,
      merkleProofValid: true
    }

  } catch (error: any) {
    console.error('❌ Verification error:', error)
    return {
      valid: false,
      reason: error.message || 'Verification failed',
      fileName: file.name
    }
  }
}

/**
 * Verify document by Merkle root (manual entry)
 */
export async function verifyByMerkleRoot(merkleRoot: string): Promise<VerificationResult> {
  console.log('🔍 Starting verification by Merkle root...')
  
  try {
    const normalizedRoot = normalizeHash(merkleRoot)
    
    // Find proof in database
    const { data: proofs, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('merkle_root', normalizedRoot)
    
    if (error) throw error
    
    if (!proofs || proofs.length === 0) {
      return {
        valid: false,
        reason: 'Merkle root not found in database'
      }
    }

    const proof = proofs[0]
    
    // Check on-chain
    const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.network.rpcUrl, {
      name: 'polygon-amoy',
      chainId: CONTRACT_CONFIG.network.chainId,
      ensAddress: null
    })
    const contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      TRUSTDOC_ABI,
      provider
    )
    
    const exists = await contract.roots_map(normalizedRoot)
    const onChain = exists && exists.toString() !== '0'
    
    // Get issuer details
    const { data: issuerDoc } = await supabase
      .from('issuers')
      .select('name, email')
      .eq('issuer_id', proof.issuer_id)
      .single()
    
    const issuerName = issuerDoc?.name || issuerDoc?.email || 'Unknown Issuer'
    
    // Get transaction details
    let transactionHash: string | null = null
    let explorerUrl: string | null = null
    
    if (proof.proof_json && proof.proof_json.explorerUrl) {
      explorerUrl = proof.proof_json.explorerUrl
      const txHashMatch = explorerUrl.match(/\/tx\/(0x[a-fA-F0-9]+)/)
      if (txHashMatch) {
        transactionHash = txHashMatch[1]
      }
    }
    
    return {
      valid: onChain,
      reason: onChain ? 'Document verified on blockchain' : 'Not found on blockchain',
      issuerId: proof.issuer_id,
      issuerName,
      batch: proof.batch,
      merkleRoot: proof.merkle_root,
      transactionHash: transactionHash || undefined,
      explorerUrl: explorerUrl || undefined,
      issueDate: proof.created_at ? new Date(proof.created_at).toLocaleString() : undefined,
      onChain
    }
    
  } catch (error: any) {
    console.error('❌ Verification error:', error)
    return {
      valid: false,
      reason: error.message || 'Verification failed'
    }
  }
}

