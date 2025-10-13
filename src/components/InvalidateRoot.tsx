import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, FolderX } from 'lucide-react';

const CONTRACT_ADDRESSES = {
  amoy: '0x1253369dab29F77692bF84DB759583ac47F66532',
  mainnet: '0x0000000000000000000000000000000000000000'
};

interface InvalidateRootProps {
  wallet?: string;
  network?: string;
  issuerId?: string;
}

export const InvalidateRoot = ({ wallet, network, issuerId: propIssuerId }: InvalidateRootProps) => {
  const net = network || 'amoy';
  const contractAddress = CONTRACT_ADDRESSES[net];
  const [root, setRoot] = useState('');
  const [msg, setMsg] = useState('');
  const [issuerId, setIssuerId] = useState(propIssuerId || '');

  const handleInvalidate = async () => {
    if (!wallet) return alert("Connect wallet first");
    if (!issuerId) return alert("Enter issuer ID");
    if (!root) return alert("Enter Merkle root");
    if (!contractAddress) return alert("Invalid contract address");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      if (!contractAddress) {
        setMsg('Contract address is not set.');
        return;
      }
      const { TRUSTDOC_ABI } = await import('@/lib/blockchain/contract');
      const ABI = { abi: TRUSTDOC_ABI };
      const contract = new ethers.Contract(contractAddress, ABI.abi, signer);
      const signature = '0x'; // Replace with real signature if needed
      const tx = await contract.invalidateRoot('0x'+root, signature, issuerId);
      setMsg('Waiting for confirmation...');
      await tx.wait();
      setMsg('Batch (root) invalidated on-chain!');
    } catch (err) {
      setMsg((err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FolderX className="w-5 h-5 text-orange-600" />
          <span>Invalidate Batch</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Invalidate an entire batch by its Merkle root. This will invalidate all documents in the batch.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="merkle-root">Merkle Root</Label>
          <Input
            id="merkle-root"
            type="text"
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            placeholder="Enter Merkle root (without 0x prefix)"
            className="font-mono"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="issuer-id">Issuer ID</Label>
          <Input
            id="issuer-id"
            type="text"
            value={issuerId}
            onChange={(e) => setIssuerId(e.target.value)}
            placeholder="Enter issuer ID"
          />
        </div>

        <Button
          onClick={handleInvalidate}
          disabled={!wallet || !root.trim() || !issuerId.trim()}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <FolderX className="w-4 h-4 mr-2" />
          Invalidate Batch
        </Button>

        {msg && (
          <Alert className={msg.includes("invalidated") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertDescription className={msg.includes("invalidated") ? "text-green-800" : "text-red-800"}>
              {msg}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Critical Warning:</strong> This action will permanently invalidate ALL documents in this batch on the blockchain. This cannot be undone and will affect all documents anchored with this Merkle root.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
