import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import { supabase } from './supabase'
import { extractProofBlock, canonicalProofString } from './pdf-proof'
import { CONTRACT_CONFIG, TRUSTDOC_ABI } from './blockchain/contract'
import { sha256 } from 'js-sha256'

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
 * This matches IssueDocument.tsx line 177-181
 */
function sha256Hash(data: Buffer | string): Buffer {
  const dataBuffer = typeof data === 'string' ? Buffer.from(data.slice(2), 'hex') : data;
  const hashHex = sha256(dataBuffer);
  return Buffer.from(hashHex, 'hex');
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
    // STEP 1: Load PDF and extract embedded proof
    const fileBuffer = await file.arrayBuffer()
    const pdfBytes = new Uint8Array(fileBuffer)
    const { originalBytes, proof } = extractProofBlock(pdfBytes)
    const proofJson = proof.proof_json

    if (!proofJson || !Array.isArray(proofJson.proofs) || proofJson.proofs.length === 0) {
      throw new Error('Embedded proof is missing verification data')
    }

    if (!proof.proof_signature) {
      throw new Error('Embedded proof signature missing')
    }

    const canonicalProof = canonicalProofString({
      id: proof.id,
      issuer_id: proof.issuer_id,
      batch: proof.batch,
      merkle_root: proof.merkle_root,
      signature: proof.signature,
      proof_json: proof.proof_json,
      file_paths: proof.file_paths,
      created_at: proof.created_at,
      expiry_date: proof.expiry_date ?? null,
      description: proof.description ?? null
    })
    const proofDigest = ethers.keccak256(ethers.toUtf8Bytes(canonicalProof))
    console.log('📄 Proof digest keccak256:', proofDigest)

    const { data: issuerSigDoc, error: issuerSigError } = await supabase
      .from('issuers')
      .select('publicKey')
      .eq('issuerId', proof.issuer_id)
      .single()

    if (issuerSigError || !issuerSigDoc?.publicKey) {
      throw new Error('Issuer public key not found for proof signature verification')
    }

    let proofSignatureValid = false
    try {
      const recoveredProofSigner = ethers.recoverAddress(
        ethers.hashMessage(ethers.getBytes(proofDigest)),
        proof.proof_signature
      )
      const issuerAddressFromPubKey = ethers.computeAddress(issuerSigDoc.publicKey)
      proofSignatureValid =
        recoveredProofSigner.toLowerCase() === issuerAddressFromPubKey.toLowerCase()

      console.log('🔐 Proof signature verification:', {
        recoveredProofSigner,
        issuerAddressFromPubKey,
        proofSignatureValid
      })
    } catch (sigErr) {
      console.error('❌ Proof signature verification error:', sigErr)
    }

    if (!proofSignatureValid) {
      return {
        valid: false,
        reason: 'Embedded proof signature invalid',
        fileName: file.name
      }
    }

    const proofData = proofJson.proofs[0]
    if (!Array.isArray(proofData.leaves) || proofData.leaves.length === 0) {
      throw new Error('Embedded proof does not contain any document hashes')
    }

    // STEP 2: Hash file with keccak256 (matches Real TrustDoc line 131)
    console.log('🔍 Extracted original bytes length:', originalBytes.length)

    let workingBytes = originalBytes
    const computeHash = (bytes: Uint8Array) => {
      const hex = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
      return normalizeHash(ethers.keccak256(hex))
    }

    let normalizedDocHash = computeHash(workingBytes)
    console.log('📄 Document hash (keccak256):', normalizedDocHash)

    const normalizedLeaves = proofData.leaves.map((l: string) => normalizeHash(l))
    console.log('📄 Stored leaves (normalized):', normalizedLeaves)
    let matchingIndex = normalizedLeaves.indexOf(normalizedDocHash)

    if (matchingIndex === -1 && workingBytes.length > 0 && workingBytes[workingBytes.length - 1] === 0x0a) {
      console.log('📄 Attempting to trim trailing newline for hash comparison...')
      const trimmed = workingBytes.slice(0, workingBytes.length - 1)
      const trimmedHash = computeHash(trimmed)
      console.log('📄 Trimmed document hash (keccak256):', trimmedHash)
      const trimmedIndex = normalizedLeaves.indexOf(trimmedHash)
      if (trimmedIndex !== -1) {
        console.log('📄 Trimmed hash matched stored leaf; using trimmed bytes for verification.')
        workingBytes = trimmed
        normalizedDocHash = trimmedHash
        matchingIndex = trimmedIndex
      }
    }

    if (matchingIndex === -1) {
      console.log('❌ Document hash not present in embedded proof leaves')
      return {
        valid: false,
        reason: 'Document hash not present in embedded proof',
        fileName: file.name
      }
    }

    const issuerId = proof.issuer_id
    const batch = proof.batch
    console.log('✅ Found matching proof in embedded payload')
    console.log('- Issuer ID:', issuerId)
    console.log('- Batch:', batch)
    console.log('- Merkle Root:', proofData.merkleRoot || proof.merkle_root)

    // STEP 4: Build Merkle tree from leaves (matches Real TrustDoc lines 223-227)
    const leavesBuf = proofData.leaves.map((x: string) => 
      Buffer.from(x.replace(/^0x/, ''), 'hex')
    )
    const tree = new MerkleTree(
      leavesBuf,
      sha256Hash,
      { sortPairs: true }
    )
    const computedRoot = '0x' + tree.getRoot().toString('hex')
    console.log('🌳 Merkle root from proof:', proofData.merkleRoot)
    console.log('🌳 Merkle root computed:', computedRoot)

    // STEP 5: Verify Merkle proof (matches Real TrustDoc lines 230-261)
    const merkleProof = Array.isArray(proofData.proofs) ? proofData.proofs[matchingIndex] : []
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
      
      const rootHex = normalizeHash(proof.merkle_root || proofData.merkleRoot)
      const exists = await contract.getRootTimestamp(rootHex)
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
      if (!(proof.signature || proofData.signature)) {
        signatureReason = 'Signature missing in proof'
      } else {
      // Fetch issuer's public key (camelCase columns in Supabase)
      const { data: issuerDoc, error: issuerError } = await supabase
        .from('issuers')
        .select('publicKey, name, email')
        .eq('issuerId', issuerId)
        .single()
        
        if (issuerError || !issuerDoc || !issuerDoc.publicKey) {
          signatureReason = 'Issuer public key not found'
        } else {
          // Verify signature using ethers
          const merkleRootBytes = ethers.getBytes(proof.merkle_root || proofData.merkleRoot)
          const msgHash = ethers.hashMessage(merkleRootBytes)
          const recovered = ethers.recoverAddress(msgHash, proof.signature || proofData.signature)
          
          console.log('🔐 Signature verification:')
          console.log('- Merkle root:', proofData.merkleRoot)
          console.log('- Signature:', proof.signature || proofData.signature)
          console.log('- Recovered address:', recovered)
          
          // Compute issuer address from public key
          let issuerAddress: string
          try {
            issuerAddress = ethers.computeAddress(issuerDoc.publicKey)
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
        .eq('issuerId', issuerId)
        .single()
      
      if (issuerDoc) {
        issuerName = issuerDoc.name || issuerDoc.email || 'Unknown Issuer'
      }

      // Get transaction details from proof_json
      if (proofJson && proofJson.explorerUrl) {
        explorerUrl = proofJson.explorerUrl
        const txHashMatch = explorerUrl.match(/\/tx\/(0x[a-fA-F0-9]+)/)
        if (txHashMatch) {
          transactionHash = txHashMatch[1]
        }
      }

      // Get issue date
      if (proof.created_at) {
        issueDate = new Date(proof.created_at).toLocaleString()
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
      merkleRoot: proof.merkle_root || proofData.merkleRoot,
      transactionHash: transactionHash || undefined,
      explorerUrl: explorerUrl || (transactionHash ? `https://amoy.polygonscan.com/tx/${transactionHash}` : undefined),
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
    
    const exists = await contract.getRootTimestamp(normalizedRoot)
    const onChain = exists && exists.toString() !== '0'
    
    // Get issuer details
    const { data: issuerDoc } = await supabase
      .from('issuers')
      .select('name, email')
      .eq('issuerId', proof.issuer_id)
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

