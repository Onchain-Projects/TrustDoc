import { useState, useEffect } from "react";
import { Shield, Key, Wallet, UserPlus, CheckCircle, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
    if (!name.trim() || !email.trim() || !password.trim()) {
      setRegistrationMessage("Please fill in all fields");
      return;
    }
    
    if (!isConnected) {
      setRegistrationMessage("Please connect your wallet first");
      return;
    }

    setRegistrationMessage("Registering...");

    try {
      clearError();
      setRegistrationMessage("");
      
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
      
      const { contract: ownerContract } = getContractInstance(true);
      const tx = await ownerContract.registerIssuer(issuerId, address, name.trim());
      await tx.wait();

      // Create issuer in Supabase database
      // NOTE: Column names are camelCase (issuerId, privateKey, publicKey, metaMaskAddress) not snake_case
      const { error: issuerError } = await supabase
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
        });

      if (issuerError) {
        throw new Error(issuerError.message);
      }

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

              <CardContent>
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
                          disabled={!isConnected || loading}
                          className="w-full"
                          size="lg"
                        >
                          <Key className="w-4 h-4 mr-2" />
                          {loading ? "Registering..." : "Register as Issuer"}
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
