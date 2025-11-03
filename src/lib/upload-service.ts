// Upload Service - All logic runs in the frontend, no backend needed!
// Calls Supabase directly from the browser
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import { supabase } from './supabase'
import crypto from 'crypto'

// SHA-256 for Merkle tree (matches Original TrustDoc)
function sha256(data: Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest()
}

export interface UploadResult {
  success: boolean
  merkleRoot?: string
  batch?: string
  filePaths?: string[]
  error?: string
}

export interface ConfirmResult {
  success: boolean
  proofId?: string
  error?: string
}

/**
 * Step 1: Upload files to Supabase Storage and generate Merkle root
 * This runs entirely in the browser - no backend needed!
 */
export async function uploadFilesAndGenerateMerkleRoot(
  files: File[],
  issuerId: string,
  description?: string,
  expiryDate?: string
): Promise<UploadResult> {
  try {
    console.log('📤 Starting file upload to Supabase Storage...')
    console.log(`Files: ${files.length}, Issuer: ${issuerId}`)

    if (files.length === 0) {
      throw new Error('No files provided')
    }

    if (files.length > 20) {
      throw new Error('Maximum 20 files allowed')
    }

    // Generate batch ID
    const batch = `batch_${Date.now()}_${issuerId}`
    console.log(`Batch ID: ${batch}`)

    const leaves: string[] = []
    const filesArr: string[] = []
    const filePaths: string[] = []

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`📁 Processing file ${i + 1}/${files.length}: ${file.name}`)

      // Read file content
      const arrayBuffer = await file.arrayBuffer()
      const data = new Uint8Array(arrayBuffer)

      // Hash file with keccak256 (matching MongoDB version)
      const hash = ethers.keccak256(data)
      console.log(`  - Hash: ${hash}`)
      leaves.push(hash)
      filesArr.push(file.name)

      // Upload to Supabase Storage
      const storagePath = `${issuerId}/${batch}/${i}_${file.name}`
      console.log(`  - Uploading to: ${storagePath}`)

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error(`  ❌ Upload failed: ${uploadError.message}`)
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
      }

      filePaths.push(storagePath)
      console.log(`  ✅ Uploaded successfully`)
    }

    // Build Merkle tree
    console.log('\n🌳 Building Merkle tree...')
    const tree = new MerkleTree(leaves, sha256, { sortPairs: true })
    const root = '0x' + tree.getRoot().toString('hex')
    console.log(`Merkle Root: ${root}`)

    // Validate format
    if (!root.startsWith('0x') || root.length !== 66) {
      throw new Error(`Invalid Merkle root format: ${root}`)
    }

    console.log('✅ Upload complete!')

    return {
      success: true,
      merkleRoot: root,
      batch,
      filePaths
    }

  } catch (error: any) {
    console.error('❌ Upload error:', error)
    return {
      success: false,
      error: error.message || 'Upload failed'
    }
  }
}

/**
 * Step 2: After blockchain confirmation, sign and store proof in Supabase
 * This also runs entirely in the browser!
 * Structure matches MongoDB schema exactly
 */
