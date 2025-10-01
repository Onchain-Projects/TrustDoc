import { supabase } from '@/lib/supabase'
import { CryptographicKeyService, KeyPair } from './keys'

export interface StoredKeyPair {
  id: string
  issuer_id: string
  key_id: string
  public_key: string
  encrypted_private_key: string
  algorithm: string
  key_size: number
  is_active: boolean
  created_at: string
  expires_at?: string
  last_used_at?: string
  fingerprint: string
}

export interface KeyRotationResult {
  success: boolean
  newKeyPair?: KeyPair
  oldKeyId?: string
  error?: string
}

export class KeyManagementService {
  /**
   * Generate and store new key pair for issuer
   */
  static async generateAndStoreKeyPair(
    issuerId: string, 
    algorithm: 'rsa' | 'ec' = 'ec',
    password?: string
  ): Promise<KeyPair> {
    try {
      // Generate new key pair
      const keyPair = CryptographicKeyService.generateKeyPair(algorithm)
      
      // Encrypt private key if password provided
      const encryptedPrivateKey = password 
        ? CryptographicKeyService.encryptPrivateKey(keyPair.privateKey, password)
        : keyPair.privateKey // Store unencrypted if no password (not recommended for production)
      
      // Generate fingerprint
      const fingerprint = CryptographicKeyService.getKeyFingerprint(keyPair.publicKey)
      
      // Store in database
      const { data, error } = await supabase
        .from('issuer_keys')
        .insert({
          issuer_id: issuerId,
          key_id: keyPair.keyId,
          public_key: keyPair.publicKey,
          encrypted_private_key: encryptedPrivateKey,
          algorithm: keyPair.algorithm,
          key_size: keyPair.keySize,
          is_active: true,
          fingerprint,
          created_at: keyPair.createdAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to store key pair: ${error.message}`)
      }

      console.log('Key pair generated and stored successfully:', data.key_id)
      return keyPair
    } catch (error) {
      console.error('Error generating and storing key pair:', error)
      throw error
    }
  }

  /**
   * Get active key pair for issuer
   */
  static async getActiveKeyPair(issuerId: string, password?: string): Promise<KeyPair | null> {
    try {
      const { data, error } = await supabase
        .from('issuer_keys')
        .select('*')
        .eq('issuer_id', issuerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No active key found
        }
        throw new Error(`Failed to get active key pair: ${error.message}`)
      }

      // Decrypt private key if password provided
      const privateKey = password 
        ? CryptographicKeyService.decryptPrivateKey(data.encrypted_private_key, password)
        : data.encrypted_private_key

      return {
        publicKey: data.public_key,
        privateKey,
        keyId: data.key_id,
        algorithm: data.algorithm,
        keySize: data.key_size,
        createdAt: new Date(data.created_at)
      }
    } catch (error) {
      console.error('Error getting active key pair:', error)
      throw error
    }
  }

  /**
   * Rotate keys for issuer
   */
  static async rotateKeys(
    issuerId: string, 
    algorithm: 'rsa' | 'ec' = 'ec',
    password?: string
  ): Promise<KeyRotationResult> {
    try {
      // Get current active key
      const currentKey = await this.getActiveKeyPair(issuerId, password)
      const oldKeyId = currentKey?.keyId

      // Deactivate current key
      if (currentKey) {
        await supabase
          .from('issuer_keys')
          .update({ is_active: false })
          .eq('issuer_id', issuerId)
          .eq('is_active', true)
      }

      // Generate new key pair
      const newKeyPair = await this.generateAndStoreKeyPair(issuerId, algorithm, password)

      // Update issuer's public key in issuers table
      await supabase
        .from('issuers')
        .update({ 
          public_key: newKeyPair.publicKey,
          updated_at: new Date().toISOString()
        })
        .eq('issuer_id', issuerId)

      console.log('Key rotation completed successfully')
      return {
        success: true,
        newKeyPair,
        oldKeyId
      }
    } catch (error) {
      console.error('Error rotating keys:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Validate issuer's key pair
   */
  static async validateIssuerKeys(issuerId: string, password?: string): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    keyInfo?: {
      keyId: string
      algorithm: string
      keySize: number
      fingerprint: string
      createdAt: Date
      isExpired: boolean
    }
  }> {
    try {
      const keyPair = await this.getActiveKeyPair(issuerId, password)
      
      if (!keyPair) {
        return {
          isValid: false,
          errors: ['No active key pair found for issuer'],
          warnings: []
        }
      }

      // Validate key pair
      const validation = CryptographicKeyService.validateKeyPair(
        keyPair.publicKey, 
        keyPair.privateKey
      )

      // Check if key is expired
      const isExpired = CryptographicKeyService.isKeyExpired(keyPair)
      if (isExpired) {
        validation.warnings.push('Key pair has expired and should be rotated')
      }

      // Get key info
      const keyInfo = {
        keyId: keyPair.keyId,
        algorithm: keyPair.algorithm,
        keySize: keyPair.keySize,
        fingerprint: CryptographicKeyService.getKeyFingerprint(keyPair.publicKey),
        createdAt: keyPair.createdAt,
        isExpired
      }

      return {
        ...validation,
        keyInfo
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        warnings: []
      }
    }
  }

  /**
   * Get key history for issuer
   */
  static async getKeyHistory(issuerId: string): Promise<StoredKeyPair[]> {
    try {
      const { data, error } = await supabase
        .from('issuer_keys')
        .select('*')
        .eq('issuer_id', issuerId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to get key history: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting key history:', error)
      throw error
    }
  }

  /**
   * Backup key pair
   */
  static async backupKeyPair(issuerId: string, password: string): Promise<string> {
    try {
      const keyPair = await this.getActiveKeyPair(issuerId, password)
      
      if (!keyPair) {
        throw new Error('No active key pair found for backup')
      }

      return CryptographicKeyService.generateKeyBackup(keyPair, password)
    } catch (error) {
      console.error('Error backing up key pair:', error)
      throw error
    }
  }

  /**
   * Restore key pair from backup
   */
  static async restoreKeyPair(
    issuerId: string, 
    backupData: string, 
    password: string
  ): Promise<KeyPair> {
    try {
      // Restore key from backup
      const keyPair = CryptographicKeyService.restoreKeyFromBackup(backupData, password)
      
      // Deactivate current keys
      await supabase
        .from('issuer_keys')
        .update({ is_active: false })
        .eq('issuer_id', issuerId)
        .eq('is_active', true)

      // Store restored key
      const encryptedPrivateKey = CryptographicKeyService.encryptPrivateKey(keyPair.privateKey, password)
      const fingerprint = CryptographicKeyService.getKeyFingerprint(keyPair.publicKey)
      
      const { data, error } = await supabase
        .from('issuer_keys')
        .insert({
          issuer_id: issuerId,
          key_id: keyPair.keyId,
          public_key: keyPair.publicKey,
          encrypted_private_key: encryptedPrivateKey,
          algorithm: keyPair.algorithm,
          key_size: keyPair.keySize,
          is_active: true,
          fingerprint,
          created_at: keyPair.createdAt.toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to store restored key pair: ${error.message}`)
      }

      // Update issuer's public key
      await supabase
        .from('issuers')
        .update({ 
          public_key: keyPair.publicKey,
          updated_at: new Date().toISOString()
        })
        .eq('issuer_id', issuerId)

      console.log('Key pair restored successfully')
      return keyPair
    } catch (error) {
      console.error('Error restoring key pair:', error)
      throw error
    }
  }

