import { useState, useEffect } from "react";
import { Shield, Key, Wallet, UserPlus, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { ethers } from "ethers";
import { CONTRACT_CONFIG } from "@/lib/blockchain/contract";

interface RegisterIssuerProps {
  onRegister?: (data: { id: string; name: string; email: string; address: string; type: string }) => void;
  onLogin?: (data: any) => void;
  defaultTab?: string;
}

export const RegisterIssuer = ({ onRegister, onLogin, defaultTab = "new" }: RegisterIssuerProps) => {
  const { signUp, signIn, loading, error, clearError } = useAuthContext();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Update activeTab when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  
  // Function to switch to login tab
  const switchToLogin = () => {
    setActiveTab("existing");
  };
  
  // New Issuer State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false); // Prevent double submission
  
  // Existing Issuer State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        setRegistrationMessage("Please install MetaMask to use this DApp");
        return;
      }
      
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        setRegistrationMessage("Wallet connected successfully!");
      }
    } catch (error) {
      setRegistrationMessage("Failed to connect wallet. Please try again.");
    }
  };

  const handleRegister = async () => {
    // CRITICAL FIX: Prevent double submission
    if (isRegistering) {
      console.warn('Registration already in progress, ignoring duplicate request');
      return;
    }

    if (!name.trim() || !email.trim() || !password.trim()) {
      setRegistrationMessage("Please fill in all fields");
      return;
    }
    
    if (!isConnected) {
      setRegistrationMessage("Please connect your wallet first");
      return;
    }

    setIsRegistering(true);
    setRegistrationMessage("Registering...");

    try {
      clearError();
      setRegistrationMessage("");

      // CRITICAL FIX: Check if email already exists FIRST, before doing anything else
      console.log('🔍 Checking if email already exists BEFORE registration:', email.trim());
      const { data: existingIssuer, error: checkError } = await supabase
        .from('issuers')
        .select('email, issuerId, name')
        .eq('email', email.trim())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        console.error('Error checking existing issuer:', checkError);
        throw new Error(`Failed to check existing issuer: ${checkError.message}`);
      }

      if (existingIssuer) {
        // Email already exists - STOP HERE before doing anything
        const errorMessage = 
          `❌ Email already registered!\n\n` +
          `The email "${email.trim()}" is already registered as an issuer.\n\n` +
          `Issuer ID: ${existingIssuer.issuerId || 'N/A'}\n` +
          `Name: ${existingIssuer.name || 'N/A'}\n\n` +
          `Please use the "Login" tab to access your existing account, or use a different email address.`;
        
        setRegistrationMessage(errorMessage);
        setErrorModalMessage(errorMessage);
        setShowErrorModal(true);
        
        // Auto-switch to login tab after 3 seconds to help user
        setTimeout(() => {
          setActiveTab('existing');
          setLoginEmail(email.trim()); // Pre-fill the email in login form
        }, 3000);
        
        throw new Error(errorMessage);
      }

      console.log('✅ Email is available, proceeding with registration...');
      
      // Generate issuerId and keys like working TrustDoc
      const issuerId = `ISSUER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate a new wallet for document signing (like working TrustDoc)
      const { ethers } = await import('ethers');
      const signingWallet = ethers.Wallet.createRandom();
      const privateKey = signingWallet.privateKey;
      const publicKey = signingWallet.publicKey;
      const address = signingWallet.address;

      // Check if user's wallet is registered as a worker (required for registration)
      const { getContractInstance } = await import('@/lib/blockchain/contract');
      const { contract } = getContractInstance();
      
      // Get user's MetaMask address
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask and connect your wallet.');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Check if user's address is a registered worker
      const isWorker = await contract.isWorker(userAddress);
      if (!isWorker) {
        const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        // Show professional error modal
        setErrorModalMessage(`You are not authorized to register as an issuer. The connected wallet address (${shortAddress}) is not an authorized wallet. Please use an authorized wallet or contact TrustDoc support for more information.`);
        setShowErrorModal(true);
        
        // Clear the connected wallet after showing error
        setIsConnected(false);
        setWalletAddress("");
        
        return; // Stop execution
      }
      
      // Register issuer on blockchain (like working TrustDoc)
      // This uses the contract owner's private key from environment variables
      
      // Check if owner's private key is configured
      const ownerPrivateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (!ownerPrivateKey) {
        throw new Error('System configuration error. Please contact TrustDoc support for assistance.');
      }
      
      // Verify the owner's private key corresponds to the contract owner
      // Reuse getContractInstance that was already imported above
      const { contract: ownerContract, wallet: ownerWallet, provider: ownerProvider } = getContractInstance(true);
      
      // Get the contract owner address
      let contractOwnerAddress: string;
      try {
        contractOwnerAddress = await ownerContract.owner();
        console.log('📋 Contract owner address (from blockchain):', contractOwnerAddress);
      } catch (error) {
        console.error('Error getting contract owner:', error);
        throw new Error('Failed to verify contract owner. Please check your configuration.');
      }
      
      // Verify the wallet address matches the contract owner
      const walletAddressFromKey = await ownerWallet.getAddress();
      console.log('🔑 Wallet address from private key:', walletAddressFromKey);
      console.log('📋 Contract owner address:', contractOwnerAddress);
      
      // Normalize addresses for comparison (lowercase)
      const walletAddressLower = walletAddressFromKey.toLowerCase();
      const contractOwnerLower = contractOwnerAddress.toLowerCase();
      
      if (walletAddressLower !== contractOwnerLower) {
        // Provide helpful error message with both addresses
        const errorMessage = 
          `❌ Private Key Mismatch!\n\n` +
          `The private key in your .env file corresponds to:\n` +
          `  ${walletAddressFromKey}\n\n` +
          `But the contract owner is:\n` +
          `  ${contractOwnerAddress}\n\n` +
          `You mentioned the owner should be:\n` +
          `  0x387328443646581612e6e83b32CEC5D391edD70E\n\n` +
          `Please verify:\n` +
          `1. Check the contract owner on PolygonScan: https://amoy.polygonscan.com/address/${CONTRACT_CONFIG.address}\n` +
          `2. Use the private key for the address that actually owns the contract\n` +
          `3. Update VITE_PRIVATE_KEY in your .env file with the correct owner private key`;
        
        throw new Error(errorMessage);
      }
      
      console.log('✅ Private key matches contract owner!');
      
      // The contract expects uint256 type for pubKey
      // Convert address to uint256 (BigInt) as required by the contract
      const formattedAddress = address.startsWith('0x') ? address : `0x${address}`;
      
      // Validate address format
      if (!ethers.isAddress(formattedAddress)) {
        throw new Error(`Invalid address format: ${formattedAddress}`);
      }
      
      // Convert address to uint256 (BigInt) as required by the contract
      const pubKeyAsUint256 = BigInt(formattedAddress);
      
      console.log('Registering issuer with:', {
        issuerId,
        pubKey: pubKeyAsUint256.toString(),
        pubKeyAddress: formattedAddress,
        name: name.trim(),
        from: walletAddressFromKey
      });
      
      // Get current gas price from network
      const feeData = await ownerProvider.getFeeData();
      console.log('Current fee data:', {
        gasPrice: feeData.gasPrice?.toString(),
        gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A',
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      });
      
      // For Polygon Amoy, use LEGACY gasPrice (more reliable than EIP-1559)
      // Use network's gasPrice with significant buffer to ensure transaction goes through
      const gasOptions: any = {};
      
      if (feeData.gasPrice) {
        // Use network's gasPrice with 100% buffer (double) for Polygon Amoy to ensure it goes through
        // This ensures the transaction is prioritized and confirms quickly
        const networkGasPrice = feeData.gasPrice;
        const bufferedGasPrice = networkGasPrice * 200n / 100n; // Double the gas price (100% buffer)
        
        // Ensure minimum of 60 gwei for Polygon Amoy
        const minGasPrice = ethers.parseUnits('60', 'gwei');
        gasOptions.gasPrice = bufferedGasPrice > minGasPrice ? bufferedGasPrice : minGasPrice;
        
        // Use legacy gasPrice instead of EIP-1559 for better compatibility with Polygon
        console.log('Using LEGACY gas pricing (more reliable for Polygon):', {
          networkGasPriceGwei: ethers.formatUnits(networkGasPrice, 'gwei'),
          bufferedGasPrice: gasOptions.gasPrice.toString(),
          bufferedGasPriceGwei: ethers.formatUnits(gasOptions.gasPrice, 'gwei')
        });
      } else {
        // Fallback: use very high gas price if network data unavailable
        gasOptions.gasPrice = ethers.parseUnits('100', 'gwei'); // 100 gwei fallback
        console.log('Using fallback gas pricing: 100 gwei');
      }
      
      // Estimate gas limit for the transaction
      try {
        const estimatedGas = await ownerContract.registerIssuer.estimateGas(
          issuerId, 
          pubKeyAsUint256, 
          name.trim()
        );
        gasOptions.gasLimit = estimatedGas * 120n / 100n; // Add 20% buffer
        console.log('Gas limit estimated:', {
          estimated: estimatedGas.toString(),
          withBuffer: gasOptions.gasLimit.toString()
        });
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        gasOptions.gasLimit = 200000n; // Default gas limit
      }
      
      // Get the correct nonce (pending count) to allow transaction even with pending transactions
      // This ensures the transaction is queued properly behind any pending transactions
      const pendingNonce = await ownerProvider.getTransactionCount(await ownerWallet.getAddress(), 'pending');
      const latestNonce = await ownerProvider.getTransactionCount(await ownerWallet.getAddress(), 'latest');
      
      console.log('Transaction nonce info:', {
        pending: pendingNonce,
        latest: latestNonce,
        hasPending: pendingNonce > latestNonce,
        willUseNonce: pendingNonce
      });
      
      // Use pending nonce so transaction can proceed even with pending transactions
      // This queues the transaction properly behind any pending ones
      gasOptions.nonce = pendingNonce;
      
      // Call registerIssuer with uint256 type (as per contract) and gas options
      console.log('Submitting transaction with gas options:', {
        ...gasOptions,
        nonce: gasOptions.nonce,
        gasPriceGwei: ethers.formatUnits(gasOptions.gasPrice, 'gwei')
      });
      
      // Submit transaction - use sendTransaction for more control
      console.log('Preparing transaction call...');
      
      // Build the transaction data
      const txData = ownerContract.interface.encodeFunctionData('registerIssuer', [
        issuerId,
        pubKeyAsUint256,
        name.trim()
      ]);
      
      console.log('Transaction data prepared. Submitting...');
      
      // Submit transaction with explicit gas options
      const tx = await ownerWallet.sendTransaction({
        to: CONTRACT_CONFIG.address,
        data: txData,
        gasPrice: gasOptions.gasPrice,
        gasLimit: gasOptions.gasLimit || 200000n,
        nonce: gasOptions.nonce
      });
      
      console.log('✅ Transaction submitted successfully!');
      console.log('Transaction hash:', tx.hash);
      console.log('Transaction URL:', `https://amoy.polygonscan.com/tx/${tx.hash}`);
      console.log('Nonce:', tx.nonce);
      console.log('Gas price:', ethers.formatUnits(gasOptions.gasPrice, 'gwei'), 'gwei');
      
      // Verify transaction was broadcast to network immediately
      console.log('Verifying transaction was broadcast...');
      try {
        const broadcastTx = await ownerProvider.getTransaction(tx.hash);
        if (broadcastTx) {
          console.log('✅ Transaction broadcast confirmed!', {
            hash: broadcastTx.hash,
            nonce: broadcastTx.nonce,
            gasPrice: broadcastTx.gasPrice?.toString(),
            from: broadcastTx.from
          });
        }
      } catch (error) {
        console.warn('Transaction not found in mempool yet, may take a moment...');
      }
      
      // Wait for transaction confirmation with polling
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60; // Check for 60 seconds (1 minute)
      
      console.log('Waiting for transaction confirmation...');
      console.log('You can monitor at:', `https://amoy.polygonscan.com/tx/${tx.hash}`);
      
      while (attempts < maxAttempts && !receipt) {
        try {
          receipt = await ownerProvider.getTransactionReceipt(tx.hash);
          if (receipt) {
            console.log('✅ Transaction confirmed!', {
              hash: receipt.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed?.toString(),
              status: receipt.status === 1 ? 'Success' : 'Failed'
            });
            
            if (receipt.status !== 1) {
              throw new Error('Transaction failed on blockchain');
            }
            break;
          }
        } catch (error) {
          // Transaction not confirmed yet, continue waiting
        }
        
        // Wait 1 second before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        if (attempts % 10 === 0) {
          console.log(`⏳ Still waiting for confirmation... (${attempts}/${maxAttempts} seconds)`);
        }
      }
      
      if (!receipt) {
        // Transaction submitted but not confirmed within timeout
        console.warn('⚠️ Transaction submitted but not confirmed within 60 seconds.');
        console.log('Transaction hash:', tx.hash);
        console.log('This is normal - transactions can take 1-5 minutes to confirm.');
        console.log('Check status at:', `https://amoy.polygonscan.com/tx/${tx.hash}`);
        
        // Continue anyway - transaction is submitted and will confirm
        setRegistrationMessage(
          `Transaction submitted successfully!\n\n` +
          `Hash: ${tx.hash}\n\n` +
          `The transaction is being processed on the blockchain. ` +
          `It may take 1-5 minutes to confirm.\n\n` +
          `Check status: https://amoy.polygonscan.com/tx/${tx.hash}\n\n` +
          `Registration will complete once the transaction confirms.`
        );
      }

      // CRITICAL FIX: Create user in Supabase Auth FIRST, then create issuer record
      console.log('🔐 Creating user in Supabase Auth...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            user_type: 'issuer',
            issuer_id: issuerId,
          }
        }
      });

      if (authError) {
        console.error('Supabase Auth signup error:', authError);
        // If user already exists in Auth, that's okay - continue with issuer creation
        if (authError.message && !authError.message.includes('already registered')) {
          throw new Error(`Failed to create user account: ${authError.message}`);
        }
        console.warn('User may already exist in Supabase Auth, continuing with issuer creation...');
      } else {
        console.log('✅ User created in Supabase Auth:', authData.user?.id);
      }

      // Create issuer in Supabase database
      // NOTE: Email check was already done at the beginning, so we can safely insert now
      // NOTE: Column names are camelCase (issuerId, privateKey, publicKey, metaMaskAddress) not snake_case
      const { data: newIssuer, error: issuerError } = await supabase
        .from('issuers')
        .insert({
          email: email.trim(),
          password: password, // In production, this should be hashed
          address: address, // Store the new signing address
          issuerId: issuerId,  // Use camelCase column name
          name: name.trim(),
          publicKey: publicKey,  // Use camelCase column name - REAL cryptographic key
          privateKey: privateKey,  // Use camelCase column name - REAL cryptographic key
          metaMaskAddress: userAddress // Use camelCase column name - Store the user's MetaMask address
        })
        .select()
        .single();

      if (issuerError) {
        // Handle specific error codes
        if (issuerError.code === '23505' || issuerError.message.includes('duplicate key') || issuerError.message.includes('unique constraint')) {
          const errorMessage = 
            `❌ Registration failed: Email "${email.trim()}" is already registered.\n\n` +
            `This email is already associated with an existing issuer account.\n\n` +
            `Please use the "Login" tab to access your account, or use a different email address.`;
          
          setRegistrationMessage(errorMessage);
          setErrorModalMessage(errorMessage);
          setShowErrorModal(true);
          throw new Error(errorMessage);
        }
        
        // Other errors
        console.error('Supabase insert error:', issuerError);
        throw new Error(`Failed to create issuer: ${issuerError.message}`);
      }

      console.log('✅ Issuer created successfully in database:', newIssuer?.issuerId);

      setRegistrationMessage("Registration successful! You can now login.");
      
      if (onRegister) {
        onRegister({
          id: issuerId,  // Use 'id' field like working TrustDoc expects
          name: name.trim(),
          email: email.trim(),
          address: walletAddress,
          userType: 'issuer'  // Use 'userType' field like working TrustDoc expects
        });
      }
    } catch (error) {
      setRegistrationMessage(error instanceof Error ? error.message : "Registration failed");
    } finally {
      // CRITICAL FIX: Always reset the registration flag
      setIsRegistering(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginMessage("Please fill in all fields");
      return;
    }

    setLoginMessage("Logging in...");

    try {
      clearError();
      setLoginMessage("");
      
      // Use Supabase Auth for login
      const result = await signIn({
        email: loginEmail.trim(),
        password: loginPassword.trim()
      });

      setLoginMessage("Login successful!");
      
      if (onLogin) {
        onLogin(result);
      }
    } catch (error) {
      setLoginMessage(error instanceof Error ? error.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {defaultTab === "existing" ? "Login to TrustDoc" : "Issuer Portal"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {defaultTab === "existing" 
              ? "Access your existing issuer account" 
              : "Create your issuer account or login to start using TrustDoc"
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side - Info Panel */}
          <div className="lg:col-span-5">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 h-full">
              <CardContent className="p-8 flex flex-col justify-center">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-10 h-10 text-primary-foreground" />
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-primary">
                      {activeTab === "new" ? "Issuer Registration" : "Issuer Login"}
                    </h2>
                    <p className="text-muted-foreground">
                      {activeTab === "new" 
                        ? "Create your issuer account to start anchoring documents"
                        : "Access your existing issuer account securely"
                      }
                    </p>
                  </div>

                  <div className="space-y-4 text-sm text-muted-foreground text-left">
                    {activeTab === "new" ? (
                      // Registration content - Business benefits
                      <>
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Secure Document Issuance</h4>
                            <p>Issue documents with enterprise-grade security and tamper-proof verification for your organization.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Global Verification</h4>
                            <p>Your documents can be verified anywhere in the world with instant authenticity confirmation.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Wallet className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Cost-Effective Solution</h4>
                            <p>Reduce document fraud and verification costs with blockchain-powered authentication.</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Login content - User benefits
                      <>
                        <div className="flex items-start space-x-3">
                          <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Secure Dashboard Access</h4>
                            <p>Access your issuer dashboard with secure authentication and role-based permissions.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Document Analytics</h4>
                            <p>View your document issuance statistics, verification history, and performance metrics.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Wallet className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-foreground mb-1">Account Management</h4>
                            <p>Manage your issuer profile, update settings, and maintain your document portfolio.</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Forms */}
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="new" className="flex items-center space-x-2">
                      <UserPlus className="w-4 h-4" />
                      <span>New Issuer</span>
                    </TabsTrigger>
                    <TabsTrigger value="existing" className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>Existing Issuer</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="relative">
                {isRegistering && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-3 bg-background/90 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      Finalizing blockchain registration...
                    </p>
                  </div>
                )}

                <div className={isRegistering ? "pointer-events-none opacity-40" : ""}>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {/* New Issuer Registration */}
                  <TabsContent value="new" className="space-y-6 tab-content">
                    <div className="space-y-4">
                      <CardTitle>Create Issuer Account</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Register as a document issuer to start using TrustDoc
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2 form-field">
                        <Label htmlFor="issuer-name">Issuer Name</Label>
                        <Input
                          id="issuer-name"
                          placeholder="Organization or issuer name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={false} // No loading state for now
                        />
                      </div>

                      <div className="space-y-2 form-field">
                        <Label htmlFor="issuer-email">Email</Label>
                        <Input
                          id="issuer-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={false} // No loading state for now
                        />
                      </div>

                      <div className="space-y-2 form-field">
                        <Label htmlFor="issuer-password">Password</Label>
                        <Input
                          id="issuer-password"
                          type="password"
                          placeholder="Choose a secure password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={false} // No loading state for now
                        />
                      </div>


                      {/* Wallet Connection */}
                      <div className="space-y-4">
                        {!isConnected ? (
                          <Button
                            onClick={connectWallet}
                            variant="outline"
                            className="w-full"
                            disabled={false} // No loading state for now
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            {isConnected ? "Wallet Connected" : "Connect Wallet"}
                          </Button>
                        ) : (
                          <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              <strong>Wallet Connected</strong><br />
                              <span className="font-mono text-xs">{walletAddress}</span>
                            </AlertDescription>
                          </Alert>
                        )}

                        <Button
                          onClick={handleRegister}
                          disabled={isRegistering || !isConnected || loading}
                          className="w-full"
                          size="lg"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          {isRegistering || loading ? "Registering..." : "Register as Issuer"}
                        </Button>
                      </div>

                      {/* Error Messages */}
                      {false && ( // No wallet error state for now
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription className="text-red-800">
                            {false}
                          </AlertDescription>
                        </Alert>
                      )}

                      {false && ( // No auth error state for now
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription className="text-red-800">
                            {false}
                          </AlertDescription>
                        </Alert>
                      )}

                      {registrationMessage && (
                        <Alert className={registrationMessage.includes("successful") ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}>
                          <AlertDescription className={registrationMessage.includes("successful") ? "text-green-800" : "text-blue-800"}>
                            {registrationMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {error && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription className="text-red-800">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Login Link */}
                      <div className="text-center pt-4">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?{" "}
                          <button
                            type="button"
                            onClick={switchToLogin}
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Login here
                          </button>
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Existing Issuer Login */}
                  <TabsContent value="existing" className="space-y-6 tab-content">
                    <div className="space-y-4">
                      <CardTitle>Login to Your Account</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Access your existing issuer account
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2 form-field">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          disabled={false} // No loading state for now
                        />
                      </div>

                      <div className="space-y-2 form-field">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          disabled={false} // No loading state for now
                        />
                      </div>

                      <Button
                        onClick={handleLogin}
                        className="w-full"
                        size="lg"
                        disabled={loading}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {loading ? "Logging in..." : "Login"}
                      </Button>

                      {/* Error Messages */}
                      {false && ( // No auth error state for now
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription className="text-red-800">
                            {false}
                          </AlertDescription>
                        </Alert>
                      )}

                      {loginMessage && (
                        <Alert className={loginMessage.includes("successful") ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}>
                          <AlertDescription className={loginMessage.includes("successful") ? "text-green-800" : "text-blue-800"}>
                            {loginMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {error && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertDescription className="text-red-800">
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Register Link */}
                      <div className="text-center pt-4">
                        <p className="text-sm text-muted-foreground">
                          Don't have an account?{" "}
                          <button
                            type="button"
                            onClick={() => setActiveTab("new")}
                            className="text-primary hover:text-primary/80 font-medium"
                          >
                            Register here
                          </button>
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Professional Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Authorization Required</span>
            </DialogTitle>
            <DialogDescription className="text-left mt-4">
              {errorModalMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => setShowErrorModal(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
