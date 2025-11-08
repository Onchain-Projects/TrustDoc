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
  private async getOwnerContract(): Promise<{ contract: ethers.Contract; provider: ethers.JsonRpcProvider; wallet: ethers.Wallet }> {
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
    const contract = new ethers.Contract(CONTRACT_CONFIG.address, TRUSTDOC_ABI, wallet)
    return { contract, provider, wallet }
  }

  /**
   * Register an issuer on the smart contract
   */
  async registerIssuer(issuerData: BlockchainIssuer): Promise<string> {
    try {
      console.log('🔗 Registering issuer on blockchain:', issuerData.issuerId)
      
      const { contract, provider, wallet: ownerWallet } = await this.getOwnerContract()
      
      // CRITICAL FIX #1: Verify owner address BEFORE attempting transaction
      const ownerAddress = await ownerWallet.getAddress()
      const contractOwner = await contract.owner()
      
      console.log('🔍 Owner verification:', {
        walletAddress: ownerAddress,
        contractOwner: contractOwner,
        match: ownerAddress.toLowerCase() === contractOwner.toLowerCase()
      })
      
      if (ownerAddress.toLowerCase() !== contractOwner.toLowerCase()) {
        throw new Error(
          `❌ CRITICAL: Wallet address (${ownerAddress}) does not match contract owner (${contractOwner}). ` +
          `Only the contract owner can register issuers. Please use the correct private key in VITE_PRIVATE_KEY.`
        )
      }
      
      // CRITICAL FIX #2: Check wallet balance
      const balance = await provider.getBalance(ownerAddress)
      const minBalance = ethers.parseUnits('0.01', 'ether') // Minimum 0.01 MATIC
      
      console.log('💰 Wallet balance check:', {
        balance: ethers.formatEther(balance),
        minRequired: ethers.formatEther(minBalance),
        sufficient: balance >= minBalance
      })
      
      if (balance < minBalance) {
        throw new Error(
          `❌ Insufficient balance: Wallet has ${ethers.formatEther(balance)} MATIC, ` +
          `but needs at least ${ethers.formatEther(minBalance)} MATIC for gas fees. ` +
          `Please fund the owner wallet with MATIC tokens.`
        )
      }
      
      // Ensure wallet address is properly formatted
      const walletAddress = issuerData.walletAddress.startsWith('0x') 
        ? issuerData.walletAddress 
        : `0x${issuerData.walletAddress}`
      
      // Validate that it's a proper Ethereum address
      if (!ethers.isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`)
      }
      
      // Convert address to uint256 (BigInt) as required by the contract
      const pubKeyAsUint256 = BigInt(walletAddress)
      
      // CRITICAL FIX #3: Check if issuer already exists BEFORE gas estimation
      try {
        const existingIssuer = await contract.getIssuerDetails(issuerData.issuerId)
        if (existingIssuer && existingIssuer.id && existingIssuer.id.length > 0) {
          throw new Error(
            `❌ Issuer already exists: ${issuerData.issuerId}. ` +
            `Cannot register the same issuer twice.`
          )
        }
      } catch (checkError: any) {
        // If error is about issuer not existing, that's fine - we can proceed
        if (!checkError.message || !checkError.message.includes('already exists')) {
          console.log('Issuer does not exist yet, proceeding with registration...')
        } else {
          throw checkError
        }
      }
      
      // Get current gas price from network and set appropriate prices for Polygon Amoy
      const feeData = await provider.getFeeData()
      
      // For Polygon Amoy, use LEGACY gasPrice (more reliable than EIP-1559)
      const gasOptions: any = {}
      
      if (feeData.gasPrice) {
        // Use network's gasPrice with 100% buffer (double) for Polygon Amoy to ensure it goes through
        const networkGasPrice = feeData.gasPrice
        const bufferedGasPrice = networkGasPrice * 200n / 100n // Double the gas price (100% buffer)
        
        // Ensure minimum of 60 gwei for Polygon Amoy
        const minGasPrice = ethers.parseUnits('60', 'gwei')
        gasOptions.gasPrice = bufferedGasPrice > minGasPrice ? bufferedGasPrice : minGasPrice
      } else {
        // Fallback: use very high gas price if network data unavailable
        gasOptions.gasPrice = ethers.parseUnits('100', 'gwei') // 100 gwei fallback
      }
      
      // CRITICAL FIX #4: Estimate gas limit with proper error handling
      let gasLimit: bigint
      try {
        const estimatedGas = await contract.registerIssuer.estimateGas(
          issuerData.issuerId,
          pubKeyAsUint256,
          issuerData.name
        )
        gasLimit = estimatedGas * 120n / 100n // Add 20% buffer
        console.log('✅ Gas estimation successful:', {
          estimated: estimatedGas.toString(),
          withBuffer: gasLimit.toString()
        })
      } catch (gasError: any) {
        console.error('❌ Gas estimation failed:', gasError)
        
        // If gas estimation fails, it might be because:
        // 1. Transaction would revert (not owner, already exists, etc.)
        // 2. Network issue
        // 3. Insufficient gas
        
        // Check if it's a revert reason
        if (gasError.reason || gasError.message) {
          const errorMsg = gasError.reason || gasError.message
          if (errorMsg.includes('Only owner') || errorMsg.includes('onlyOwner')) {
            throw new Error(
              `❌ Transaction would revert: Only contract owner can register issuers. ` +
              `Wallet ${ownerAddress} is not the contract owner.`
            )
          }
          if (errorMsg.includes('already exists') || errorMsg.includes('Issuer already exists')) {
            throw new Error(
              `❌ Transaction would revert: Issuer ${issuerData.issuerId} already exists.`
            )
          }
        }
        
        // Use default gas limit as fallback
        gasLimit = 300000n // Increased default for safety
        console.warn('⚠️ Using default gas limit:', gasLimit.toString())
      }
      
      gasOptions.gasLimit = gasLimit
      
      // CRITICAL FIX #5: Get nonce with proper handling
      const latestNonce = await provider.getTransactionCount(ownerAddress, 'latest')
      const pendingNonce = await provider.getTransactionCount(ownerAddress, 'pending')
      
      console.log('📊 Nonce information:', {
        latest: latestNonce,
        pending: pendingNonce,
        hasPending: pendingNonce > latestNonce,
        willUse: pendingNonce
      })
      
      // Use pending nonce to queue behind any pending transactions
      gasOptions.nonce = pendingNonce
      
      console.log('📤 Submitting transaction with:', {
        issuerId: issuerData.issuerId,
        pubKey: pubKeyAsUint256.toString(),
        name: issuerData.name,
        gasPrice: ethers.formatUnits(gasOptions.gasPrice, 'gwei') + ' gwei',
        gasLimit: gasOptions.gasLimit.toString(),
        nonce: gasOptions.nonce
      })
      
      // CRITICAL FIX #6: Submit transaction with proper error handling
      const tx = await contract.registerIssuer(
        issuerData.issuerId,
        pubKeyAsUint256,
        issuerData.name,
        gasOptions
      )
      
      console.log('📝 Transaction submitted:', tx.hash)
      console.log('🔗 View on PolygonScan:', `https://amoy.polygonscan.com/tx/${tx.hash}`)
      
      // CRITICAL FIX #7: Wait for transaction with timeout and proper error handling
      try {
        console.log('⏳ Waiting for transaction confirmation...')
        
        // Wait with timeout (5 minutes max)
        const receipt = await Promise.race([
          tx.wait(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction timeout after 5 minutes')), 300000)
          )
        ]) as ethers.ContractTransactionReceipt
        
        console.log('✅ Transaction confirmed!', {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? 'Success' : 'Failed'
        })
        
        // CRITICAL FIX #8: Check transaction status
        if (receipt.status !== 1) {
          // Transaction was mined but failed
          throw new Error(
            `❌ Transaction failed on blockchain. ` +
            `Check details: https://amoy.polygonscan.com/tx/${tx.hash}`
          )
        }
        
        console.log('✅ Issuer registered on blockchain:', receipt.transactionHash)
        return receipt.transactionHash
        
      } catch (waitError: any) {
        console.error('❌ Error waiting for transaction:', waitError)
        
        // If timeout, transaction might still be pending
        if (waitError.message && waitError.message.includes('timeout')) {
          throw new Error(
            `⏳ Transaction submitted but not confirmed within 5 minutes. ` +
            `Transaction hash: ${tx.hash}\n` +
            `Check status: https://amoy.polygonscan.com/tx/${tx.hash}\n` +
            `The transaction may still be processing. Please check PolygonScan.`
          )
        }
        
        // Check if transaction was reverted
        if (waitError.reason || waitError.message) {
          const errorMsg = waitError.reason || waitError.message
          if (errorMsg.includes('Only owner') || errorMsg.includes('onlyOwner')) {
            throw new Error(
              `❌ Transaction reverted: Only contract owner can register issuers. ` +
              `Wallet ${ownerAddress} is not the contract owner.`
            )
          }
          if (errorMsg.includes('already exists') || errorMsg.includes('Issuer already exists')) {
            throw new Error(
              `❌ Transaction reverted: Issuer ${issuerData.issuerId} already exists.`
            )
          }
        }
        
        throw waitError
      }
      
    } catch (error: any) {
      console.error('❌ Error registering issuer on blockchain:', error)
      
      // Provide user-friendly error message
      if (error.reason) {
        throw new Error(`Failed to register issuer: ${error.reason}`)
      }
      if (error.message) {
        throw new Error(`Failed to register issuer: ${error.message}`)
      }
      throw new Error(`Failed to register issuer on blockchain: ${error}`)
    }
  }

  /**
   * Add an issuer as a worker on the smart contract
   */
  async addWorker(walletAddress: string): Promise<string> {
    try {
      console.log('👷 Adding worker to blockchain:', walletAddress)
      
      const { contract } = await this.getOwnerContract()
      
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
      
      const { contract } = await this.getOwnerContract()
      
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
      
      const { contract } = await this.getOwnerContract()
      
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