  /**
   * Sign document with issuer's private key
   */
  static async signDocument(
    issuerId: string, 
    documentHash: string, 
    password?: string
  ): Promise<string> {
    try {
      const keyPair = await this.getActiveKeyPair(issuerId, password)
      
      if (!keyPair) {
        throw new Error('No active key pair found for signing')
      }

      const signature = CryptographicKeyService.signData(documentHash, keyPair.privateKey)
      
      // Update last used timestamp
      await supabase
        .from('issuer_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('issuer_id', issuerId)
        .eq('is_active', true)

      return signature
    } catch (error) {
      console.error('Error signing document:', error)
      throw error
    }
  }

  /**
   * Verify document signature
   */
  static async verifyDocumentSignature(
    issuerId: string,
    documentHash: string,
    signature: string
  ): Promise<boolean> {
    try {
      const keyPair = await this.getActiveKeyPair(issuerId)
      
      if (!keyPair) {
        throw new Error('No active key pair found for verification')
      }

      return CryptographicKeyService.verifySignature(
        documentHash, 
        signature, 
        keyPair.publicKey
      )
    } catch (error) {
      console.error('Error verifying document signature:', error)
      return false
    }
  }

  /**
   * Clean up expired keys (maintenance function)
   */
  static async cleanupExpiredKeys(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('issuer_keys')
        .select('*')
        .eq('is_active', false)

      if (error) {
        throw new Error(`Failed to get expired keys: ${error.message}`)
      }

      let cleanedCount = 0
      const cutoffDate = new Date()
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2) // Keep keys for 2 years

      for (const key of data || []) {
        const keyDate = new Date(key.created_at)
        if (keyDate < cutoffDate) {
          await supabase
            .from('issuer_keys')
            .delete()
            .eq('id', key.id)
          
          cleanedCount++
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired keys`)
      return cleanedCount
    } catch (error) {
      console.error('Error cleaning up expired keys:', error)
      throw error
    }
  }
}
