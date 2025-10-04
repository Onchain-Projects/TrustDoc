import { ethers } from 'ethers'
import { CONTRACT_CONFIG, TRUSTDOC_ABI } from './contract'

export interface BlockchainIssuer {
  issuerId: string
  name: string
  walletAddress: string
}

export interface BlockchainWorker {
  address: string
  isActive: boolean
}

export interface MerkleRootData {
  root: string
  timestamp: number
}

export class BlockchainService {
  private contract: ethers.Contract
  private provider: ethers.JsonRpcProvider

  constructor() {
    // Create provider with explicit network configuration to avoid ENS resolution
    this.provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.network.rpcUrl, {
      name: 'polygon-amoy',
      chainId: CONTRACT_CONFIG.network.chainId,
      ensAddress: null // Explicitly disable ENS
    })
    this.contract = new ethers.Contract(
      CONTRACT_CONFIG.address,
      TRUSTDOC_ABI,
      this.provider
    )
  }

  /**
   * Get contract instance with owner wallet for transactions
   */
  private async getOwnerContract(): Promise<ethers.Contract> {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('Owner private key not found in environment variables')
    }

    // Create provider with explicit network configuration to avoid ENS resolution
    const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.network.rpcUrl, {
      name: 'polygon-amoy',
      chainId: CONTRACT_CONFIG.network.chainId,
      ensAddress: null // Explicitly disable ENS
    })
    const wallet = new ethers.Wallet(privateKey, provider)
    return new ethers.Contract(CONTRACT_CONFIG.address, TRUSTDOC_ABI, wallet)
  }

  /**
   * Register an issuer on the smart contract
   */
  async registerIssuer(issuerData: BlockchainIssuer): Promise<string> {
    try {
      console.log('🔗 Registering issuer on blockchain:', issuerData.issuerId)
      
      const contract = await this.getOwnerContract()
      
      // Ensure wallet address is properly formatted
      const walletAddress = issuerData.walletAddress.startsWith('0x') 
        ? issuerData.walletAddress 
        : `0x${issuerData.walletAddress}`
      
      // Validate that it's a proper Ethereum address
      if (!ethers.isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`)
      }
      
      const tx = await contract.registerIssuer(
        issuerData.issuerId,
        walletAddress,
        issuerData.name
      )
      
      console.log('📝 Transaction submitted:', tx.hash)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('✅ Issuer registered on blockchain:', receipt.transactionHash)
      
      return receipt.transactionHash
    } catch (error) {
      console.error('❌ Error registering issuer on blockchain:', error)
      throw new Error(`Failed to register issuer on blockchain: ${error}`)
    }
  }

  /**
   * Add an issuer as a worker on the smart contract
   */
  async addWorker(walletAddress: string): Promise<string> {
    try {
      console.log('👷 Adding worker to blockchain:', walletAddress)
      
      const contract = await this.getOwnerContract()
      
      // Ensure wallet address is properly formatted
      const formattedAddress = walletAddress.startsWith('0x') 
        ? walletAddress 
        : `0x${walletAddress}`
      
      // Validate that it's a proper Ethereum address
      if (!ethers.isAddress(formattedAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`)
      }
      
      const tx = await contract.addWorker(formattedAddress)
      
      console.log('📝 Transaction submitted:', tx.hash)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('✅ Worker added to blockchain:', receipt.transactionHash)
      
      return receipt.transactionHash
    } catch (error) {
      console.error('❌ Error adding worker to blockchain:', error)
      throw new Error(`Failed to add worker to blockchain: ${error}`)
    }
  }

  /**
   * Check if an address is a worker
   */
  async isWorker(walletAddress: string): Promise<boolean> {
    try {
      const result = await this.contract.isWorker(walletAddress)
      return result
    } catch (error) {
      console.error('❌ Error checking worker status:', error)
      return false
    }
  }

  /**
   * Get all workers from the smart contract
   */
  async getWorkers(): Promise<string[]> {
    try {
      const workers = await this.contract.getWorkers()
      return workers
    } catch (error) {
      console.error('❌ Error getting workers:', error)
      return []
    }
  }

  /**
   * Get issuer details from the smart contract
   */
  async getIssuerDetails(issuerId: string): Promise<any> {
    try {
      const details = await this.contract.getIssuerDetails(issuerId)
      return details
    } catch (error) {
      console.error('❌ Error getting issuer details:', error)
      return null
    }
  }

  /**
   * Store Merkle root on blockchain (callable by workers)
   */
  async storeMerkleRoot(merkleRoot: string, workerWallet: any): Promise<string> {
    try {
      console.log('🌳 Storing Merkle root on blockchain:', merkleRoot)
      
      if (!workerWallet) {
        throw new Error('Worker wallet is required to store Merkle roots')
      }

      const contract = new ethers.Contract(
        CONTRACT_CONFIG.address,
        TRUSTDOC_ABI,
        workerWallet
      )
      
      const tx = await contract.putRoot(merkleRoot)
      
      console.log('📝 Transaction submitted:', tx.hash)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('✅ Merkle root stored on blockchain:', receipt.transactionHash)
      
      return receipt.transactionHash
    } catch (error) {
      console.error('❌ Error storing Merkle root on blockchain:', error)
      throw new Error(`Failed to store Merkle root on blockchain: ${error}`)
    }
  }

  /**
   * Get Merkle root timestamp from blockchain
   */
  async getMerkleRootTimestamp(merkleRoot: string): Promise<number> {
    try {
      const timestamp = await this.contract.getRootTimestamp(merkleRoot)
      return timestamp.toNumber()
    } catch (error) {
      console.error('❌ Error getting Merkle root timestamp:', error)
      return 0
    }
  }

  /**
   * Invalidate a document (owner only)
   */
  async invalidateDocument(
    docHash: string, 
    signature: string, 
    issuerId: string
  ): Promise<string> {
    try {
      console.log('🚫 Invalidating document on blockchain:', docHash)
      
      const contract = await this.getOwnerContract()
      
      const tx = await contract.invalidateDocument(docHash, signature, issuerId)
      
      console.log('📝 Transaction submitted:', tx.hash)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('✅ Document invalidated on blockchain:', receipt.transactionHash)
      
      return receipt.transactionHash
    } catch (error) {
      console.error('❌ Error invalidating document on blockchain:', error)
      throw new Error(`Failed to invalidate document on blockchain: ${error}`)
    }
  }

  /**
   * Invalidate a Merkle root (owner only)
   */
  async invalidateRoot(
    rootHash: string, 
    signature: string, 
    issuerId: string
  ): Promise<string> {
    try {
      console.log('🚫 Invalidating Merkle root on blockchain:', rootHash)
      
      const contract = await this.getOwnerContract()
      
      const tx = await contract.invalidateRoot(rootHash, signature, issuerId)
      
      console.log('📝 Transaction submitted:', tx.hash)
      
      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('✅ Merkle root invalidated on blockchain:', receipt.transactionHash)
      
      return receipt.transactionHash
    } catch (error) {
      console.error('❌ Error invalidating Merkle root on blockchain:', error)
      throw new Error(`Failed to invalidate Merkle root on blockchain: ${error}`)
    }
  }

  /**
   * Check if document is invalidated
   */
  async isDocumentInvalidated(
    docHash: string,
    rootHash: string,
    issuerId: string,
    invExpiry: number,
    issuedAt: number
  ): Promise<{ status: string; timestamp: number }> {
    try {
      const result = await this.contract.isInvalidated(
        docHash,
        rootHash,
        issuerId,
        invExpiry,
        issuedAt
      )
      return {
        status: result[0],
        timestamp: result[1].toNumber()
      }
    } catch (error) {
      console.error('❌ Error checking document invalidation:', error)
      return { status: 'unknown', timestamp: 0 }
    }
  }

  /**
   * Get contract owner address
   */
  async getContractOwner(): Promise<string> {
    try {
      const owner = await this.contract.owner()
      return owner
    } catch (error) {
      console.error('❌ Error getting contract owner:', error)
      return ''
    }
  }

  /**
   * Verify blockchain connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const owner = await this.getContractOwner()
      return owner !== ''
    } catch (error) {
      console.error('❌ Blockchain connection verification failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService()
