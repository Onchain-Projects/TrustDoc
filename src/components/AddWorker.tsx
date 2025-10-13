import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, Plus, CheckCircle, AlertTriangle, 
  Copy, ExternalLink, Trash2 
} from "lucide-react";
import { getContractInstance } from "@/lib/blockchain/contract";

const CONTRACT_ADDRESSES = {
  amoy: '0x1253369dab29F77692bF84DB759583ac47F66532',
  mainnet: '0x0000000000000000000000000000000000000000'
};

interface AddWorkerProps {
  wallet?: string;
  network?: string;
}

export const AddWorker = ({ wallet, network }: AddWorkerProps) => {
  const net = network || 'amoy';
  const contractAddress = CONTRACT_ADDRESSES[net];
  console.log('🔍 AddWorker Debug:');
  console.log('  - network prop:', network);
  console.log('  - net variable:', net);
  console.log('  - contractAddress:', contractAddress);
  console.log('  - wallet:', wallet);
  const [workerAddress, setWorkerAddress] = useState("");
  const [status, setStatus] = useState("");
  const [currentWorkers, setCurrentWorkers] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Load current workers on component mount
  useEffect(() => {
    if (!contractAddress) return;
    loadCurrentWorkers();
  }, [contractAddress]);

  const loadCurrentWorkers = async () => {
    try {
      if (!contractAddress) {
        setStatus("❌ Contract address is not set.");
        return;
      }
      
      // Use direct RPC provider instead of BrowserProvider for development
      const rpcUrl = 'https://rpc-amoy.polygon.technology';
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const { TRUSTDOC_ABI } = await import('@/lib/blockchain/contract');
      const ABI = { abi: TRUSTDOC_ABI };
      const contract = new ethers.Contract(contractAddress, ABI.abi, provider);
      const workers = await contract.getWorkers();
      console.log("Current workers:", workers);
      setCurrentWorkers(workers);
    } catch (error) {
      console.error("Error loading workers:", error);
      setStatus("❌ Error loading workers: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const checkIfWorker = async (address: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const { TRUSTDOC_ABI } = await import('@/lib/blockchain/contract');
      const ABI = { abi: TRUSTDOC_ABI };
      const contract = new ethers.Contract(contractAddress, ABI.abi, provider);
      const isWorker = await contract.isWorker(address);
      console.log(`Checking if ${address} is worker:`, isWorker);
      return isWorker;
    } catch (error) {
      console.error("Error checking worker status:", error);
      return false;
    }
  };

  const handleAddWorker = async () => {
    console.log('🔍 AddWorker Debug:');
    console.log('  - wallet:', wallet);
    console.log('  - workerAddress:', workerAddress);
    console.log('  - contractAddress:', contractAddress);
    
    if (!wallet) {
      setStatus("❌ Wallet connection required to add workers");
      return;
    }
    if (!workerAddress) {
      setStatus("❌ Please enter worker address");
      return;
    }
    if (!CONTRACT_ADDRESSES) return alert("Invalid contract address");
    
    // Validate address format
    if (!ethers.isAddress(workerAddress)) {
      setStatus("❌ Invalid address format");
      return;
    }
    
    setIsChecking(true);
    setStatus("⏳ Checking if address is already a worker...");
    
    try {
      // Check if already a worker
      const alreadyWorker = await checkIfWorker(workerAddress);
      if (alreadyWorker) {
        setStatus("❌ Address is already a worker");
        setIsChecking(false);
        return;
      }
      
      setStatus("⏳ Waiting for confirmation...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const { TRUSTDOC_ABI } = await import('@/lib/blockchain/contract');
      const ABI = { abi: TRUSTDOC_ABI };
      const contract = new ethers.Contract(contractAddress, ABI.abi, signer);
      
      const tx = await contract.addWorker(workerAddress);
      await tx.wait();
      setStatus("✅ Worker added successfully!");
      setWorkerAddress(""); // Clear input after success
      loadCurrentWorkers(); // Refresh workers list
    } catch (error) {
      console.error("addWorker error:", error);
      setStatus(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Worker Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <span>Add New Worker</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add a wallet address as a worker. Workers can upload documents on behalf of issuers.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker-address">Worker Wallet Address</Label>
            <div className="flex space-x-2">
              <Input
                id="worker-address"
                type="text"
                value={workerAddress}
                onChange={(e) => setWorkerAddress(e.target.value)}
                placeholder="0x..."
                disabled={isChecking}
                className="font-mono"
              />
              <Button
                onClick={handleAddWorker}
                disabled={!wallet || isChecking || !workerAddress.trim()}
                className="px-6"
                title={!wallet ? "Wallet connection required to add workers" : !workerAddress.trim() ? "Enter worker address" : ""}
              >
                {isChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Worker
                  </>
                )}
              </Button>
            </div>
          </div>

          {!wallet && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Wallet Required:</strong> To add workers, you need to connect your wallet. Adding workers requires blockchain transactions that must be signed.
              </AlertDescription>
            </Alert>
          )}

          {status && (
            <Alert className={status.includes("✅") ? "bg-green-50 border-green-200" : status.includes("❌") ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}>
              <AlertDescription className={status.includes("✅") ? "text-green-800" : status.includes("❌") ? "text-red-800" : "text-blue-800"}>
                {status}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current Workers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-green-600" />
            <span>Current Workers</span>
            <Badge variant="secondary" className="ml-2">
              {currentWorkers.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Workers who can upload documents on behalf of issuers.
          </p>
        </CardHeader>
        <CardContent>
          {currentWorkers.length > 0 ? (
            <div className="space-y-3">
              {currentWorkers.map((worker, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900">
                        {worker}
                      </p>
                      <p className="text-xs text-gray-500">
                        Worker #{index + 1}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(worker)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://amoy.polygonscan.com/address/${worker}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No workers added yet</p>
              <p className="text-sm text-gray-400">Add your first worker above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-gray-600" />
            <span>Contract Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contract Address</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-mono text-gray-900 break-all">
                  {contractAddress}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Network</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Badge className="bg-blue-100 text-blue-800 capitalize">
                  {network}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Connected Wallet</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-900">
                  {wallet ? (
                    <span className="font-mono">{wallet}</span>
                  ) : (
                    <span className="text-gray-500">Not connected</span>
                  )}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workers Count</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="text-lg font-semibold">
                  {currentWorkers.length}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
