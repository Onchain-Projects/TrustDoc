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
  {
    "inputs": [{"internalType": "address", "name": "addr", "type": "address"}],
    "name": "addWorker",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "addr", "type": "address"}],
    "name": "isWorker",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWorkers",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Issuer Management
  {
    "inputs": [
      {"internalType": "string", "name": "issuerId", "type": "string"},
      {"internalType": "address", "name": "pubKey", "type": "address"},
      {"internalType": "string", "name": "name", "type": "string"}
    ],
    "name": "registerIssuer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "issuerId", "type": "string"}],
    "name": "getIssuerDetails",
    "outputs": [
      {"internalType": "string", "name": "", "type": "string"},
      {"internalType": "string", "name": "", "type": "string"},
      {"internalType": "address[]", "name": "", "type": "address[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Merkle Root Management
  {
    "inputs": [{"internalType": "bytes32", "name": "merkleRoot", "type": "bytes32"}],
    "name": "putRoot",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "root", "type": "bytes32"}],
    "name": "getRootTimestamp",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Document Invalidation
  {
    "inputs": [
      {"internalType": "bytes32", "name": "docHash", "type": "bytes32"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"},
      {"internalType": "string", "name": "issuerId", "type": "string"}
    ],
    "name": "invalidateDocument",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "rootHash", "type": "bytes32"},
      {"internalType": "bytes", "name": "signature", "type": "bytes"},
      {"internalType": "string", "name": "issuerId", "type": "string"}
    ],
    "name": "invalidateRoot",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  // Verification
  {
    "inputs": [
      {"internalType": "bytes32", "name": "docHash", "type": "bytes32"},
      {"internalType": "bytes32", "name": "rootHash", "type": "bytes32"},
      {"internalType": "string", "name": "issuerId", "type": "string"},
      {"internalType": "uint256", "name": "invExpiry", "type": "uint256"},
      {"internalType": "uint256", "name": "issuedAt", "type": "uint256"}
    ],
    "name": "isInvalidated",
    "outputs": [
      {"internalType": "string", "name": "", "type": "string"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "string", "name": "issuerId", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "wallet", "type": "address"}
    ],
    "name": "IssuerRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "bytes32", "name": "root", "type": "bytes32"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "RootAdded",
    "type": "event"
  }
]

// Contract Instance Factory
export function getContractInstance(useOwner = false) {
  // Create provider with explicit network configuration to avoid ENS resolution
  const provider = new ethers.JsonRpcProvider(CONTRACT_CONFIG.network.rpcUrl, {
    name: 'polygon-amoy',
    chainId: CONTRACT_CONFIG.network.chainId,
    ensAddress: null // Explicitly disable ENS
  })
  
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
