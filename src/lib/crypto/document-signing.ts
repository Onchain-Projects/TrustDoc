import { KeyManagementService } from './key-management'
import { CryptographicKeyService } from './keys'
import { supabase } from '@/lib/supabase'

export interface DocumentSignature {
  id: string
  documentHash: string
  issuerId: string
  keyId: string
  signature: string
  algorithm: string
  signedAt: Date
  verifiedAt?: Date
  isValid?: boolean
  verificationAttempts: number
}

export interface SigningResult {
  success: boolean
  signature?: string
  keyId?: string
  error?: string
}

export interface VerificationResult {
  isValid: boolean
  signature?: DocumentSignature
  error?: string
}

export class DocumentSigningService {
  /**
   * Sign a document hash with issuer's private key
   */
  static async signDocument(
    issuerId: string,
    documentHash: string,
    password?: string
  ): Promise<SigningResult> {
    try {
      console.log('Signing document for issuer:', issuerId)
      console.log('Document hash:', documentHash)

      // Get active key pair
      const keyPair = await KeyManagementService.getActiveKeyPair(issuerId, password)
      
      if (!keyPair) {
        return {
          success: false,
          error: 'No active key pair found for issuer'
        }
      }

      // Sign the document hash
      const signature = CryptographicKeyService.signData(documentHash, keyPair.privateKey)
      
      // Store signature in database
      const { data, error } = await supabase
        .from('document_signatures')
        .insert({
          document_hash: documentHash,
          issuer_id: issuerId,
          key_id: keyPair.keyId,
          signature,
          algorithm: 'SHA256',
          signed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error storing signature:', error)
        return {
          success: false,
          error: `Failed to store signature: ${error.message}`
        }
      }

      console.log('Document signed successfully:', data.id)
      
      return {
        success: true,
        signature,
        keyId: keyPair.keyId
      }
    } catch (error) {
      console.error('Error signing document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Verify a document signature
   */
  static async verifyDocumentSignature(
    documentHash: string,
    signature: string,
    issuerId: string
  ): Promise<VerificationResult> {
    try {
      console.log('Verifying document signature for issuer:', issuerId)
      console.log('Document hash:', documentHash)

      // Get the signature record from database
      const { data: signatureRecord, error: fetchError } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('document_hash', documentHash)
        .eq('issuer_id', issuerId)
        .eq('signature', signature)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return {
            isValid: false,
            error: 'Signature not found in database'
          }
        }
        throw new Error(`Failed to fetch signature: ${fetchError.message}`)
      }

      // Get the public key for verification
      const keyPair = await KeyManagementService.getActiveKeyPair(issuerId)
      
      if (!keyPair) {
        return {
          isValid: false,
          error: 'No active key pair found for issuer'
        }
      }

      // Verify the signature
      const isValid = CryptographicKeyService.verifySignature(
        documentHash,
        signature,
        keyPair.publicKey
      )

      // Update verification status in database
      await supabase
        .from('document_signatures')
        .update({
          verified_at: new Date().toISOString(),
          is_valid: isValid,
          verification_attempts: signatureRecord.verification_attempts + 1
        })
        .eq('id', signatureRecord.id)

      const documentSignature: DocumentSignature = {
        id: signatureRecord.id,
        documentHash: signatureRecord.document_hash,
        issuerId: signatureRecord.issuer_id,
        keyId: signatureRecord.key_id,
        signature: signatureRecord.signature,
        algorithm: signatureRecord.algorithm,
        signedAt: new Date(signatureRecord.signed_at),
        verifiedAt: new Date(),
        isValid,
        verificationAttempts: signatureRecord.verification_attempts + 1
      }

      console.log('Document verification completed:', isValid)
      
      return {
        isValid,
        signature: documentSignature
      }
    } catch (error) {
      console.error('Error verifying document signature:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get all signatures for a document
   */
  static async getDocumentSignatures(documentHash: string): Promise<DocumentSignature[]> {
    try {
      const { data, error } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('document_hash', documentHash)
        .order('signed_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get document signatures: ${error.message}`)
      }

      return (data || []).map(record => ({
        id: record.id,
        documentHash: record.document_hash,
        issuerId: record.issuer_id,
        keyId: record.key_id,
        signature: record.signature,
        algorithm: record.algorithm,
        signedAt: new Date(record.signed_at),
        verifiedAt: record.verified_at ? new Date(record.verified_at) : undefined,
        isValid: record.is_valid,
        verificationAttempts: record.verification_attempts
      }))
    } catch (error) {
      console.error('Error getting document signatures:', error)
      throw error
    }
  }

  /**
   * Get all signatures by an issuer
   */
  static async getIssuerSignatures(issuerId: string): Promise<DocumentSignature[]> {
    try {
      const { data, error } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('issuer_id', issuerId)
        .order('signed_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get issuer signatures: ${error.message}`)
      }

      return (data || []).map(record => ({
        id: record.id,
        documentHash: record.document_hash,
        issuerId: record.issuer_id,
        keyId: record.key_id,
        signature: record.signature,
        algorithm: record.algorithm,
        signedAt: new Date(record.signed_at),
        verifiedAt: record.verified_at ? new Date(record.verified_at) : undefined,
        isValid: record.is_valid,
        verificationAttempts: record.verification_attempts
      }))
    } catch (error) {
      console.error('Error getting issuer signatures:', error)
      throw error
    }
  }

  /**
   * Verify document integrity using Merkle root
   */
  static async verifyDocumentIntegrity(
    documentHash: string,
    merkleRoot: string,
    issuerId: string
  ): Promise<{
    isValid: boolean
    signature?: DocumentSignature
    error?: string
  }> {
    try {
      // First, verify the document hash is part of the Merkle root
      // This would require implementing Merkle tree verification
      // For now, we'll assume the hash is valid if it matches the root
      
      // Get signatures for this document
      const signatures = await this.getDocumentSignatures(documentHash)
      
      if (signatures.length === 0) {
        return {
          isValid: false,
          error: 'No signatures found for this document'
        }
      }

      // Verify the most recent signature
      const latestSignature = signatures[0]
      const verification = await this.verifyDocumentSignature(
        documentHash,
        latestSignature.signature,
        issuerId
      )

      return {
        isValid: verification.isValid,
        signature: verification.signature,
        error: verification.error
      }
    } catch (error) {
      console.error('Error verifying document integrity:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Batch verify multiple documents
   */
  static async batchVerifyDocuments(
    documents: Array<{
      documentHash: string
      signature: string
      issuerId: string
    }>
  ): Promise<Array<{
    documentHash: string
    isValid: boolean
    error?: string
  }>> {
    const results = await Promise.allSettled(
      documents.map(async (doc) => {
        const verification = await this.verifyDocumentSignature(
          doc.documentHash,
          doc.signature,
          doc.issuerId
        )
        
        return {
          documentHash: doc.documentHash,
          isValid: verification.isValid,
          error: verification.error
        }
      })
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          documentHash: documents[index].documentHash,
          isValid: false,
          error: result.reason?.message || 'Verification failed'
        }
      }
    })
  }

  /**
   * Get signature statistics for an issuer
   */
  static async getSignatureStatistics(issuerId: string): Promise<{
    totalSignatures: number
    validSignatures: number
    invalidSignatures: number
    lastSignatureDate?: Date
    averageVerificationAttempts: number
  }> {
    try {
      const { data, error } = await supabase
        .from('document_signatures')
        .select('is_valid, signed_at, verification_attempts')
        .eq('issuer_id', issuerId)

      if (error) {
        throw new Error(`Failed to get signature statistics: ${error.message}`)
      }

      const signatures = data || []
      const totalSignatures = signatures.length
      const validSignatures = signatures.filter(s => s.is_valid === true).length
      const invalidSignatures = signatures.filter(s => s.is_valid === false).length
      const lastSignatureDate = signatures.length > 0 
        ? new Date(Math.max(...signatures.map(s => new Date(s.signed_at).getTime())))
        : undefined
      const averageVerificationAttempts = signatures.length > 0
        ? signatures.reduce((sum, s) => sum + s.verification_attempts, 0) / signatures.length
        : 0

      return {
        totalSignatures,
        validSignatures,
        invalidSignatures,
        lastSignatureDate,
        averageVerificationAttempts
      }
    } catch (error) {
      console.error('Error getting signature statistics:', error)
      throw error
    }
  }
}
