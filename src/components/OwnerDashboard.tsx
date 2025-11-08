import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, FileX, AlertTriangle, Settings, 
  Plus, Eye, Download, Trash2, LogOut, Wallet, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AddWorker } from './AddWorker';
import { InvalidateDoc } from './InvalidateDoc';
import { InvalidateRoot } from './InvalidateRoot';
import { useBlockchain } from '@/hooks/useBlockchain';
import { ethers } from 'ethers';
import { CONTRACT_CONFIG } from '@/lib/blockchain/contract';

interface OwnerDashboardProps {
  wallet?: string;
  network?: string;
  issuerId?: string;
  onLogout?: () => void;
}

export const OwnerDashboard = ({ wallet: propWallet, network: propNetwork, issuerId, onLogout }: OwnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [localWallet, setLocalWallet] = useState<string | null>(propWallet || null);
  const [localNetwork, setLocalNetwork] = useState<string | null>(propNetwork || null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Use blockchain hook for wallet management
  const { 
    isConnected, 
    account, 
    isCorrectNetwork, 
    connectWallet: hookConnectWallet, 
    switchNetwork: hookSwitchNetwork,
    loading: blockchainLoading 
  } = useBlockchain();

  // Sync local state with blockchain hook state
  useEffect(() => {
    if (isConnected && account) {
      setLocalWallet(account);
      setLocalNetwork('amoy');
      setConnectionError(null);
    }
  }, [isConnected, account]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setConnectionError('Please install MetaMask to connect your wallet');
      alert('Please install MetaMask to connect your wallet');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // First, connect wallet using the hook
      await hookConnectWallet();
      
      // Get the connected account
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      });
      
      if (accounts.length === 0) {
        // Request accounts if not already connected
        const requestedAccounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (requestedAccounts.length === 0) {
          throw new Error('No accounts found. Please unlock MetaMask.');
        }
      }
      
      // Get the current account
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const connectedAddress = await signer.getAddress();
      
      // Check if connected wallet is the contract owner
      const expectedOwnerAddress = '0x85D7c8df42f4253D8d9e0596cCA500e60f13dce8';
      
      if (connectedAddress.toLowerCase() !== expectedOwnerAddress.toLowerCase()) {
        const errorMsg = `❌ Access Denied!\n\nOnly the contract owner can connect to this dashboard.\n\nExpected Owner: ${expectedOwnerAddress}\nConnected Wallet: ${connectedAddress}\n\nPlease select the correct owner account in MetaMask.`;
        setConnectionError(errorMsg);
        alert(errorMsg);

        // Prompt MetaMask to allow selecting a different account
        try {
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          });
          
          // Re-request accounts after permission change
          const reAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (reAccounts && reAccounts.length > 0) {
            const newAddress = reAccounts[0];
            if (newAddress.toLowerCase() !== expectedOwnerAddress.toLowerCase()) {
              setConnectionError('Still not the owner account. Please switch to the owner wallet in MetaMask and try again.');
              return;
            }
            // If it matches now, update state
            setLocalWallet(newAddress);
          }
        } catch (permErr: any) {
          // User may have cancelled
          if (permErr.code !== 4001) { // 4001 = user rejected
            console.error('Permission error:', permErr);
          }
          return;
        }
      } else {
        // Wallet is correct, update state
        setLocalWallet(connectedAddress);
        setConnectionError(null);
      }
      
      // Switch to Polygon Amoy if not already connected
      if (!isCorrectNetwork) {
        try {
          await hookSwitchNetwork();
        } catch (switchError: any) {
          // If chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x13882',
                chainName: 'Polygon Amoy Testnet',
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://amoy.polygonscan.com'],
              }],
            });
            // Try switching again after adding
            await hookSwitchNetwork();
          } else {
            console.error('Network switch error:', switchError);
            setConnectionError('Failed to switch to Polygon Amoy network. Please switch manually in MetaMask.');
          }
        }
      }
      
      // Update network state
      setLocalNetwork('amoy');
      
      console.log('✅ Wallet connected successfully:', connectedAddress);
      
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      const errorMessage = error.message || 'Failed to connect wallet. Please try again.';
      setConnectionError(errorMessage);
      
      // Show user-friendly error
      if (error.code === 4001) {
        alert('Connection cancelled. Please approve the connection in MetaMask.');
      } else {
        alert(`Failed to connect wallet: ${errorMessage}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Use local wallet state if available, otherwise use prop
  const wallet = localWallet || propWallet;
  const network = localNetwork || propNetwork;

  return (
    <main className="flex-grow">
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Owner Dashboard
              </h2>
              <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Shield className="w-4 h-4 mr-1 text-blue-600" />
                  <span className="font-medium text-gray-800 mr-1">Role:</span>
                  <Badge className="bg-blue-100 text-blue-800">Contract Owner</Badge>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span className="font-medium text-gray-800 mr-1">Wallet:</span>
                  <span className="font-mono text-xs">{wallet || "Not connected"}</span>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span className="font-medium text-gray-800 mr-1">Network:</span>
                  <span className="capitalize">{network || 'amoy'}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              {!wallet ? (
                <Button 
                  onClick={connectWallet} 
                  disabled={isConnecting || blockchainLoading} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isConnecting || blockchainLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
                  </Badge>
                </div>
              )}
              <Button onClick={onLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Owner Actions Tabs */}
          <div className="mt-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger value="workers" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Workers</span>
                </TabsTrigger>
                <TabsTrigger value="invalidate" className="flex items-center space-x-2">
                  <FileX className="w-4 h-4" />
                  <span>Invalidate</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Contract Status Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span>Contract Status</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Network:</span>
                          <span className="text-sm font-medium capitalize">{network || 'amoy'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Owner:</span>
                          <span className="text-xs font-mono">{wallet?.slice(0, 10)}...</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2">
                        <Plus className="w-5 h-5 text-green-600" />
                        <span>Quick Actions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button 
                          onClick={() => setActiveTab('workers')}
                          className="w-full justify-start"
                          variant="outline"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Manage Workers
                        </Button>
                        <Button 
                          onClick={() => setActiveTab('invalidate')}
                          className="w-full justify-start"
                          variant="outline"
                        >
                          <FileX className="w-4 h-4 mr-2" />
                          Invalidate Documents
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Info Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-gray-600" />
                        <span>System Info</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Version:</span>
                          <span className="text-sm font-medium">v1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Updated:</span>
                          <span className="text-sm font-medium">Today</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Issuer ID:</span>
                          <span className="text-sm font-medium">{issuerId || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Wallet Connection Notice */}
                {!wallet && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <Wallet className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      <strong>Owner Wallet Required:</strong> Only the contract owner can connect to this dashboard. You must connect with the owner wallet to perform administrative actions.
                      <br />
                      <br />
                      <strong>Expected Owner Address:</strong>
                      <br />
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        0x85D7c8df42f4253D8d9e0596cCA500e60f13dce8
                      </code>
                      {connectionError && (
                        <>
                          <br />
                          <br />
                          <strong className="text-red-600">Error:</strong>
                          <p className="text-sm text-red-700 mt-1">{connectionError}</p>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Owner Notice */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Owner Privileges:</strong> As the contract owner, you have full administrative access to manage workers, invalidate documents, and control contract settings. Use these powers responsibly.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* Workers Tab */}
              <TabsContent value="workers" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Worker Management</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Add and manage workers who can upload documents on behalf of issuers.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AddWorker wallet={wallet} network={network} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Invalidate Tab */}
              <TabsContent value="invalidate" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileX className="w-5 h-5 text-red-600" />
                        <span>Invalidate Document</span>
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Invalidate a specific document by its hash.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <InvalidateDoc wallet={wallet} network={network} issuerId={issuerId} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <span>Invalidate Batch</span>
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Invalidate an entire batch by its Merkle root.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <InvalidateRoot wallet={wallet} network={network} issuerId={issuerId} />
                    </CardContent>
                  </Card>
                </div>

                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Warning:</strong> Invalidating documents or batches is irreversible and will permanently mark them as invalid on the blockchain. Use with extreme caution.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-gray-600" />
                      <span>Contract Settings</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Manage contract configuration and owner settings.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Contract Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contract Address:</span>
                            <span className="font-mono text-xs">{wallet ? '0x1253369dab29F77692bF84DB759583ac47F66532' : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span className="capitalize">{network || 'amoy'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Owner:</span>
                            <span className="font-mono text-xs">{wallet || 'Not connected'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>Coming Soon:</strong> Advanced contract settings and configuration options will be available in future updates.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </main>
  );
};
