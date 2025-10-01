import { ethers, Contract, JsonRpcProvider, Wallet, BrowserProvider, JsonRpcSigner } from 'ethers'
import { CONTRACT_CONFIG } from './contract'

// Real TrustDoc Smart Contract ABI (from your actual contract)
export const TRUSTDOC_ABI = [
  // Events
  "event IssuerRegistered(string issuerId, string name, address indexed wallet)",
  "event RootAdded(bytes32 root, uint256 timestamp)",
  "event DocumentInvalidated(bytes32 docHash, string issuerId, uint256 timestamp)",
  "event RootInvalidated(bytes32 rootHash, string issuerId, uint256 timestamp)",
  "event WorkerAdded(address indexed worker)",
  
  // Access Control
  "function addWorker(address addr) external",
  "function isWorker(address addr) external view returns (bool)",
  "function getWorkers() external view returns (address[] memory)",
  "function owner() external view returns (address)",
  
  // Issuer Management
  "function registerIssuer(string memory issuerId, address pubKey, string memory name) external",
  "function getIssuerDetails(string memory issuerId) external view returns (string memory, string memory, tuple(address key, uint256 timestamp)[] memory)",
  
  // Merkle Root Management
  "function putRoot(bytes32 merkleRoot) external",
  "function getRootTimestamp(bytes32 root) external view returns (uint256)",
  "function roots_map(bytes32) external view returns (uint256)",
  
  // Document Invalidation
  "function invalidateDocument(bytes32 docHash, bytes memory signature, string memory issuerId) external",
  "function invalidateRoot(bytes32 rootHash, bytes memory signature, string memory issuerId) external",
  "function invalidateTimeWindow(string memory issuerId, uint256 startTime, uint256 endTime, bytes memory signature) external",
  
  // Verification
  "function isInvalidated(bytes32 docHash, bytes32 rootHash, string memory issuerId, uint256 invExpiry, uint256 issuedAt) external view returns (string memory, uint256)"
] as const

// Real Contract Instance Factory
export function getRealContractInstance(provider: JsonRpcProvider | BrowserProvider, useSigner = false) {
  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x1253369dab29F77692bF84DB759583ac47F66532'
  const contract = new Contract(
    contractAddress,
    TRUSTDOC_ABI,
    provider
  )

  return contract
}

// Real Blockchain Service
export class RealBlockchainService {
  private contract: Contract
  private provider: JsonRpcProvider | BrowserProvider
  private signer?: JsonRpcSigner | Wallet

  constructor(provider: JsonRpcProvider | BrowserProvider, signer?: JsonRpcSigner | Wallet) {
    this.provider = provider
    this.signer = signer
    this.contract = getRealContractInstance(provider, !!signer)
    
    if (signer) {
      this.contract = this.contract.connect(signer) as Contract
    }
  }

  // Check if address is a worker
  async isWorker(address: string): Promise<boolean> {
    try {
      return await this.contract.isWorker(address)
    } catch (error) {
      console.error('Error checking worker status:', error)
      throw new Error(`Failed to check worker status: ${error.message}`)
    }
  }

