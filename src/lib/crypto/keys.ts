import crypto from 'crypto'

export interface KeyPair {
  publicKey: string
  privateKey: string
  keyId: string
  algorithm: string
  keySize: number
  createdAt: Date
}

export interface KeyValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class CryptographicKeyService {
  private static readonly SUPPORTED_ALGORITHMS = ['rsa', 'ec'] as const
  private static readonly DEFAULT_ALGORITHM = 'ec'
  private static readonly DEFAULT_KEY_SIZE = 256 // For ECDSA
  private static readonly RSA_KEY_SIZE = 2048

  /**
   * Generate a new cryptographic key pair
   */
  static generateKeyPair(algorithm: 'rsa' | 'ec' = this.DEFAULT_ALGORITHM): KeyPair {
    const keyId = this.generateKeyId()
    const createdAt = new Date()

    try {
      if (algorithm === 'ec') {
        return this.generateECDSAKeyPair(keyId, createdAt)
      } else {
        return this.generateRSAKeyPair(keyId, createdAt)
      }
    } catch (error) {
      throw new Error(`Failed to generate ${algorithm.toUpperCase()} key pair: ${error}`)
    }
  }

  /**
   * Generate ECDSA key pair (recommended for blockchain compatibility)
   */
  private static generateECDSAKeyPair(keyId: string, createdAt: Date): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1', // Same curve as Bitcoin/Ethereum
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    return {
      publicKey: publicKey.toString(),
      privateKey: privateKey.toString(),
      keyId,
      algorithm: 'ec',
      keySize: 256,
      createdAt
    }
  }

  /**
   * Generate RSA key pair
   */
  private static generateRSAKeyPair(keyId: string, createdAt: Date): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.RSA_KEY_SIZE,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    })

    return {
      publicKey: publicKey.toString(),
      privateKey: privateKey.toString(),
      keyId,
      algorithm: 'rsa',
      keySize: this.RSA_KEY_SIZE,
      createdAt
    }
  }

  /**
   * Generate a unique key ID
   */
  private static generateKeyId(): string {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(8).toString('hex')
    return `key_${timestamp}_${random}`
  }

  /**
   * Validate a key pair
   */
  static validateKeyPair(publicKey: string, privateKey: string): KeyValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Check if keys are valid PEM format
      if (!this.isValidPEM(publicKey)) {
        errors.push('Public key is not in valid PEM format')
      }

      if (!this.isValidPEM(privateKey)) {
        errors.push('Private key is not in valid PEM format')
      }

      // Try to create key objects
      let publicKeyObj: crypto.KeyObject
      let privateKeyObj: crypto.KeyObject

      try {
        publicKeyObj = crypto.createPublicKey(publicKey)
        privateKeyObj = crypto.createPrivateKey(privateKey)
      } catch (error) {
        errors.push(`Invalid key format: ${error}`)
        return { isValid: false, errors, warnings }
      }

      // Check if keys match
      if (!this.keysMatch(publicKeyObj, privateKeyObj)) {
        errors.push('Public and private keys do not match')
      }

      // Check key size
      const keySize = this.getKeySize(publicKeyObj)
      if (keySize < 2048 && publicKeyObj.asymmetricKeyType === 'rsa') {
        warnings.push('RSA key size is less than 2048 bits, consider using a larger key')
      }

      // Check algorithm
      const algorithm = publicKeyObj.asymmetricKeyType
      if (!this.SUPPORTED_ALGORITHMS.includes(algorithm as any)) {
        warnings.push(`Unsupported algorithm: ${algorithm}`)
      }

    } catch (error) {
      errors.push(`Validation error: ${error}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Check if a string is valid PEM format
   */
  private static isValidPEM(key: string): boolean {
    const pemRegex = /^-----BEGIN [A-Z ]+-----\n[A-Za-z0-9+/=\s]+\n-----END [A-Z ]+-----$/
    return pemRegex.test(key.trim())
  }

  /**
   * Check if public and private keys match
   */
  private static keysMatch(publicKey: crypto.KeyObject, privateKey: crypto.KeyObject): boolean {
    try {
      // Create a test message
      const testMessage = 'test message for key validation'
      
      // Sign with private key
      const sign = crypto.createSign('SHA256')
      sign.update(testMessage)
      sign.end()
      const signature = sign.sign(privateKey)

      // Verify with public key
      const verify = crypto.createVerify('SHA256')
      verify.update(testMessage)
      verify.end()
      
      return verify.verify(publicKey, signature)
    } catch (error) {
      return false
    }
  }

  /**
   * Get key size in bits
   */
  private static getKeySize(key: crypto.KeyObject): number {
    try {
      const keyDetails = key.asymmetricKeyDetails
      return keyDetails?.modulusLength || keyDetails?.namedCurve === 'secp256k1' ? 256 : 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Sign data with private key
   */
  static signData(data: string, privateKey: string, algorithm: string = 'SHA256'): string {
    try {
      const key = crypto.createPrivateKey(privateKey)
      const sign = crypto.createSign(algorithm)
      sign.update(data)
      sign.end()
      return sign.sign(key, 'hex')
    } catch (error) {
      throw new Error(`Failed to sign data: ${error}`)
    }
  }

  /**
   * Verify signature with public key
   */
  static verifySignature(data: string, signature: string, publicKey: string, algorithm: string = 'SHA256'): boolean {
    try {
      const key = crypto.createPublicKey(publicKey)
      const verify = crypto.createVerify(algorithm)
      verify.update(data)
      verify.end()
      return verify.verify(key, signature, 'hex')
    } catch (error) {
      return false
    }
  }

  /**
   * Encrypt private key with password
   */
  static encryptPrivateKey(privateKey: string, password: string): string {
    try {
      const algorithm = 'aes-256-gcm'
      const key = crypto.scryptSync(password, 'salt', 32)
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipher(algorithm, key)
      
      let encrypted = cipher.update(privateKey, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      
      return JSON.stringify({
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
      })
    } catch (error) {
      throw new Error(`Failed to encrypt private key: ${error}`)
    }
  }

  /**
   * Decrypt private key with password
   */
  static decryptPrivateKey(encryptedKey: string, password: string): string {
    try {
      const keyData = JSON.parse(encryptedKey)
      const key = crypto.scryptSync(password, 'salt', 32)
      const iv = Buffer.from(keyData.iv, 'hex')
      const authTag = Buffer.from(keyData.authTag, 'hex')
      
      const decipher = crypto.createDecipher(keyData.algorithm, key)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(keyData.encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error(`Failed to decrypt private key: ${error}`)
    }
  }

  /**
   * Generate key backup data
   */
  static generateKeyBackup(keyPair: KeyPair, password: string): string {
    const backup = {
      keyId: keyPair.keyId,
      algorithm: keyPair.algorithm,
      keySize: keyPair.keySize,
      createdAt: keyPair.createdAt.toISOString(),
      publicKey: keyPair.publicKey,
      encryptedPrivateKey: this.encryptPrivateKey(keyPair.privateKey, password),
      version: '1.0'
    }

    return JSON.stringify(backup, null, 2)
  }

  /**
   * Restore key from backup
   */
  static restoreKeyFromBackup(backupData: string, password: string): KeyPair {
    try {
      const backup = JSON.parse(backupData)
      
      if (backup.version !== '1.0') {
        throw new Error('Unsupported backup version')
      }

      const privateKey = this.decryptPrivateKey(backup.encryptedPrivateKey, password)
      
      return {
        publicKey: backup.publicKey,
        privateKey,
        keyId: backup.keyId,
        algorithm: backup.algorithm,
        keySize: backup.keySize,
        createdAt: new Date(backup.createdAt)
      }
    } catch (error) {
      throw new Error(`Failed to restore key from backup: ${error}`)
    }
  }

  /**
   * Check if key is expired (optional feature)
   */
  static isKeyExpired(keyPair: KeyPair, maxAgeDays: number = 365): boolean {
    const now = new Date()
    const keyAge = now.getTime() - keyPair.createdAt.getTime()
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    
    return keyAge > maxAge
  }

  /**
   * Get key fingerprint for identification
   */
  static getKeyFingerprint(publicKey: string): string {
    try {
      const key = crypto.createPublicKey(publicKey)
      const keyDer = key.asymmetricKeyType === 'rsa' 
        ? key.export({ type: 'spki', format: 'der' })
        : key.export({ type: 'spki', format: 'der' })
      
      const hash = crypto.createHash('sha256').update(keyDer).digest('hex')
      return hash.substring(0, 16).toUpperCase()
    } catch (error) {
      throw new Error(`Failed to generate key fingerprint: ${error}`)
    }
  }
}
