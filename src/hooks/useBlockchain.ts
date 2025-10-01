import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { walletManager, TransactionManager } from '@/lib/blockchain/wallet'
import { RealBlockchainService } from '@/lib/blockchain/contract-real'
import { CONTRACT_CONFIG } from '@/lib/blockchain/contract'

export interface BlockchainState {
  isConnected: boolean
  account: string | null
  chainId: string | null
  isCorrectNetwork: boolean
  provider: ethers.BrowserProvider | null
  signer: ethers.JsonRpcSigner | null
  loading: boolean
  error: string | null
}

export interface TransactionState {
  isPending: boolean
  txHash: string | null
  receipt: ethers.TransactionReceipt | null
  error: string | null
}

export const useBlockchain = () => {
  const [state, setState] = useState<BlockchainState>({
    isConnected: false,
    account: null,
    chainId: null,
    isCorrectNetwork: false,
    provider: null,
    signer: null,
    loading: false,
    error: null
  })

  const [transactionState, setTransactionState] = useState<TransactionState>({
    isPending: false,
    txHash: null,
    receipt: null,
    error: null
  })

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const connection = await walletManager.connect()
      const expectedChainId = `0x${CONTRACT_CONFIG.network.chainId.toString(16)}`
      
      setState({
        isConnected: true,
        account: connection.account,
        chainId: connection.chainId,
        isCorrectNetwork: connection.chainId === expectedChainId,
        provider: connection.provider,
        signer: connection.signer,
        loading: false,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }, [])

  // Switch to correct network
  const switchNetwork = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      await walletManager.switchToPolygonAmoy()
      
      // Refresh connection after network switch
      const connection = await walletManager.connect()
      const expectedChainId = `0x${CONTRACT_CONFIG.network.chainId.toString(16)}`
      
      setState(prev => ({
        ...prev,
        chainId: connection.chainId,
        isCorrectNetwork: connection.chainId === expectedChainId,
        loading: false,
        error: null
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }, [])

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    walletManager.removeAllListeners()
    setState({
      isConnected: false,
      account: null,
      chainId: null,
      isCorrectNetwork: false,
      provider: null,
      signer: null,
      loading: false,
      error: null
    })
  }, [])

  // Execute transaction
  const executeTransaction = useCallback(async (
    transactionFn: () => Promise<ethers.TransactionResponse>
  ) => {
    if (!state.signer) {
      throw new Error('Wallet not connected')
    }

    setTransactionState({
      isPending: true,
      txHash: null,
      receipt: null,
      error: null
    })

    try {
      const tx = await transactionFn()
      setTransactionState(prev => ({ ...prev, txHash: tx.hash }))

      const receipt = await tx.wait()
      setTransactionState({
        isPending: false,
        txHash: tx.hash,
        receipt,
        error: null
      })

      return { tx, receipt }
    } catch (error) {
      setTransactionState({
        isPending: false,
        txHash: null,
        receipt: null,
        error: error.message
      })
      throw error
    }
  }, [state.signer])

  // Get blockchain service
  const getBlockchainService = useCallback(() => {
    if (!state.provider) {
      throw new Error('Provider not available')
    }

    return new RealBlockchainService(state.provider, state.signer || undefined)
  }, [state.provider, state.signer])

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return walletManager.constructor.isMetaMaskInstalled()
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
    setTransactionState(prev => ({ ...prev, error: null }))
  }, [])

  // Auto-connect wallet on mount if already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            // Wallet is already connected, get the connection details
            const connection = await walletManager.connect()
            const expectedChainId = `0x${CONTRACT_CONFIG.network.chainId.toString(16)}`
            
            setState({
              isConnected: true,
              account: connection.account,
              chainId: connection.chainId,
              isCorrectNetwork: connection.chainId === expectedChainId,
              provider: connection.provider,
              signer: connection.signer,
              loading: false,
              error: null
            })
          }
        } catch (error) {
          console.log('Auto-connect failed:', error)
        }
      }
    }

    checkConnection()
  }, [])

  // Set up event listeners
  useEffect(() => {
    if (!state.isConnected) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        setState(prev => ({ ...prev, account: accounts[0] }))
      }
    }

    const handleChainChanged = (chainId: string) => {
      const expectedChainId = `0x${CONTRACT_CONFIG.network.chainId.toString(16)}`
      
      setState(prev => ({
        ...prev,
        chainId,
        isCorrectNetwork: chainId === expectedChainId
      }))
    }

    walletManager.onAccountsChanged(handleAccountsChanged)
    walletManager.onChainChanged(handleChainChanged)

    return () => {
      walletManager.removeAllListeners()
    }
  }, [state.isConnected, disconnectWallet])

  return {
    // State
    ...state,
    transactionState,
    
    // Actions
    connectWallet,
    switchNetwork,
    disconnectWallet,
    executeTransaction,
    getBlockchainService,
    isMetaMaskInstalled,
    clearError
  }
}

// Hook for specific blockchain operations
export const useBlockchainOperations = () => {
  const blockchain = useBlockchain()

  // Register issuer
  const registerIssuer = useCallback(async (
    issuerId: string,
    publicKey: string,
    name: string
  ) => {
    const service = blockchain.getBlockchainService()
    return await blockchain.executeTransaction(() =>
      service.registerIssuer(issuerId, publicKey, name)
    )
  }, [blockchain])

  // Store Merkle root
  const putRoot = useCallback(async (merkleRoot: string) => {
    const service = blockchain.getBlockchainService()
    try {
      const result = await blockchain.executeTransaction(() =>
        service.putRoot(merkleRoot)
      )
      return {
        success: true,
        txHash: result.tx.hash,
        receipt: result.receipt
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }, [blockchain])

  // Check worker status
  const checkWorkerStatus = useCallback(async (address: string) => {
    const service = blockchain.getBlockchainService()
    return await service.isWorker(address)
  }, [blockchain])

  // Get root timestamp
  const getRootTimestamp = useCallback(async (merkleRoot: string) => {
    const service = blockchain.getBlockchainService()
    return await service.getRootTimestamp(merkleRoot)
  }, [blockchain])

  // Check if root exists
  const checkRootExists = useCallback(async (merkleRoot: string) => {
    const service = blockchain.getBlockchainService()
    return await service.rootExists(merkleRoot)
  }, [blockchain])

  // Add worker (only contract owner can do this)
  const addWorker = useCallback(async (address: string) => {
    const service = blockchain.getBlockchainService()
    return await blockchain.executeTransaction(() =>
      service.addWorker(address)
    )
  }, [blockchain])

  // Get contract owner
  const getContractOwner = useCallback(async () => {
    const service = blockchain.getBlockchainService()
    return await service.getOwner()
  }, [blockchain])

  return {
    ...blockchain,
    registerIssuer,
    putRoot,
    checkWorkerStatus,
    getRootTimestamp,
    checkRootExists,
    addWorker,
    getContractOwner
  }
}
