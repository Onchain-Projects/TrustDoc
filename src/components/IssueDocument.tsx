import { useState } from "react";
import { FileText, Trash2, Upload, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { appendProofBlock, canonicalProofString, type ProofPayload } from "@/lib/pdf-proof";
import { appendProofToDocx, prepareDocxForHashing, canonicalizeDocxForHash } from "@/lib/docx-proof";
import { embedBadgeInPdf, embedBadgeInDocx } from "@/lib/document-qr";
type PreparedFile = {
  file: File
  bytes: Uint8Array
  hashBytes: Uint8Array
  kind: 'docx' | 'other'
}

import JSZip from "jszip";
import { getContractInstance } from "@/lib/blockchain/contract";
import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";
import { sha256 } from "js-sha256";
import { useNavigate } from "react-router-dom";

interface IssueDocumentProps {
  onUploadComplete?: () => void;
}

export const IssueDocument = ({ onUploadComplete }: IssueDocumentProps) => {
  // Get authenticated user and profile from Supabase Auth
  const { user, profile, userType } = useAuthContext();
  const navigate = useNavigate();
  
  // Get issuerId from Supabase Auth profile
  const issuerId = profile?.issuerId || null;
  const isLoggedIn = !!(user && profile && issuerId);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batch, setBatch] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"single" | "batch">("single");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);

  const debugDecoder = new TextDecoder();

  const sanitizeForFileName = (value: string) =>
    value
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateProofId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${issuerId}-${Date.now()}`;

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  const generateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    // Use keccak256 like the working TrustDoc - convert to hex string
    return ethers.keccak256('0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(''));
  };

  const handleUpload = async () => {
    // Debug logging
    console.log('🔍 Upload Debug:', {
      issuerId: issuerId,
      userType: userType,
      isLoggedIn: isLoggedIn,
      uploadMode,
      batch,
      selectedFiles: selectedFiles.length,
      batchName: uploadMode === "single" 
        ? (selectedFiles.length > 0 ? `${selectedFiles[0]?.name?.replace(/\.[^/.]+$/, "")}_${Date.now()}` : `document_${Date.now()}`)
        : `${batch}_${Date.now()}`
    });

    // For single mode, use document name as batch name with timestamp to ensure uniqueness
    const batchName = uploadMode === "single" 
      ? (documentName.trim() ? `${documentName.trim()}_${Date.now()}` : `document_${Date.now()}`)
      : `${batch}_${Date.now()}`;
    
    if (!issuerId) {
      alert('Please login first. Issuer ID not found.');
      return;
    }
    
    if (selectedFiles.length === 0) {
      alert('Please select files to upload.');
      return;
    }
    
    if (uploadMode === "single" && !documentName.trim()) {
      alert('Please provide a document name.');
      return;
    }
    
    if (uploadMode === "batch" && !batch.trim()) {
      alert('Please provide a batch name.');
      return;
    }
    
    if (uploadMode === "batch" && selectedFiles.length < 2) {
      alert('Batch upload requires at least 2 documents. Please select more files or switch to single document mode.');
      return;
    }

    // Check contract address (like working TrustDoc)
    const CONTRACT_ADDRESSES = {
      amoy: '0x1253369dab29F77692bF84DB759583ac47F66532',
      mainnet: '0x0000000000000000000000000000000000000000'
    };
    const network = 'amoy'; // Default network like working TrustDoc
    const contractAddress = CONTRACT_ADDRESSES[network];
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      alert('Contract address is not set for the selected network.');
      return;
    }

    setIsLoading(true);
    setUploadStatus("Uploading files...");

    try {
      // 1. Upload files to backend to get Merkle root (simulate backend processing)
      const form = new FormData();
      form.append('issuerId', issuerId);
      form.append('batch', batchName);
      
      // Add description and expiry date if provided (like working TrustDoc)
      const descriptionEl = document.getElementById('documentDescription') as HTMLTextAreaElement;
      const expiryDateEl = document.getElementById('expiryDate') as HTMLInputElement;
      
      if (descriptionEl && descriptionEl.value.trim()) {
        form.append('description', descriptionEl.value.trim());
      }
      if (expiryDateEl && expiryDateEl.value) {
        form.append('expiryDate', expiryDateEl.value);
      }
      
      selectedFiles.forEach(file => form.append('files', file));
      
      // 1. Simulate backend processing (generate Merkle root without Buffer issues)
      setUploadStatus("Processing files...");
      
      // Read files into memory once
      const preparedFiles: PreparedFile[] = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const arrayBuffer = await file.arrayBuffer()
          const rawBytes = new Uint8Array(arrayBuffer)
          const isDocx = file.name.toLowerCase().endsWith('.docx')
          console.log('🧱 Preparing file for hashing:', {
            name: file.name,
            size: file.size,
            index,
            isDocx
          })

          const badgeOptions = {
            verificationUrl: 'https://trust-doc.vercel.app/verify',
            title: 'Verify this document with TrustDoc',
            captionLines: [
              'Blockchain-authenticated credential.',
              'Scan to open trust-doc.vercel.app/verify,',
              'then upload this file to confirm it matches the immutable record.'
            ],
            qrSizeInches: 1.1
          }

          let bytesWithBadge = rawBytes
          try {
            bytesWithBadge = isDocx
              ? await embedBadgeInDocx(rawBytes, badgeOptions)
              : await embedBadgeInPdf(rawBytes, badgeOptions)
          } catch (badgeError) {
            console.error('⚠️ Failed to embed verification badge:', {
              name: file.name,
              error: badgeError
            })
            bytesWithBadge = rawBytes
          }

          if (isDocx) {
            const normalizedDocx = await prepareDocxForHashing(bytesWithBadge)
            const hashBytes = await canonicalizeDocxForHash(normalizedDocx)
            console.log('🧱 Prepared DOCX bytes length:', {
              name: file.name,
              preparedLength: normalizedDocx.length,
              hashSourceLength: hashBytes.length
            })
            return {
              file,
              bytes: normalizedDocx,
              hashBytes,
              kind: 'docx'
            }
          }

          console.log('🧱 Prepared non-DOCX bytes length:', {
            name: file.name,
            preparedLength: bytesWithBadge.length
          })

          return {
            file,
            bytes: bytesWithBadge,
            hashBytes: bytesWithBadge,
            kind: 'other'
          }
        })
      );

      // Generate file hashes for Merkle tree from original bytes
      const fileHashes = preparedFiles.map(({ hashBytes: data }) => {
        const hexString = '0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
        return ethers.keccak256(hexString);
      });

      console.log('🔍 File hashes generated:', fileHashes);
      preparedFiles.forEach(({ file, bytes, hashBytes }, idx) => {
        console.log('🔍 File hash detail:', {
          index: idx,
          name: file.name,
          byteLength: bytes.length,
          hashSourceLength: hashBytes.length,
          hash: fileHashes[idx]
        })
      })

      // Create Merkle root using EXACT method from real working TrustDoc
      // Real working TrustDoc uses merkletreejs + sha256 + sortPairs: true
      // Always use a Merkle tree, even for single-document batches
      
      // Convert hex hashes to Buffer for MerkleTree (with polyfill)
      const leafBuffers = fileHashes.map(hash => {
        return Buffer.from(hash.slice(2), 'hex');
      });
      
      // Create Merkle tree using merkletreejs + sha256 + sortPairs: true
      const sha256Hash = (data: Buffer | string): Buffer => {
        const dataBuffer = typeof data === 'string' ? Buffer.from(data.slice(2), 'hex') : data;
        const hashHex = sha256(dataBuffer);
        return Buffer.from(hashHex, 'hex');
      };
      
      const tree = new MerkleTree(leafBuffers, sha256Hash, { sortPairs: true });
      const merkleRoot = '0x' + tree.getRoot().toString('hex');
      
      console.log('🔍 Merkle root generated:', merkleRoot);

      // 2. Get contract instance (like working TrustDoc - MetaMask will pop up automatically)
      const provider = new ethers.BrowserProvider(window.ethereum);
      let signer;
      try {
        signer = await provider.getSigner();
      } catch (signerError) {
        // Handle MetaMask connection errors with user-friendly messages
        if (signerError.message && signerError.message.includes('already pending')) {
          throw new Error('MetaMask has a pending connection request. Please check your MetaMask extension and approve or reject the pending request, then try again.');
        } else if (signerError.message && signerError.message.includes('User rejected')) {
          throw new Error('Connection cancelled: You rejected the MetaMask connection request. Please try again and approve the connection to proceed.');
        } else if (signerError.message && signerError.message.includes('not found')) {
          throw new Error('MetaMask not found: Please install MetaMask extension and refresh the page.');
        }
        throw signerError;
      }
      const { TRUSTDOC_ABI } = await import('@/lib/blockchain/contract');
      const ABI = { abi: TRUSTDOC_ABI }; // Match working TrustDoc's ABI structure
      let contract = new ethers.Contract(contractAddress, ABI.abi, signer);
      
      // Debug info
      console.log('Network:', network);
      console.log('Contract address:', contractAddress);
      console.log('Signer address:', await signer.getAddress());
      console.log('Merkle root:', merkleRoot);
      
      // Check if we're on the correct network
      const networkDetails = await provider.getNetwork();
      console.log('Current network:', networkDetails);
      
      // Switch to Polygon Amoy if not already connected
      let exists;
      if (networkDetails.chainId !== 80002n) {
        console.log('Switching to Polygon Amoy...');
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x13882' }], // 80002 in hex
        });
        console.log('Network switched to Polygon Amoy');
        
        // Recreate provider and contract after network switch
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const newSigner = await newProvider.getSigner();
        const newContract = new ethers.Contract(contractAddress, ABI.abi, newSigner);
        
      // 3. Check if Merkle root already exists on-chain (like working TrustDoc)
      setUploadStatus("Checking if document already exists...");
      console.log('🔍 About to check Merkle root existence:', merkleRoot);
      try {
        exists = await newContract.getRootTimestamp(merkleRoot);
        console.log('🔍 Merkle root exists check result:', exists);
        console.log('🔍 Exists toString:', exists.toString());
        console.log('🔍 Is zero?', exists.toString() === '0');
      } catch (checkErr) {
        console.error('🔍 Error checking Merkle root:', checkErr);
        throw new Error('Error checking Merkle root on-chain: ' + (checkErr?.message || checkErr));
      }

      // Preflight: ensure signer is authorized worker on this contract
      try {
        const currentAddr = await newSigner.getAddress();
        const isWorker = await newContract.isWorker(currentAddr);
        if (!isWorker) {
          throw new Error('Wallet permission error: Your wallet is not authorized (not a worker) on this contract.');
        }
      } catch (authErr) {
        console.error('🔍 Authorization check failed:', authErr);
        throw authErr;
      }

      // Preflight: static call to catch reverts before sending tx
      try {
        if (newContract.putRoot && newContract.putRoot.staticCall) {
          await newContract.putRoot.staticCall(merkleRoot);
        } else {
          // Fallback to gas estimation as preflight
          await newContract.putRoot.estimateGas(merkleRoot);
        }
      } catch (staticErr) {
        console.error('🔍 Preflight revert detected:', staticErr);
        throw new Error('Transaction would revert: ' + (staticErr?.shortMessage || staticErr?.message || staticErr));
      }

      // Update contract reference for later use
      contract = newContract;
      } else {
        // 3. Check if Merkle root already exists on-chain (like working TrustDoc)
        setUploadStatus("Checking if document already exists...");
        console.log('🔍 About to check Merkle root existence:', merkleRoot);
        try {
          exists = await contract.getRootTimestamp(merkleRoot);
          console.log('🔍 Merkle root exists check result:', exists);
          console.log('🔍 Exists toString:', exists.toString());
          console.log('🔍 Is zero?', exists.toString() === '0');
        } catch (checkErr) {
          console.error('🔍 Error checking Merkle root:', checkErr);
          throw new Error('Error checking Merkle root on-chain: ' + (checkErr?.message || checkErr));
        }

        // Preflight: ensure signer is authorized worker on this contract
        try {
          const currentAddr = await signer.getAddress();
          const isWorker = await contract.isWorker(currentAddr);
          if (!isWorker) {
            throw new Error('Wallet permission error: Your wallet is not authorized (not a worker) on this contract.');
          }
        } catch (authErr) {
          console.error('🔍 Authorization check failed:', authErr);
          throw authErr;
        }

        // Preflight: static call to catch reverts before sending tx
        try {
          if (contract.putRoot && contract.putRoot.staticCall) {
            await contract.putRoot.staticCall(merkleRoot);
          } else {
            // Fallback to gas estimation as preflight
            await contract.putRoot.estimateGas(merkleRoot);
          }
        } catch (staticErr) {
          console.error('🔍 Preflight revert detected:', staticErr);
          throw new Error('Transaction would revert: ' + (staticErr?.shortMessage || staticErr?.message || staticErr));
        }
      }
      
      if (exists && exists.toString() !== '0') {
        console.log('🔍 Merkle root already exists, throwing error');
        throw new Error('This document batch (Merkle root) is already registered on-chain.');
      }
      
      console.log('🔍 Merkle root does not exist, proceeding with upload');

      // 4. Store Merkle root on-chain
      setUploadStatus("Storing on blockchain...");
      
      let tx;
      try {
        // Estimate gas first
        const gasEstimate = await contract.putRoot.estimateGas(merkleRoot);
        console.log('Gas estimate:', gasEstimate.toString());
        
        // Add 20% buffer to gas estimate
        const gasWithBuffer = gasEstimate * 120n / 100n;
        
        tx = await contract.putRoot(merkleRoot, {
          gasLimit: gasWithBuffer
        });
        
        console.log('Transaction sent:', tx.hash);
        setUploadStatus(`Transaction sent: ${tx.hash}. Waiting for confirmation...`);
        
        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);
        
      } catch (txError) {
        console.error('Transaction error:', txError);
        
        // Check for specific error types and provide user-friendly messages
        if (txError.message && txError.message.includes('Root already exists')) {
          throw new Error('This document batch has already been uploaded to the blockchain. Please use different files or batch name.');
        } else if (txError.message && txError.message.includes('Only worker can call this')) {
          throw new Error('Wallet permission error: Your wallet is not authorized to perform this transaction.');
        } else if (txError.code === 'UNKNOWN_ERROR' && txError.message && txError.message.includes('Internal JSON-RPC error')) {
          throw new Error('Blockchain network error: The transaction may have failed due to network issues or duplicate data. Please try again with different files.');
        } else if (txError.code === 'ACTION_REJECTED' || 
                   (txError.message && txError.message.includes('User denied')) ||
                   (txError.message && txError.message.includes('user rejected'))) {
          throw new Error('Transaction cancelled: You rejected the transaction in MetaMask. Please try again and confirm the transaction to proceed.');
        } else if (txError.message && txError.message.includes('insufficient funds')) {
          throw new Error('Insufficient funds: You don\'t have enough MATIC tokens to complete this transaction. Please add some MATIC to your wallet.');
        } else if (txError.message && txError.message.includes('network')) {
          throw new Error('Network error: Please check your internet connection and try again.');
        }
        
        // Generic error with simplified message
        throw new Error('Transaction failed: Please try again. If the problem persists, check your MetaMask connection and wallet balance.');
      }

      // 5. Sign and store proof (MATCHING WORKING BACKEND LOGIC)
      // This matches backend/routes/uploadDocs.js lines 144-243
      setUploadStatus("Generating signature and proofs...");
      
      // Fetch issuer's private key from Supabase
      const { data: issuerDoc, error: issuerError } = await supabase
        .from('issuers')
        .select('privateKey, publicKey, name')
        .eq('issuerId', issuerId)
        .single();

      if (issuerError || !issuerDoc || !issuerDoc.privateKey) {
        throw new Error(`Issuer or private key not found: ${issuerError?.message || 'Unknown error'}`);
      }

      // Validate private key format
      if (!issuerDoc.privateKey.startsWith('0x') || issuerDoc.privateKey.length < 64) {
        throw new Error('Invalid private key format. Please generate a proper cryptographic key pair.');
      }

      // Sign Merkle root (MATCHING WORKING BACKEND: ethers.getBytes then signMessage)
      let signature: string;
      try {
        const wallet = new ethers.Wallet(issuerDoc.privateKey);
        let merkleRootBytes: Uint8Array;
        if (ethers.getBytes) {
          merkleRootBytes = ethers.getBytes(merkleRoot);
        } else {
          throw new Error('ethers.getBytes not available');
        }
        signature = await wallet.signMessage(merkleRootBytes);
        
        if (!signature || signature.length < 100) {
          throw new Error('Invalid signature generated');
        }
      } catch (signError: any) {
        throw new Error(`Failed to generate signature: ${signError.message}`);
      }

      // Generate Merkle proofs using the SAME tree we created earlier for root
      // The tree already has sortPairs: true, so just use it to generate proofs
      
      // Generate proofs for each leaf (matching backend line 212)
      const proofs = fileHashes.map((leaf) => {
        const leafBuffer = Buffer.from(leaf.slice(2), 'hex');
        return tree.getHexProof(leafBuffer);
      });

      if (!proofs || proofs.length === 0) {
        throw new Error('Failed to generate Merkle proofs');
      }

      // Create proof JSON matching MongoDB schema exactly
      const explorerUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;
      const issuedAt = new Date().toISOString();
      const proofJson = {
        proofs: [{
          merkleRoot: merkleRoot,
          leaves: fileHashes,
          files: selectedFiles.map(f => f.name),
          proofs: proofs, // Array of arrays - Merkle proofs for each leaf
          signature: signature,
          timestamp: issuedAt,
          fileLengths: preparedFiles.map(({ bytes }) => bytes.length)
        }],
        network: 'amoy',
        explorerUrl: explorerUrl,
        issuerPublicKey: issuerDoc.publicKey,
      };

      // Prepare proof payload for PDF append
      console.log('🧩 Preparing proof payload for PDF append...', {
        issuerId,
        batch: batchName,
        merkleRoot,
        fileCount: selectedFiles.length
      });
      setUploadStatus("Appending blockchain proof block to document(s)...");

      const proofRecordBase = {
        id: generateProofId(),
        issuer_id: issuerId,
        batch: batchName,
        merkle_root: merkleRoot,
        signature: signature,
        proof_json: proofJson,
        file_paths: selectedFiles.map(f => f.name),
        description: descriptionEl?.value?.trim() || null,
        expiry_date: expiryDateEl?.value || null,
        created_at: issuedAt
      };

      const canonicalProof = canonicalProofString(proofRecordBase)
      const proofDigest = ethers.keccak256(ethers.toUtf8Bytes(canonicalProof))
      let proofSignature: string
      if (issuerDoc.privateKey) {
        const proofWallet = new ethers.Wallet(issuerDoc.privateKey)
        proofSignature = await proofWallet.signMessage(ethers.getBytes(proofDigest))
      } else {
        throw new Error('Issuer private key not available for proof signing')
      }

      const proofRecord: ProofPayload = {
        ...proofRecordBase,
        proof_signature: proofSignature
      };
      console.log('🧾 Proof record prepared for append:', proofRecord);

      const issuedDocuments = await Promise.all(
        preparedFiles.map(async ({ file, bytes, kind }, index) => {
          console.log('📄 Processing file for proof append:', {
            index,
            name: file.name,
            size: file.size
          });
          const augmentedBytes =
            kind === 'docx'
              ? await appendProofToDocx(bytes, proofRecord)
              : appendProofBlock(bytes, proofRecord);
          if (kind !== 'docx') {
            const tailSnippet = debugDecoder.decode(augmentedBytes.slice(-200));
            console.log('✅ Proof block appended for file:', file.name, {
              originalSize: bytes.byteLength,
              augmentedSize: augmentedBytes.byteLength,
              tailSnippet
            });
          } else {
            console.log('✅ Proof embedded into DOCX package:', {
              originalSize: bytes.byteLength,
              augmentedSize: augmentedBytes.byteLength,
              proofPart: 'customXml/trustdoc-proof.json'
            });
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const docLabel =
            uploadMode === "single"
              ? baseName || `document-${index + 1}`
              : `${batchName}_${index + 1}_${baseName || `document-${index + 1}`}`;

          const sanitizedLabel = sanitizeForFileName(docLabel);
          const extensionMatch = file.name.match(/\.([^.]+)$/);
          const extension = extensionMatch ? extensionMatch[1] : "pdf";
          const outputName = `${sanitizedLabel}.${extension}`;

          return {
            name: outputName,
            bytes: augmentedBytes
          };
        })
      );

      // Deliver results to issuer & capture metadata
      const batchLabel = sanitizeForFileName(batchName || documentName || `batch-${Date.now()}`);

      const isSingleDocument = issuedDocuments.length === 1;

      setUploadStatus(isSingleDocument ? "Preparing issued document bundle..." : "Creating issued bundle...");
      const zip = new JSZip();
      issuedDocuments.forEach(doc => {
        console.log('📦 Adding file to ZIP bundle:', {
          name: doc.name,
          size: doc.bytes.byteLength
        });
        zip.file(doc.name, doc.bytes);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipName = `${sanitizeForFileName(issuerId)}_${batchLabel}_${Date.now()}.zip`;
      console.log('🎁 ZIP bundle ready:', {
        zipName,
        fileCount: issuedDocuments.length
      });
      downloadBlob(zipBlob, zipName);
      setUploadStatus(
        isSingleDocument
          ? "Issuance complete! ZIP downloaded with embedded proof."
          : "Batch issuance complete! ZIP downloaded with embedded proofs."
      );

      try {
        await supabase
          .from('issuer_documents')
          .insert({
            issuer_id: issuerId,
            batch_name: batchName,
            issue_mode: isSingleDocument ? 'single' : 'batch',
            merkle_root: merkleRoot,
            document_names: issuedDocuments.map(doc => doc.name),
            files_count: issuedDocuments.length,
            issued_at: issuedAt
          });
      } catch (metaError: any) {
        console.error('⚠️ Failed to store issuance metadata:', metaError);
      }

      // Optional: trigger callback for dashboards
      if (onUploadComplete) {
        onUploadComplete();
      }

      // Navigate back after short delay so issuer can see status
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
      // Clear form
      setSelectedFiles([]);
      setBatch("");
      setDocumentName("");

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed: ' + (error?.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Auth Check */}
        {!isLoggedIn || !issuerId ? (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800">⚠️ Authentication Required</h3>
            <p className="text-red-700">You need to login as an issuer to upload documents.</p>
            <div className="mt-3">
              <Button 
                onClick={() => navigate('/')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Go to Login/Register
              </Button>
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Issue New Document</h1>
          <p className="mt-1 text-gray-600">Create a new document anchored securely on the blockchain</p>
        </div>

        {/* Upload Form Section */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Document Details</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Issuance Mode:</span>
                <div className="flex items-center bg-gray-200 rounded-lg p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode("single");
                      // Clear files when switching to single mode
                      setSelectedFiles([]);
                      setBatch("");
                      setDocumentName("");
                      setShowAllFiles(false);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      uploadMode === "single"
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode("batch");
                      // Clear files when switching to batch mode
                      setSelectedFiles([]);
                      setBatch("");
                      setDocumentName("");
                      setShowAllFiles(false);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      uploadMode === "batch"
                        ? "bg-white shadow-sm text-gray-800"
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Batch
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <form>
            <div className="px-4 py-4 sm:p-5">
              {/* Top Row: Document Name and Expiry Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Document Name */}
                <div>
                  <Label htmlFor="documentName" className="block text-sm font-medium text-gray-700 mb-1">
                    {uploadMode === "single" ? "Document Name" : "Batch Name"}
                  </Label>
                  <div className="flex rounded-md shadow-sm">
                    <div className="relative flex items-stretch flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        id="documentName"
                        value={uploadMode === "single" ? documentName : batch}
                        onChange={(e) => {
                          if (uploadMode === "single") {
                            setDocumentName(e.target.value);
                          } else {
                            setBatch(e.target.value);
                          }
                        }}
                        className="pl-9 text-sm"
                        placeholder={uploadMode === "single" ? "Enter document name" : "Enter batch name"}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <Label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (Optional)
                  </Label>
                  <div className="flex rounded-md shadow-sm">
                    <div className="relative flex items-stretch flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="date"
                        id="expiryDate"
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Row */}
              <div className="mb-4">
                <Label htmlFor="documentDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </Label>
                <Textarea
                  id="documentDescription"
                  rows={2}
                  className="text-sm"
                  placeholder="Enter a description of this document"
                />
              </div>

              {/* File Upload */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  {uploadMode === "single" ? "Upload Document" : "Upload Documents"}
                </Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-500 hover:bg-gray-50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  {uploadMode === "single" ? (
                    <>
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          Drop a single document here <span className="text-gray-500">or click to browse</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX, TXT, JPG, PNG
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          Drop multiple documents here <span className="text-gray-500">or click to browse</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX, TXT, JPG, PNG
                        </p>
                      </div>
                    </>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    multiple={uploadMode === "batch"}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.json,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileInputChange}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">Selected files ({selectedFiles.length}):</p>
                      {selectedFiles.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFiles([]);
                            setShowAllFiles(false);
                          }}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {selectedFiles.length <= 10 || showAllFiles ? (
                        // Show all files if 10 or fewer, OR if showAllFiles is true
                        selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="font-medium text-gray-900 truncate max-w-48">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                              }}
                              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        // Show first 5 files + summary for many files
                        <>
                          {selectedFiles.slice(0, 5).map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="font-medium text-gray-900 truncate max-w-48">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                                }}
                                className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <div className="flex items-center justify-between">
                              <span>
                                <strong>+{selectedFiles.length - 5} more files</strong>
                                <br />
                                <span className="text-xs">
                                  Total size: {(selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllFiles(true)}
                                className="text-xs"
                              >
                                Show All
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Status */}
              {uploadStatus && (
                <Alert className={uploadStatus.includes('failed') || uploadStatus.includes('error') ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}>
                  <AlertDescription className={uploadStatus.includes('failed') || uploadStatus.includes('error') ? 'text-red-800' : 'text-blue-800'}>
                    {uploadStatus}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Form Actions */}
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex justify-center py-2 px-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpload}
                disabled={!issuerId || (uploadMode === "single" && !documentName.trim()) || (uploadMode === "batch" && !batch.trim()) || selectedFiles.length === 0 || (uploadMode === "batch" && selectedFiles.length < 2) || isLoading}
                className={`inline-flex justify-center py-2 px-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  !issuerId || (uploadMode === "single" && !documentName.trim()) || (uploadMode === "batch" && !batch.trim()) || selectedFiles.length === 0 || (uploadMode === "batch" && selectedFiles.length < 2) || isLoading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? "Uploading..." : uploadMode === "single" ? "Issue Document" : "Issue Documents"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
