import React, { useState } from 'react'
import { useBlockchainOperations } from '@/hooks/useBlockchain'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

interface BlockchainIntegrationProps {
  onTransactionComplete?: (txHash: string, receipt: any) => void
  onError?: (error: string) => void
}

export const BlockchainIntegration: React.FC<BlockchainIntegrationProps> = ({
  onTransactionComplete,
  onError
}) => {
  const {
    isConnected,
    account,
    isCorrectNetwork,
    connectWallet,
    switchNetwork,
    loading,
    error,
    transactionState,
    clearError
  } = useBlockchainOperations()

  const [isConnecting, setIsConnecting] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await connectWallet()
    } catch (error) {
      onError?.(error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSwitchNetwork = async () => {
    setIsSwitching(true)
    try {
      await switchNetwork()
    } catch (error) {
      onError?.(error.message)
    } finally {
      setIsSwitching(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Connect your MetaMask wallet to interact with the blockchain
          </AlertDescription>
        </Alert>
        
        <Button
          onClick={handleConnect}
          disabled={isConnecting || loading}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect MetaMask'
          )}
        </Button>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  if (!isCorrectNetwork) {
    return (
      <div className="space-y-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription>
            Please switch to Polygon Amoy testnet to continue
            <br />
            <span className="text-xs text-gray-600 mt-1 block">
              Current network: {account ? 'Connected' : 'Not connected'} | 
              Expected: Polygon Amoy (0x13882)
            </span>
          </AlertDescription>
        </Alert>
        
        <Button
          onClick={handleSwitchNetwork}
          disabled={isSwitching || loading}
          className="w-full"
        >
          {isSwitching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Switching Network...
            </>
          ) : (
            'Switch to Polygon Amoy'
          )}
        </Button>

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <span>Wallet Connected</span>
            <a
              href={`https://amoy.polygonscan.com/address/${account}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-green-600 hover:text-green-800"
            >
              <span className="font-mono text-sm mr-1">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </AlertDescription>
      </Alert>

      {transactionState.isPending && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <p>Transaction pending...</p>
              {transactionState.txHash && (
                <a
                  href={`https://amoy.polygonscan.com/tx/${transactionState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <span className="font-mono text-sm mr-1">
                    {transactionState.txHash.slice(0, 10)}...
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {transactionState.receipt && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-2">
              <p>Transaction confirmed!</p>
              <a
                href={`https://amoy.polygonscan.com/tx/${transactionState.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-green-600 hover:text-green-800"
              >
                <span className="font-mono text-sm mr-1">
                  {transactionState.txHash?.slice(0, 10)}...
                </span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {transactionState.error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Transaction failed: {transactionState.error}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
