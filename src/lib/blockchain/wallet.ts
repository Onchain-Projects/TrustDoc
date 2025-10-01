import { ethers } from 'ethers'

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: '0x13882', // 80002 in hex
  chainName: 'Polygon Amoy',
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorerUrls: ['https://amoy.polygonscan.com'],
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
}


// Wallet Connection Utilities
export class WalletManager {
  private provider: ethers.BrowserProvider | null = null
  private signer: ethers.JsonRpcSigner | null = null
  private account: string | null = null

  // Check if MetaMask is installed
  static isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // Connect to MetaMask
  async connect(): Promise<{
    account: string
    chainId: string
    provider: ethers.BrowserProvider
    signer: ethers.JsonRpcSigner
  }> {
    if (!WalletManager.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.')
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.')
      }

      this.account = accounts[0]
      this.provider = new ethers.BrowserProvider(window.ethereum)
      this.signer = await this.provider.getSigner()

      // Get current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })

      return {
        account: this.account,
        chainId,
        provider: this.provider,
        signer: this.signer,
      }
    } catch (error) {
      console.error('Wallet connection error:', error)
      throw new Error(`Failed to connect wallet: ${error.message}`)
    }
  }

  // Switch to Polygon Amoy network
  async switchToPolygonAmoy(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      })
    } catch (switchError) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          })
        } catch (addError) {
          throw new Error(`Failed to add Polygon Amoy network: ${addError.message}`)
        }
      } else {
        throw new Error(`Failed to switch to Polygon Amoy network: ${switchError.message}`)
      }
    }
  }

  // Get current account
  getAccount(): string | null {
    return this.account
  }

  // Get current provider
  getProvider(): ethers.BrowserProvider | null {
    return this.provider
  }

  // Get current signer
  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer
  }

  // Check if connected to correct network
  async isCorrectNetwork(): Promise<boolean> {
    if (!window.ethereum) return false
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      return chainId === NETWORK_CONFIG.chainId
    } catch (error) {
      return false
    }
  }

  // Listen for account changes
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback)
    }
  }

  // Listen for chain changes
  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback)
    }
  }

  // Remove event listeners
  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged')
      window.ethereum.removeAllListeners('chainChanged')
    }
  }
}

// Transaction Utilities
export class TransactionManager {
  private provider: ethers.BrowserProvider
  private signer: ethers.JsonRpcSigner

  constructor(provider: ethers.BrowserProvider, signer: ethers.JsonRpcSigner) {
    this.provider = provider
    this.signer = signer
  }

  // Estimate gas for a transaction
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    try {
      return await this.provider.estimateGas(transaction)
    } catch (error) {
      console.error('Gas estimation error:', error)
      throw new Error(`Gas estimation failed: ${error.message}`)
    }
  }

  // Send transaction with retry logic
  async sendTransaction(
    transaction: ethers.TransactionRequest,
    retries: number = 3
  ): Promise<ethers.TransactionResponse> {
    let lastError: Error | null = null

    for (let i = 0; i < retries; i++) {
      try {
        // Estimate gas
        const gasLimit = await this.estimateGas(transaction)
        
        // Set gas parameters
        const txWithGas = {
          ...transaction,
          gasLimit: gasLimit + (gasLimit / 10n), // Add 10% buffer
        }

        // Send transaction
        const tx = await this.signer.sendTransaction(txWithGas)
        return tx
      } catch (error) {
        lastError = error
        console.error(`Transaction attempt ${i + 1} failed:`, error)
        
        if (i < retries - 1) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        }
      }
    }

    throw new Error(`Transaction failed after ${retries} attempts: ${lastError?.message}`)
  }

  // Wait for transaction confirmation
  async waitForTransaction(
    tx: ethers.TransactionResponse,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt> {
    try {
      return await tx.wait(confirmations)
    } catch (error) {
      console.error('Transaction confirmation error:', error)
      throw new Error(`Transaction confirmation failed: ${error.message}`)
    }
  }

  // Get transaction status
  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed'
    receipt?: ethers.TransactionReceipt
    error?: string
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash)
      
      if (!receipt) {
        return { status: 'pending' }
      }

      if (receipt.status === 1) {
        return { status: 'confirmed', receipt }
      } else {
        return { status: 'failed', receipt }
      }
    } catch (error) {
      return { status: 'failed', error: error.message }
    }
  }
}

// Global wallet instance
export const walletManager = new WalletManager()

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (...args: any[]) => void) => void
      removeAllListeners: (event: string) => void
    }
  }
}
