import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileX, AlertTriangle } from 'lucide-react';

const CONTRACT_ADDRESSES = {
  amoy: '0x1253369dab29F77692bF84DB759583ac47F66532',
  mainnet: '0x0000000000000000000000000000000000000000'
};

interface InvalidateDocProps {
  wallet?: string;
  network?: string;
  issuerId?: string;
}

export const InvalidateDoc = ({ wallet, network, issuerId: propIssuerId }: InvalidateDocProps) => {
  const [docHash, setDocHash] = useState('');
  const [msg, setMsg] = useState('');
  const [issuerId, setIssuerId] = useState(propIssuerId || '');

  // Use the network prop to select the correct address, default to 'amoy'
  const net = network || 'amoy';
  const contractAddress = CONTRACT_ADDRESSES[net];

  const handleInvalidate = async () => {
    if (!wallet) return alert("Connect wallet first");
    if (!issuerId) return alert("Enter issuer ID");
    if (!docHash) return alert("Enter document hash");
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
      const tx = await contract.invalidateDocument('0x'+docHash, signature, issuerId);
      setMsg('Waiting for confirmation...');
      await tx.wait();
      setMsg('Document invalidated on-chain!');
    } catch (err) {
      setMsg((err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileX className="w-5 h-5 text-red-600" />
          <span>Invalidate Document</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Invalidate a specific document by its hash. This action is irreversible.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="doc-hash">Document Hash</Label>
          <Input
            id="doc-hash"
            type="text"
            value={docHash}
            onChange={(e) => setDocHash(e.target.value)}
            placeholder="Enter SHA256 hash (without 0x prefix)"
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
          disabled={!wallet || !docHash.trim() || !issuerId.trim()}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          <FileX className="w-4 h-4 mr-2" />
          Invalidate Document
        </Button>

        {msg && (
          <Alert className={msg.includes("invalidated") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
            <AlertDescription className={msg.includes("invalidated") ? "text-green-800" : "text-red-800"}>
              {msg}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Warning:</strong> This action will permanently mark the document as invalid on the blockchain and cannot be undone.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
