import { supabase, supabaseAdmin, type Proof } from './supabase'

export interface CreateProofData {
  issuer_id: string
  batch: string
  merkle_root: string
  proof_json: any
  signature?: string
  file_paths: string[]
  expiry_date?: string
  description?: string
}

export interface UploadFileData {
  file: File
  bucket: string
  path: string
}

// Document and proof management functions
export const documentService = {
  // Upload file to Supabase Storage
  async uploadFile({ file, bucket, path }: UploadFileData) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error
    return data
  },

  // Get public URL for file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  },

  // Delete file from storage
  async deleteFile(bucket: string, paths: string[]) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(paths)

    if (error) throw error
    return data
  },

  // Create new proof record
  // Schema matches MongoDB structure:
  // { id, issuer_id, batch, merkle_root, proof_json, signature, created_at, expiry_date, description, file_paths }
  async createProof(proofData: CreateProofData) {
    console.log('documentService: Creating proof with data:', proofData)
    
    // Direct mapping to database schema - file_paths is now a column, not in proof_json
    const dbRecord = {
      issuer_id: proofData.issuer_id,
      batch: proofData.batch,
      merkle_root: proofData.merkle_root,
      proof_json: proofData.proof_json, // Contains only: proofs[], network, explorerUrl, issuerPublicKey
      signature: proofData.signature || null,
      file_paths: proofData.file_paths || null, // Now stored as array column
      expiry_date: proofData.expiry_date || null,
      description: proofData.description || null
    }
    
    console.log('documentService: Mapped database record:', dbRecord)
    
    const { data, error } = await supabase
      .from('proofs')
      .insert(dbRecord)
      .select()
      .single()

    console.log('documentService: Insert result:', { data, error })

    if (error) {
      console.error('documentService: Insert error:', error)
      throw error
    }
    
    // Map the response back to our expected format
    const mappedData = {
      id: data.id,
      issuer_id: data.issuer_id || proofData.issuer_id,
      batch: data.batch || proofData.batch,
      merkle_root: data.merkle_root || proofData.merkle_root,
      proof_json: data.proof_json,
      signature: data.signature,
      file_paths: data.file_paths || proofData.file_paths,
      created_at: data.created_at,
      expiry_date: data.expiry_date,
      description: data.description || proofData.description
    }
    
    console.log('documentService: Mapped response:', mappedData)
    return mappedData as Proof
  },

  // Get proofs by issuer
  async getProofsByIssuer(issuerId: string) {
    console.log('documentService: Querying proofs for issuer:', issuerId)
    
    // Try to query by issuer_id column first, then fallback to proof_json
    let { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('issuer_id', issuerId)
      .order('created_at', { ascending: false })

    // If no results and no error, try querying by proof_json
    if ((!data || data.length === 0) && !error) {
      console.log('documentService: No results by issuer_id, trying proof_json query')
      const { data: jsonData, error: jsonError } = await supabase
        .from('proofs')
        .select('*')
        .contains('proof_json', { issuer_id: issuerId })
        .order('created_at', { ascending: false })
      
      data = jsonData
      error = jsonError
    }

    console.log('documentService: Query result:', { data, error })

    if (error) {
      console.error('documentService: Database error:', error)
      throw error
    }
    
    // Map the results to our expected format
    const mappedData = (data || []).map((record: any) => ({
      id: record.id,
      issuer_id: record.issuer_id || record.proof_json?.issuer_id,
      batch: record.batch || record.proof_json?.batch,
      merkle_root: record.merkle_root || record.proof_json?.merkle_root || record.signature,
      proof_json: record.proof_json,
      signature: record.signature,
      file_paths: record.file_paths || record.proof_json?.file_paths || ['legacy_file'],
      created_at: record.created_at,
      expiry_date: record.expiry_date,
      description: record.description || record.proof_json?.description
    }))
    
    console.log('documentService: Mapped proofs:', mappedData)
    return mappedData as Proof[]
  },

  // Get proof by ID
  async getProofById(proofId: string) {
    const { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('id', proofId)
      .single()

    if (error) throw error
    return data as Proof
  },

  // Get proof by merkle root (for verification)
  async getProofByMerkleRoot(merkleRoot: string) {
    console.log('documentService: Searching for proof with merkle root:', merkleRoot)
    
    // Try to query by merkle_root column first, then fallback to signature and proof_json
    let { data, error } = await supabase
      .from('proofs')
      .select('*')
      .eq('merkle_root', merkleRoot)
      .single()

    // If not found, try by signature column
    if (error && error.code === 'PGRST116') { // No rows returned
      console.log('documentService: Not found by merkle_root, trying signature')
      const { data: sigData, error: sigError } = await supabase
        .from('proofs')
        .select('*')
        .eq('signature', merkleRoot)
        .single()
      
      data = sigData
      error = sigError
    }

    // If still not found, try by proof_json
    if (error && error.code === 'PGRST116') {
      console.log('documentService: Not found by signature, trying proof_json')
      const { data: jsonData, error: jsonError } = await supabase
        .from('proofs')
        .select('*')
        .contains('proof_json', { merkle_root: merkleRoot })
        .single()
      
      data = jsonData
      error = jsonError
    }

    if (error) {
      console.error('documentService: Proof not found:', error)
      throw error
    }
    
    // Map the result to our expected format
    const mappedData = {
      id: data.id,
      issuer_id: data.issuer_id || data.proof_json?.issuer_id,
      batch: data.batch || data.proof_json?.batch,
      merkle_root: data.merkle_root || data.proof_json?.merkle_root || data.signature,
      proof_json: data.proof_json,
      signature: data.signature,
      file_paths: data.file_paths || data.proof_json?.file_paths || ['legacy_file'],
      created_at: data.created_at,
      expiry_date: data.expiry_date,
      description: data.description || data.proof_json?.description
    }
    
    console.log('documentService: Found proof:', mappedData)
    return mappedData as Proof
  },

  // Update proof
  async updateProof(proofId: string, updates: Partial<Proof>) {
    const { data, error } = await supabase
      .from('proofs')
      .update(updates)
      .eq('id', proofId)
      .select()
      .single()

    if (error) throw error
    return data as Proof
  },

  // Delete proof
  async deleteProof(proofId: string) {
    // First get the proof to get file paths
    const proof = await this.getProofById(proofId)
    
    // Delete files from storage
    if (proof.file_paths && proof.file_paths.length > 0) {
      await this.deleteFile('documents', proof.file_paths)
    }

    // Delete proof record
    const { error } = await supabase
      .from('proofs')
      .delete()
      .eq('id', proofId)

    if (error) throw error
  },

  // Search proofs
  async searchProofs(query: string, issuerId?: string) {
    let queryBuilder = supabase
      .from('proofs')
      .select('*')
      .or(`batch.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })

    if (issuerId) {
      queryBuilder = queryBuilder.eq('issuer_id', issuerId)
    }

    const { data, error } = await queryBuilder

    if (error) throw error
    return data as Proof[]
  },

  // Batch upload files
  async batchUploadFiles(files: File[], issuerId: string, batchName: string) {
    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now()
      const path = `${issuerId}/${batchName}/${timestamp}_${index}_${file.name}`
      
      return this.uploadFile({
        file,
        bucket: 'documents',
        path
      })
    })

    const uploadResults = await Promise.all(uploadPromises)
    return uploadResults.map(result => result.path)
  },

  // Verify document (check if merkle root exists)
  async verifyDocument(merkleRoot: string) {
    try {
      const proof = await this.getProofByMerkleRoot(merkleRoot)
      return {
        isValid: true,
        proof,
        message: 'Document is valid and verified'
      }
    } catch (error) {
      return {
        isValid: false,
        proof: null,
        message: 'Document not found or invalid'
      }
    }
  }
}