  // Add worker (only contract owner can do this)
  async addWorker(address: string): Promise<{
    txHash: string
    receipt: any
  }> {
    if (!this.signer) {
      throw new Error('Signer required for adding worker')
    }

    try {
      console.log('Adding worker:', address)
      
      const tx = await this.contract.addWorker(address)
      console.log('Transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('Transaction confirmed:', receipt.hash)
      
      return {
        txHash: tx.hash,
        receipt
      }
    } catch (error: any) {
      console.error('Error adding worker:', error)
      throw new Error(`Failed to add worker: ${error.message}`)
    }
  }

  // Get contract owner
  async getOwner(): Promise<string> {
    try {
      return await this.contract.owner()
    } catch (error: any) {
      console.error('Error getting owner:', error)
      throw new Error(`Failed to get owner: ${error.message}`)
    }
  }

  // Get all workers
  async getWorkers(): Promise<string[]> {
    try {
      return await this.contract.getWorkers()
    } catch (error) {
      console.error('Error getting workers:', error)
      throw new Error(`Failed to get workers: ${error.message}`)
    }
  }

  // Register issuer on blockchain
  async registerIssuer(issuerId: string, publicKey: string, name: string): Promise<{
    txHash: string
    receipt: any
  }> {
    if (!this.signer) {
      throw new Error('Signer required for issuer registration')
    }

    try {
      console.log('Registering issuer:', { issuerId, publicKey, name })
      
      const tx = await this.contract.registerIssuer(issuerId, publicKey, name)
      console.log('Transaction sent:', tx.hash)
      
      const receipt = await tx.wait()
      console.log('Transaction confirmed:', receipt.hash)
      
      return {
        txHash: tx.hash,
        receipt
      }
    } catch (error: any) {
      console.error('Error registering issuer:', error)
      throw new Error(`Failed to register issuer: ${error.message}`)
    }
  }

  // Store Merkle root on blockchain
  async putRoot(merkleRoot: string): Promise<any> {
    if (!this.signer) {
      throw new Error('Signer required for putting root')
    }

    try {
      console.log('Storing Merkle root:', merkleRoot)
      
      // Check if the signer is a worker first
      const signerAddress = await this.signer.getAddress()
      console.log('Signer address:', signerAddress)
      
      const isWorker = await this.isWorker(signerAddress)
      console.log('Is worker:', isWorker)
      
      if (!isWorker) {
        throw new Error(`Address ${signerAddress} is not registered as a worker. Please contact the contract owner to add your address as a worker.`)
      }

      // Verify contract function exists
      if (!this.contract.putRoot) {
        throw new Error('putRoot function not found on contract. Please check the contract ABI.')
      }
      
      console.log('Contract address:', this.contract.target)
      console.log('Merkle root to store:', merkleRoot)
      
      // Debug: Check available functions on contract
      console.log('Available contract functions:', Object.keys(this.contract.interface.fragments))
      
      // Estimate gas first
      let gasEstimate
      let gasLimit
      try {
        gasEstimate = await this.contract.putRoot.estimateGas(merkleRoot)
        console.log('Gas estimate:', gasEstimate.toString())
        // Add 20% buffer to gas estimate
        gasLimit = gasEstimate * 120n / 100n
        console.log('Gas limit with buffer:', gasLimit.toString())
      } catch (gasError: any) {
        console.error('Gas estimation failed:', gasError)
        console.log('Using fallback gas limit: 100,000')
        gasLimit = 100000n // Fallback gas limit
      }

      const tx = await this.contract.putRoot(merkleRoot, {
        gasLimit: gasLimit
      })
      console.log('Transaction sent:', tx.hash)
      
      // Return the transaction object so executeTransaction can handle the waiting
      return tx
    } catch (error: any) {
      console.error('Error storing Merkle root:', error)
      throw new Error(`Failed to store Merkle root: ${error.message}`)
    }
  }

  // Get root timestamp
  async getRootTimestamp(merkleRoot: string): Promise<number> {
    try {
      const timestamp = await this.contract.getRootTimestamp(merkleRoot)
      return Number(timestamp)
    } catch (error: any) {
      console.error('Error getting root timestamp:', error)
      throw new Error(`Failed to get root timestamp: ${error.message}`)
    }
  }

  // Check if root exists on blockchain
  async rootExists(merkleRoot: string): Promise<boolean> {
    try {
      const timestamp = await this.contract.roots_map(merkleRoot)
      return timestamp > 0
    } catch (error: any) {
      console.error('Error checking root existence:', error)
      return false
    }
  }

  // Get issuer details
  async getIssuerDetails(issuerId: string): Promise<{
    name: string
    wallet: string
    publicKeys: Array<{ key: string; timestamp: number }>
  }> {
    try {
      const [name, wallet, publicKeys] = await this.contract.getIssuerDetails(issuerId)
      return {
        name,
        wallet,
        publicKeys: publicKeys.map((pk: any) => ({
          key: pk.key,
          timestamp: Number(pk.timestamp)
        }))
      }
    } catch (error: any) {
      console.error('Error getting issuer details:', error)
      throw new Error(`Failed to get issuer details: ${error.message}`)
    }
  }

  // Invalidate document
  async invalidateDocument(docHash: string, signature: string, issuerId: string): Promise<{
    txHash: string
    receipt: any
  }> {
    if (!this.signer) {
      throw new Error('Signer required for document invalidation')
    }

    try {
      const tx = await this.contract.invalidateDocument(docHash, signature, issuerId)
      const receipt = await tx.wait()
      
      return {
        txHash: tx.hash,
        receipt
      }
    } catch (error: any) {
      console.error('Error invalidating document:', error)
      throw new Error(`Failed to invalidate document: ${error.message}`)
    }
  }

  // Invalidate root
  async invalidateRoot(rootHash: string, signature: string, issuerId: string): Promise<{
    txHash: string
    receipt: any
  }> {
    if (!this.signer) {
      throw new Error('Signer required for root invalidation')
    }

    try {
      const tx = await this.contract.invalidateRoot(rootHash, signature, issuerId)
      const receipt = await tx.wait()
      
      return {
        txHash: tx.hash,
        receipt
      }
    } catch (error: any) {
      console.error('Error invalidating root:', error)
      throw new Error(`Failed to invalidate root: ${error.message}`)
    }
  }

  // Check if document is invalidated
  async isInvalidated(
    docHash: string,
    rootHash: string,
    issuerId: string,
    invExpiry: number,
    issuedAt: number
  ): Promise<{ status: string; timestamp: number }> {
    try {
      const [status, timestamp] = await this.contract.isInvalidated(
        docHash,
        rootHash,
        issuerId,
        invExpiry,
        issuedAt
      )
      
      return {
        status,
        timestamp: Number(timestamp)
      }
    } catch (error: any) {
      console.error('Error checking invalidation status:', error)
      throw new Error(`Failed to check invalidation status: ${error.message}`)
    }
  }

  // Listen for events
  onIssuerRegistered(callback: (issuerId: string, name: string, wallet: string) => void): void {
    this.contract.on('IssuerRegistered', callback)
  }

  onRootAdded(callback: (root: string, timestamp: number) => void): void {
    this.contract.on('RootAdded', callback)
  }

  onDocumentInvalidated(callback: (docHash: string, issuerId: string, timestamp: number) => void): void {
    this.contract.on('DocumentInvalidated', callback)
  }

  onRootInvalidated(callback: (rootHash: string, issuerId: string, timestamp: number) => void): void {
    this.contract.on('RootInvalidated', callback)
  }

  // Remove all event listeners
  removeAllListeners(): void {
    this.contract.removeAllListeners()
  }
}

// Utility functions for contract interaction
export const contractUtils = {
  // Format address for display
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  },

  // Get transaction URL
  getTransactionUrl(txHash: string): string {
    return `https://amoy.polygonscan.com/tx/${txHash}`
  },

  // Get contract URL
  getContractUrl(): string {
    return `https://amoy.polygonscan.com/address/${CONTRACT_CONFIG.address}`
  },

  // Validate Merkle root format
  isValidMerkleRoot(root: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(root)
  },

  // Validate address format
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address)
  }
}
