import { ethers } from 'ethers'

// Smart Contract Configuration
export const CONTRACT_CONFIG = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS || '0x1253369dab29F77692bF84DB759583ac47F66532',
  network: {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: import.meta.env.VITE_ALCHEMY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://amoy.polygonscan.com'
  }
}

// TrustDoc Smart Contract ABI
export const TRUSTDOC_ABI = [
  // Access Control
  "function addWorker(address addr) public onlyOwner",
  "function isWorker(address addr) public view returns (bool)",
  "function getWorkers() public view returns (address[] memory)",
  
  // Issuer Management
  "function registerIssuer(string memory issuerId, address pubKey, string memory name) public onlyOwner",
  "function getIssuerDetails(string memory issuerId) public view returns (string memory, string memory, IssuerPubKey[] memory)",
  
  // Merkle Root Management
  "function putRoot(bytes32 merkleRoot) public onlyWorker",
  "function getRootTimestamp(bytes32 root) public view returns (uint256)",
  
  // Document Invalidation
  "function invalidateDocument(bytes32 docHash, bytes memory signature, string memory issuerId) public onlyOwner",
  "function invalidateRoot(bytes32 rootHash, bytes memory signature, string memory issuerId) public onlyOwner",
  "function invalidateTimeWindow(string memory issuerId, uint256 startTime, uint256 endTime, bytes memory signature) public onlyOwner",
  
  // Verification
  "function isInvalidated(bytes32 docHash, bytes32 rootHash, string memory issuerId, uint256 invExpiry, uint256 issuedAt) public view returns (string memory, uint256)",
  
  // Events
  "event IssuerRegistered(string issuerId, string name, address indexed wallet)",
  "event RootAdded(bytes32 root, uint256 timestamp)",
  "event DocumentInvalidated(bytes32 docHash, string issuerId, uint256 timestamp)",
  "event RootInvalidated(bytes32 rootHash, string issuerId, uint256 timestamp)",
  
  // Modifiers
  "modifier onlyOwner()",
  "modifier onlyWorker()"
]

// Contract Instance Factory
export function getContractInstance(useOwner = false) {
  const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.network.rpcUrl)
  
  if (useOwner) {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('Private key not found in environment variables')
    }
    const wallet = new ethers.Wallet(privateKey, provider)
    return {
      contract: new ethers.Contract(CONTRACT_CONFIG.address, TRUSTDOC_ABI, wallet),
      provider,
      wallet
    }
  }
  
  return {
    contract: new ethers.Contract(CONTRACT_CONFIG.address, TRUSTDOC_ABI, provider),
    provider
  }
}

// Blockchain Utility Functions
export const blockchainUtils = {
  // Check if address is a worker
  async isWorker(address: string): Promise<boolean> {
    const { contract } = getContractInstance()
    return await contract.isWorker(address)
  },

  // Get all workers
  async getWorkers(): Promise<string[]> {
    const { contract } = getContractInstance()
    return await contract.getWorkers()
  },

  // Register issuer on blockchain
  async registerIssuer(issuerId: string, publicKey: string, name: string): Promise<string> {
    const { contract } = getContractInstance(true)
    const tx = await contract.registerIssuer(issuerId, publicKey, name)
    const receipt = await tx.wait()
    return receipt.transactionHash
  },

  // Store Merkle root on blockchain
  async putRoot(merkleRoot: string): Promise<string> {
    const { contract } = getContractInstance(true)
    const tx = await contract.putRoot(merkleRoot)
    const receipt = await tx.wait()
    return receipt.transactionHash
  },

  // Get root timestamp
  async getRootTimestamp(merkleRoot: string): Promise<number> {
    const { contract } = getContractInstance()
    const timestamp = await contract.getRootTimestamp(merkleRoot)
    return Number(timestamp)
  },

  // Check if root exists on blockchain
  async rootExists(merkleRoot: string): Promise<boolean> {
    try {
      const timestamp = await this.getRootTimestamp(merkleRoot)
      return timestamp > 0
    } catch (error) {
      return false
    }
  },

  // Get issuer details
  async getIssuerDetails(issuerId: string) {
    const { contract } = getContractInstance()
    return await contract.getIssuerDetails(issuerId)
  },

  // Invalidate document
  async invalidateDocument(docHash: string, signature: string, issuerId: string): Promise<string> {
    const { contract } = getContractInstance(true)
    const tx = await contract.invalidateDocument(docHash, signature, issuerId)
    const receipt = await tx.wait()
    return receipt.transactionHash
  },

  // Invalidate root
  async invalidateRoot(rootHash: string, signature: string, issuerId: string): Promise<string> {
    const { contract } = getContractInstance(true)
    const tx = await contract.invalidateRoot(rootHash, signature, issuerId)
    const receipt = await tx.wait()
    return receipt.transactionHash
  }
}

// Network utilities
export const networkUtils = {
  // Get transaction URL
  getTransactionUrl(txHash: string): string {
    return `${CONTRACT_CONFIG.network.explorerUrl}/tx/${txHash}`
  },

  // Get contract URL
  getContractUrl(): string {
    return `${CONTRACT_CONFIG.network.explorerUrl}/address/${CONTRACT_CONFIG.address}`
  },

  // Format address
  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
}