export async function confirmAndStoreProof(
  issuerId: string,
  batch: string,
  merkleRoot: string,
  filePaths: string[],
  files: File[],
  expiryDate?: string,
  description?: string,
  txHash?: string // Transaction hash from blockchain
): Promise<ConfirmResult> {
  try {
    console.log('\n📝 Confirming and storing proof...')
    console.log(`Issuer: ${issuerId}, Batch: ${batch}`)
    console.log(`Merkle Root: ${merkleRoot}`)

    // Get issuer's private key from Supabase
    // Note: Column names are camelCase (issuerId, privateKey, publicKey) not snake_case
    console.log('🔐 Fetching issuer private key...')
    const { data: issuerDoc, error: issuerError } = await supabase
      .from('issuers')
      .select('privateKey, publicKey, name, email')
      .eq('issuerId', issuerId)  // Use camelCase column name
      .single()

    if (issuerError || !issuerDoc || !issuerDoc.privateKey) {
      console.error('❌ Issuer not found or no private key:', issuerError)
      throw new Error(`Issuer or private key not found: ${issuerError?.message || 'Unknown error'}`)
    }

    // Validate that we have a real private key (starts with 0x and is 66 chars)
    if (!issuerDoc.privateKey.startsWith('0x') || issuerDoc.privateKey.length < 64) {
      console.error('❌ Invalid private key format - appears to be placeholder')
      throw new Error('Invalid private key format. Please generate a proper cryptographic key pair.')
    }

    console.log('✅ Issuer found:', issuerDoc.name)

    // Sign Merkle root with issuer's private key
    // MATCHING WORKING BACKEND LOGIC: Convert hex to bytes first, then signMessage
    console.log('\n✍️ Signing Merkle root...')
    console.log('   Merkle root to sign:', merkleRoot)
    console.log('   Private key preview:', issuerDoc.privateKey.substring(0, 10) + '...')
    
    let signature: string
    try {
      const wallet = new ethers.Wallet(issuerDoc.privateKey)
      // WORKING BACKEND USES: ethers.getBytes(merkleRoot) then signMessage(bytes)
      // This matches the working TrustDoc backend implementation exactly
      let merkleRootBytes: Uint8Array
      if (ethers.getBytes) {
        merkleRootBytes = ethers.getBytes(merkleRoot)
      } else {
        throw new Error('ethers.getBytes not available - ethers.js version issue')
      }
      
      signature = await wallet.signMessage(merkleRootBytes)
      console.log(`✅ Signature generated: ${signature.substring(0, 20)}...`)
      console.log(`   Full signature length: ${signature.length}`)
      
      if (!signature || signature.length < 100) {
        throw new Error('Invalid signature generated')
      }
    } catch (signError: any) {
      console.error('❌ Signature generation failed:', signError)
      console.error('   Error details:', signError.message, signError.stack)
      throw new Error(`Failed to generate signature: ${signError.message}`)
    }

    // Rebuild Merkle tree for proofs
    // MATCHING WORKING BACKEND EXACTLY: Build tree with hex strings (not Buffers)
    console.log('\n🌳 Rebuilding Merkle tree for proof generation...')
    const leaves: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const arrayBuffer = await file.arrayBuffer()
      const hash = ethers.keccak256(new Uint8Array(arrayBuffer))
      leaves.push(hash)
    }

    console.log(`   Generated ${leaves.length} leaves for Merkle tree`)
    // WORKING BACKEND: new MerkleTree(leaves, sha256, { sortPairs: true })
    // MerkleTree constructor accepts hex strings directly
    const tree = new MerkleTree(leaves, sha256, { sortPairs: true })
    console.log(`   Merkle tree root: ${tree.getHexRoot()}`)
    
    // Generate individual proofs for each document
    // MATCHING WORKING BACKEND EXACTLY: leaves.map(l => tree.getHexProof(Buffer.from(l.slice(2), 'hex')))
    const proofs = leaves.map((leaf) => {
      try {
        // Convert hex string to Buffer for getHexProof (matching backend exactly)
        const leafBuffer = Buffer.from(leaf.slice(2), 'hex')
        const proof = tree.getHexProof(leafBuffer)
        console.log(`   Proof for leaf ${leaf.substring(0, 10)}...: ${proof.length} elements`)
        if (proof.length > 0) {
          console.log(`     Proof elements: ${proof.slice(0, 2).join(', ')}${proof.length > 2 ? '...' : ''}`)
        }
        return proof // getHexProof already returns hex strings array
      } catch (proofError: any) {
        console.error(`   ❌ Error generating proof for leaf:`, proofError)
        throw new Error(`Failed to generate Merkle proof: ${proofError.message}`)
      }
    })
    
    console.log(`✅ Generated ${proofs.length} Merkle proofs`)

    // Validate signature and proofs before creating proof JSON
    if (!signature || signature.length < 100) {
      throw new Error('Invalid signature: signature is missing or too short')
    }
    
    if (!proofs || proofs.length === 0) {
      throw new Error('Invalid proofs: Merkle proofs array is empty')
    }
    
    console.log(`\n📋 Creating proof JSON...`)
    console.log(`   Signature: ${signature.substring(0, 20)}... (${signature.length} chars)`)
    console.log(`   Proofs count: ${proofs.length}`)
    console.log(`   Files count: ${files.length}`)
    
    // Create proof JSON matching MongoDB schema exactly
    // Structure: { proofs: [{ merkleRoot, leaves, files, proofs, signature, timestamp }], network, explorerUrl, issuerPublicKey }
    const explorerUrl = txHash 
      ? `https://amoy.polygonscan.com/tx/${txHash}`
      : 'https://amoy.polygonscan.com/address/0x1253369dab29F77692bF84DB759583ac47F66532'
    
    const proofJson = {
      proofs: [{
        merkleRoot: merkleRoot,
        leaves: leaves,
        files: files.map(f => f.name),
        proofs: proofs, // Array of arrays - Merkle proofs for each leaf
        signature: signature,
        timestamp: new Date().toISOString()
      }],
      network: 'amoy', // Match MongoDB format exactly
      explorerUrl: explorerUrl, // Transaction URL when available
      issuerPublicKey: issuerDoc.publicKey  // Use camelCase property name
    }
    
    console.log(`✅ Proof JSON created successfully`)

    // Store proof in Supabase
    console.log('\n💾 Storing proof in Supabase...')
    const { data: proofData, error: proofError } = await supabase
      .from('proofs')
      .insert({
        issuer_id: issuerId,
        batch: batch,
        merkle_root: merkleRoot,
        signature: signature,
        proof_json: proofJson,
        file_paths: filePaths,
        expiry_date: expiryDate || null,
        description: description || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (proofError) {
      console.error('❌ Supabase insert error:', proofError)
      throw new Error(`Failed to store proof: ${proofError.message}`)
    }

    console.log('✅ Proof stored successfully!')
    console.log(`Proof ID: ${proofData.id}`)

    return {
      success: true,
      proofId: proofData.id
    }

  } catch (error: any) {
    console.error('❌ Confirmation error:', error)
    return {
      success: false,
      error: error.message || 'Confirmation failed'
    }
  }
}

