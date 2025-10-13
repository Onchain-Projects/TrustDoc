// Upload Service - All logic runs in the frontend, no backend needed!
// Calls Supabase directly from the browser
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import { supabase } from './supabase'

// SHA-256 for Merkle tree
function sha256(data: Buffer): Buffer {
  const hash = ethers.keccak256(data)
  return Buffer.from(hash.slice(2), 'hex')
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
 */
export async function confirmAndStoreProof(
  issuerId: string,
  batch: string,
  merkleRoot: string,
  filePaths: string[],
  files: File[],
  expiryDate?: string,
  description?: string
): Promise<ConfirmResult> {
  try {
    console.log('\n📝 Confirming and storing proof...')
    console.log(`Issuer: ${issuerId}, Batch: ${batch}`)
    console.log(`Merkle Root: ${merkleRoot}`)

    // Get issuer's private key from Supabase
    console.log('🔐 Fetching issuer private key...')
    const { data: issuerDoc, error: issuerError } = await supabase
      .from('issuers')
      .select('private_key, public_key, name, email')
      .eq('issuer_id', issuerId)
      .single()

    if (issuerError || !issuerDoc || !issuerDoc.private_key) {
      console.error('❌ Issuer not found or no private key')
      throw new Error('Issuer or private key not found')
    }

    console.log('✅ Issuer found:', issuerDoc.name)

    // Sign Merkle root with issuer's private key
    console.log('\n✍️ Signing Merkle root...')
    const wallet = new ethers.Wallet(issuerDoc.private_key)
    const merkleRootBytes = ethers.getBytes(merkleRoot)
    const signature = await wallet.signMessage(merkleRootBytes)
    console.log(`Signature: ${signature.substring(0, 20)}...`)

    // Rebuild Merkle tree for proofs
    console.log('\n🌳 Rebuilding Merkle tree for proof generation...')
    const leaves: string[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const arrayBuffer = await file.arrayBuffer()
      const hash = ethers.keccak256(new Uint8Array(arrayBuffer))
      leaves.push(hash)
    }

    const tree = new MerkleTree(leaves, sha256, { sortPairs: true })
    
    // Generate individual proofs for each document
    const proofs = leaves.map((leaf) => {
      const proof = tree.getProof(Buffer.from(leaf.slice(2), 'hex'))
      return proof.map(p => '0x' + p.data.toString('hex'))
    })

    // Create proof JSON
    const proofJson = {
      proofs: [{
        merkleRoot: merkleRoot,
        leaves: leaves,
        files: files.map(f => f.name),
        proofs: proofs,
        signature: signature,
        timestamp: new Date().toISOString()
      }],
      network: 'Polygon Amoy Testnet',
      chainId: 80002,
      contractAddress: '0x1253369dab29F77692bF84DB759583ac47F66532',
      explorerUrl: 'https://amoy.polygonscan.com/address/0x1253369dab29F77692bF84DB759583ac47F66532',
      issuerPublicKey: issuerDoc.public_key,
      issuerName: issuerDoc.name
    }

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

