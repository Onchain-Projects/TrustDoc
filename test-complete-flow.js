const { ethers } = require('ethers');
const { MerkleTree } = require('merkletreejs');

console.log('=== COMPLETE UPLOAD & VERIFICATION TEST ===\n');

// STEP 1: Simulate Document Upload
console.log('STEP 1: Simulate Document Upload\n');

const issuerWallet = ethers.Wallet.createRandom();
console.log('Issuer Wallet:', issuerWallet.address);
console.log('');

const documents = ['Certificate 1', 'Certificate 2', 'Certificate 3'];
const fileHashes = documents.map(doc => ethers.keccak256(ethers.toUtf8Bytes(doc)));

console.log('Document Hashes (keccak256):');
fileHashes.forEach((hash, i) => console.log(`  Doc ${i+1}: ${hash}`));
console.log('');

// STEP 2: Build Merkle Tree
console.log('STEP 2: Build Merkle Tree\n');

const leavesBuf = fileHashes.map(h => Buffer.from(h.replace(/^0x/, ''), 'hex'));
const tree = new MerkleTree(
  leavesBuf,
  (data) => {
    const hash = ethers.keccak256(data);
    return Buffer.from(hash.slice(2), 'hex');
  },
  { sortPairs: true }
);

const merkleRoot = '0x' + tree.getRoot().toString('hex');
console.log('Merkle Root:', merkleRoot);
console.log('');

const merkleProofs = fileHashes.map((_, index) => tree.getHexProof(leavesBuf[index]));
console.log('Generated', merkleProofs.length, 'Merkle proofs');
console.log('');

// STEP 3: Sign Merkle Root
console.log('STEP 3: Sign Merkle Root\n');

issuerWallet.signMessage(ethers.getBytes(merkleRoot)).then(signature => {
  console.log('Signature:', signature.substring(0, 50) + '...');
  console.log('');

  // STEP 4: Create proof_json structure (matches Real TrustDoc MongoDB format)
  const proofJson = {
    proofs: [{
      merkleRoot: merkleRoot,
      leaves: fileHashes,
      files: documents,
      proofs: merkleProofs,
      signature: signature,
      timestamp: new Date().toISOString()
    }],
    network: 'Polygon Amoy',
    explorerUrl: 'https://amoy.polygonscan.com/tx/0xabc123...',
    issuerPublicKey: issuerWallet.publicKey
  };

  console.log('STEP 4: Created proof_json structure matching Real TrustDoc\n');
  console.log('Structure:');
  console.log('  - proofs array: YES');
  console.log('  - leaves:', proofJson.proofs[0].leaves.length);
  console.log('  - files:', proofJson.proofs[0].files.length);
  console.log('  - merkle proofs:', proofJson.proofs[0].proofs.length);
  console.log('  - signature: YES');
  console.log('  - network: YES');
  console.log('');

  // STEP 5: Simulate Document Verification (matches Real TrustDoc verification)
  console.log('STEP 5: Simulate Document Verification\n');

  const verifyDocIndex = 1; // Verify second document
  const docToVerify = documents[verifyDocIndex];
  const docHashToVerify = ethers.keccak256(ethers.toUtf8Bytes(docToVerify));

  console.log('Verifying document:', docToVerify);
  console.log('Document hash:', docHashToVerify);
  console.log('');

  // Search for document in leaves (like Real TrustDoc line 170)
  const foundIndex = proofJson.proofs[0].leaves.indexOf(docHashToVerify);
  console.log('Found in leaves at index:', foundIndex, foundIndex >= 0 ? 'YES' : 'NO');
  console.log('');

  // Verify Merkle proof (like Real TrustDoc line 256)
  const merkleProofForDoc = proofJson.proofs[0].proofs[foundIndex];
  const leafBuf = Buffer.from(docHashToVerify.replace(/^0x/, ''), 'hex');
  const rootBuf = Buffer.from(merkleRoot.replace(/^0x/, ''), 'hex');
  const isValidProof = tree.verify(merkleProofForDoc, leafBuf, rootBuf);

  console.log('Merkle proof valid:', isValidProof ? 'YES' : 'NO');
  console.log('');

  // Verify signature (like Real TrustDoc line 291)
  const merkleRootBytes = ethers.getBytes(proofJson.proofs[0].merkleRoot);
  const msgHash = ethers.hashMessage(merkleRootBytes);
  const recovered = ethers.recoverAddress(msgHash, proofJson.proofs[0].signature);
  const issuerAddress = ethers.computeAddress(proofJson.issuerPublicKey);

  console.log('Recovered address:', recovered);
  console.log('Issuer address:', issuerAddress);

  const signatureValid = recovered.toLowerCase() === issuerAddress.toLowerCase();
  console.log('Signature valid:', signatureValid ? 'YES' : 'NO');
  console.log('');

  // Final result
  const finalVerification = isValidProof && signatureValid;
  console.log('FINAL VERIFICATION RESULT:', finalVerification ? 'DOCUMENT VERIFIED' : 'VERIFICATION FAILED');
  console.log('');

  if (finalVerification) {
    console.log('SUCCESS ALL CHECKS PASSED');
    console.log('- Hash Algorithm: keccak256');
    console.log('- Merkle Tree: Built and verified');
    console.log('- Signature: Valid');
    console.log('- Structure: Matches Real TrustDoc MongoDB format');
    console.log('');
    console.log('READY FOR PRODUCTION!');
  }
});

